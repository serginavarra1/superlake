import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcpService } from '../gcp/gcp.service';

@Injectable()
export class OrganizationsService {
  private logger = new Logger(OrganizationsService.name);

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

      // Create organization record in database
      const organization = await this.prisma.organization.create({
        data: {
          clerkOrgId,
          gcpStatus: 'pending',
        },
      });

      this.logger.log(`Organization record created: ${organization.id}`);

      // Create GCP project (this will update the status internally)
      await this.gcpService.createProject(clerkOrgId, orgName);

      this.logger.log(`Organization provisioned successfully: ${clerkOrgId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to provision organization: ${errorMessage}`,
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
