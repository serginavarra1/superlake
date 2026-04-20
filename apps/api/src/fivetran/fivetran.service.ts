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
import { FivetranClient } from './fivetran.client';
import { GcpService } from '../gcp/gcp.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

type FivetranEvent = {
  event: string;
  data?: Record<string, unknown>;
  connector_id?: string;
  created?: string;
};

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
    const org = await this.requireOrg(clerkOrgId);
    return this.prisma.fivetranConnection.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createConnection(
    clerkOrgId: string,
    clerkUserId: string,
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

    const row = await this.prisma.fivetranConnection.create({
      data: {
        organizationId: org.id,
        fivetranConnectorId: connector.id,
        service: dto.service,
        schemaName: dto.schemaName,
        syncFrequency,
        setupState: connector.status?.setup_state ?? 'incomplete',
        syncState: connector.status?.sync_state ?? 'paused',
        createdByClerkUserId: clerkUserId,
      },
    });

    return { connectionId: row.id, connectCardUrl };
  }

  async finalizeConnection(clerkOrgId: string, connectionId: string) {
    const conn = await this.requireConnection(clerkOrgId, connectionId);
    const connector = await this.fivetran.getConnector(conn.fivetranConnectorId);

    if (connector.status?.setup_state !== 'connected') {
      return this.prisma.fivetranConnection.update({
        where: { id: conn.id },
        data: {
          setupState: connector.status?.setup_state ?? conn.setupState,
          syncState: connector.status?.sync_state ?? conn.syncState,
        },
      });
    }

    await this.fivetran.modifyConnector(conn.fivetranConnectorId, {
      paused: false,
    });
    await this.fivetran.syncNow(conn.fivetranConnectorId).catch((err) => {
      this.logger.warn(
        `syncNow failed for ${conn.fivetranConnectorId}: ${err instanceof Error ? err.message : err}`,
      );
    });

    return this.prisma.fivetranConnection.update({
      where: { id: conn.id },
      data: {
        setupState: 'connected',
        syncState: 'scheduling',
      },
    });
  }

  async deleteConnection(clerkOrgId: string, connectionId: string) {
    const conn = await this.requireConnection(clerkOrgId, connectionId);
    await this.fivetran.deleteConnector(conn.fivetranConnectorId).catch((err) => {
      this.logger.warn(
        `deleteConnector failed for ${conn.fivetranConnectorId}: ${err instanceof Error ? err.message : err}`,
      );
    });
    await this.prisma.fivetranConnection.delete({ where: { id: conn.id } });
  }

  async triggerSync(clerkOrgId: string, connectionId: string) {
    const conn = await this.requireConnection(clerkOrgId, connectionId);
    await this.fivetran.syncNow(conn.fivetranConnectorId);
    return { ok: true };
  }

  async handleWebhook(event: FivetranEvent): Promise<void> {
    const connectorId =
      event.connector_id ||
      (event.data?.connector_id as string | undefined) ||
      (event.data?.id as string | undefined);
    if (!connectorId) {
      this.logger.warn(`Fivetran webhook missing connector_id: ${event.event}`);
      return;
    }

    const conn = await this.prisma.fivetranConnection.findUnique({
      where: { fivetranConnectorId: connectorId },
    });
    if (!conn) {
      this.logger.warn(
        `Fivetran webhook for unknown connector ${connectorId}`,
      );
      return;
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    const status = String(event.data?.status ?? '').toUpperCase();
    const reason = String(
      event.data?.reason ?? event.data?.message ?? 'unknown',
    );

    switch (event.event) {
      case 'connection_successful':
        data.setupState = 'connected';
        break;
      case 'connection_failure':
        data.setupState = 'broken';
        data.lastErrorAt = now;
        data.lastErrorMessage = reason;
        break;
      case 'sync_start':
        data.syncState = 'syncing';
        break;
      case 'sync_end':
        if (status === 'SUCCESSFUL' || status === 'SUCCESS') {
          data.syncState = 'scheduled';
          data.lastSyncAt = now;
        } else {
          data.syncState = 'broken';
          data.lastErrorAt = now;
          data.lastErrorMessage = reason;
        }
        break;
      case 'pause_connector':
        data.syncState = 'paused';
        break;
      case 'resume_connector':
        data.syncState = 'scheduled';
        break;
      case 'delete_connector':
        await this.prisma.fivetranConnection
          .delete({ where: { id: conn.id } })
          .catch(() => undefined);
        return;
      case 'create_connector':
      case 'edit_connector':
      case 'force_update_connector':
      case 'resync_connector':
      case 'resync_table':
      case 'transformation_start':
      case 'transformation_succeeded':
      case 'transformation_failed':
        this.logger.debug(`Ignoring Fivetran event ${event.event}`);
        return;
      default:
        this.logger.debug(`Ignoring Fivetran event ${event.event}`);
        return;
    }

    await this.prisma.fivetranConnection.update({
      where: { id: conn.id },
      data,
    });
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

  private async requireConnection(clerkOrgId: string, connectionId: string) {
    const org = await this.requireOrg(clerkOrgId);
    const conn = await this.prisma.fivetranConnection.findUnique({
      where: { id: connectionId },
    });
    if (!conn || conn.organizationId !== org.id) {
      throw new NotFoundException('Connection not found');
    }
    return conn;
  }

}