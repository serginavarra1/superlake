import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcpService } from '../gcp/gcp.service';
import { GcpStatus } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private gcpService: GcpService,
  ) {}

  async provisionOrganization(
    clerkOrgId: string,
    orgName: string,
  ): Promise<void> {
    try {
      this.logger.log(`Provisioning organization: ${clerkOrgId}`);

      // Idempotent: check if organization already exists
      const existing = await this.prisma.organization.findUnique({
        where: { clerkOrgId },
      });

      if (existing) {
        if (existing.gcpStatus === GcpStatus.active) {
          this.logger.log(
            `Organization ${clerkOrgId} already provisioned, skipping`,
          );
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
          return;
        }

        // For any other state (creating), skip to avoid double processing
        this.logger.log(
          `Organization ${clerkOrgId} already in state ${existing.gcpStatus}, skipping`,
        );
        return;
      }

      const organization = await this.prisma.organization.create({
        data: {
          clerkOrgId,
          gcpStatus: GcpStatus.pending,
        },
      });

      this.logger.log(`Organization record created: ${organization.id}`);

      await this.gcpService.createProject(clerkOrgId, orgName);

      this.logger.log(`Organization provisioned successfully: ${clerkOrgId}`);
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
      this.logger.log(`Deprovisioning organization: ${clerkOrgId}`);

      const organization = await this.prisma.organization.findUnique({
        where: { clerkOrgId },
      });

      if (!organization) {
        this.logger.log(
          `Organization ${clerkOrgId} not found, already deprovisioned`,
        );
        return;
      }

      // Delete the GCP project first
      await this.gcpService.deleteProject(clerkOrgId);

      // Delete the organization record from the database
      // Use deleteMany to avoid throwing if record was already removed
      await this.prisma.organization.deleteMany({
        where: { clerkOrgId },
      });

      this.logger.log(
        `Organization deprovisioned successfully: ${clerkOrgId}`,
      );
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