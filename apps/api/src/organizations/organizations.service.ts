import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcpService } from '../gcp/gcp.service';
import { GcpStatus } from '@prisma/client';
import { FivetranService } from '../fivetran/fivetran.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private gcpService: GcpService,
    private fivetranService: FivetranService,
  ) {}

  async provisionOrganization(
    clerkOrgId: string,
    orgName: string,
  ): Promise<void> {
    try {
      // Idempotent: check if organization already exists
      const existing = await this.prisma.organization.findUnique({
        where: { clerkOrgId },
      });

      if (existing) {
        if (existing.gcpStatus === GcpStatus.active) {
          await this.fivetranService.provisionForOrganization(clerkOrgId);
          return;
        }

        // If it exists but failed, retry GCP creation
        if (
          existing.gcpStatus === GcpStatus.failed ||
          existing.gcpStatus === GcpStatus.pending
        ) {
          this.logger.log(
            `Organization ${clerkOrgId} exists with status ${existing.gcpStatus}, retrying GCP provisioning`,
          );
          await this.gcpService.createProject(clerkOrgId, orgName);
          await this.fivetranService.provisionForOrganization(clerkOrgId);
          return;
        }

        // For any other state (creating), skip to avoid double processing
        return;
      }

      await this.prisma.organization.create({
        data: {
          clerkOrgId,
          gcpStatus: GcpStatus.pending,
        },
      });

      await this.gcpService.createProject(clerkOrgId, orgName);
      await this.fivetranService.provisionForOrganization(clerkOrgId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to provision organization: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async deprovisionOrganization(clerkOrgId: string): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { clerkOrgId },
      });

      if (!organization) {
        return;
      }

      // Tear down Fivetran resources before deleting GCP project
      await this.fivetranService.deprovisionForOrganization(clerkOrgId);

      // Delete the GCP project
      await this.gcpService.deleteProject(clerkOrgId);

      // Delete the organization record from the database
      // Use deleteMany to avoid throwing if record was already removed
      await this.prisma.organization.deleteMany({
        where: { clerkOrgId },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to deprovision organization: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async getByClerkOrgId(clerkOrgId: string) {
    return this.prisma.organization.findUnique({
      where: { clerkOrgId },
    });
  }
}