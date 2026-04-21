import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FivetranProvisionStatus,
  GcpStatus,
  Organization,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FivetranClient,
  FivetranConnectorResponse,
} from './fivetran.client';
import { GcpService } from '../gcp/gcp.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

@Injectable()
export class FivetranService {
  private readonly logger = new Logger(FivetranService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly fivetran: FivetranClient,
    private readonly gcpService: GcpService,
  ) {}

  async provisionForOrganization(clerkOrgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.gcpProjectId) {
      throw new BadRequestException(
        'Organization has no GCP project — provision GCP first',
      );
    }
    if (org.fivetranStatus === FivetranProvisionStatus.active && org.fivetranGroupId) {
      return;
    }

    try {
      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          fivetranStatus: FivetranProvisionStatus.provisioning,
          fivetranError: null,
        },
      });

      const groupName = `org_${org.id}`.slice(0, 38);
      const group = await this.fivetran.createGroup(groupName);

      const saEmail = await this.fivetran.getGroupServiceAccount(group.id);
      await this.gcpService.grantFivetranRoles(org.gcpProjectId, saEmail);

      const destination = await this.fivetran.createBigQueryDestination({
        groupId: group.id,
        projectId: org.gcpProjectId,
        dataSetLocation: 'EU',
        bucket: `${org.gcpProjectId}-staging`,
      });


      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          fivetranGroupId: group.id,
          fivetranDestinationId: destination.id,
          fivetranStatus: FivetranProvisionStatus.active,
          fivetranError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fivetran provisioning failed for ${clerkOrgId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          fivetranStatus: FivetranProvisionStatus.failed,
          fivetranError: message,
        },
      });
    }
  }

  async deprovisionForOrganization(clerkOrgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (!org?.fivetranGroupId) return;

    try {
      await this.fivetran.deleteGroup(org.fivetranGroupId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Fivetran group delete failed for ${clerkOrgId}: ${message}`,
      );
    }

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        fivetranGroupId: null,
        fivetranDestinationId: null,
        fivetranStatus: FivetranProvisionStatus.pending,
      },
    });
  }

  async listServices(args: { limit: number; cursor?: string }) {
    return this.fivetran.listConnectorMetadata(args);
  }

  async listConnections(clerkOrgId: string) {
    const org = await this.requireProvisionedOrg(clerkOrgId);
    const items: FivetranConnectorResponse[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.fivetran.listConnections({
        groupId: org.fivetranGroupId!,
        limit: 1000,
        cursor,
      });
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return items.map((item) => this.toConnectionDto(item));
  }

  async createConnection(
    clerkOrgId: string,
    _clerkUserId: string,
    dto: CreateConnectionDto,
  ) {
    const org = await this.requireProvisionedOrg(clerkOrgId);
    const syncFrequency = dto.syncFrequency ?? 360;
    const redirectUri = this.configService.get<string>(
      'FIVETRAN_CONNECT_CARD_REDIRECT_URL',
    )!;

    const connector = await this.fivetran.createConnector({
      groupId: org.fivetranGroupId!,
      service: dto.service,
      schema: dto.schemaName,
      syncFrequency,
      redirectUri,
    });

    const connectCardUrl = connector.connect_card?.uri;
    if (!connectCardUrl) {
      await this.fivetran.deleteConnector(connector.id).catch(() => undefined);
      throw new InternalServerErrorException(
        'Fivetran did not return a connect_card URI',
      );
    }

    return { connectionId: connector.id, connectCardUrl };
  }

  async finalizeConnection(clerkOrgId: string, connectorId: string) {
    const connector = await this.requireOwnedConnector(clerkOrgId, connectorId);

    if (connector.status?.setup_state !== 'connected') {
      return this.toConnectionDto(connector);
    }

    await this.fivetran.modifyConnector(connectorId, { paused: false });
    await this.fivetran.syncNow(connectorId).catch((err) => {
      this.logger.warn(
        `syncNow failed for ${connectorId}: ${err instanceof Error ? err.message : err}`,
      );
    });

    const refreshed = await this.fivetran.getConnector(connectorId);
    return this.toConnectionDto(refreshed);
  }

  async deleteConnection(clerkOrgId: string, connectorId: string) {
    await this.requireOwnedConnector(clerkOrgId, connectorId);
    await this.fivetran.deleteConnector(connectorId).catch((err) => {
      this.logger.warn(
        `deleteConnector failed for ${connectorId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  async triggerSync(clerkOrgId: string, connectorId: string) {
    await this.requireOwnedConnector(clerkOrgId, connectorId);
    await this.fivetran.syncNow(connectorId);
    return { ok: true };
  }

  private toConnectionDto(item: FivetranConnectorResponse) {
    return {
      id: item.id,
      service: item.service,
      schemaName: item.schema,
      syncFrequency: item.sync_frequency,
      setupState: item.status?.setup_state ?? 'incomplete',
      syncState: item.status?.sync_state ?? 'paused',
      lastSyncAt: item.succeeded_at ?? null,
      lastErrorAt: item.failed_at ?? null,
      createdAt: item.created_at ?? null,
      connectCardUrl: item.connect_card?.uri ?? null,
    };
  }

  private async requireOrg(clerkOrgId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private async requireProvisionedOrg(
    clerkOrgId: string,
  ): Promise<Organization> {
    const org = await this.requireOrg(clerkOrgId);
    if (org.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${org.gcpStatus})`,
      );
    }
    if (
      org.fivetranStatus !== FivetranProvisionStatus.active ||
      !org.fivetranGroupId
    ) {
      throw new ConflictException(
        `Organization Fivetran is not provisioned (status: ${org.fivetranStatus})`,
      );
    }
    return org;
  }

  private async requireOwnedConnector(
    clerkOrgId: string,
    connectorId: string,
  ): Promise<FivetranConnectorResponse> {
    const org = await this.requireProvisionedOrg(clerkOrgId);
    let connector: FivetranConnectorResponse;
    try {
      connector = await this.fivetran.getConnector(connectorId);
    } catch {
      throw new NotFoundException('Connection not found');
    }
    if (connector.group_id !== org.fivetranGroupId) {
      throw new NotFoundException('Connection not found');
    }
    return connector;
  }
}
