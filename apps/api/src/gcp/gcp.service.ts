import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { ServiceUsageClient } from '@google-cloud/service-usage';
import { CloudBillingClient } from '@google-cloud/billing';
import { GcpStatus } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class GcpService {
  private readonly logger = new Logger(GcpService.name);
  private readonly projectsClient: ProjectsClient;
  private readonly serviceUsageClient: ServiceUsageClient;
  private readonly billingClient: CloudBillingClient;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.projectsClient = new ProjectsClient();
    this.serviceUsageClient = new ServiceUsageClient();
    this.billingClient = new CloudBillingClient();
  }

  async createProject(clerkOrgId: string, orgName: string): Promise<string> {
    try {
      const projectId = this.generateProjectId(clerkOrgId);
      const folderId = this.configService.get<string>('GCP_PARENT_FOLDER_ID')!;

      this.logger.log(
        `Creating GCP project: ${projectId} for org: ${clerkOrgId}`,
      );

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: { gcpStatus: GcpStatus.creating },
      });

      const [operation] = await this.projectsClient.createProject({
        project: {
          projectId,
          displayName: orgName,
          parent: `folders/${folderId}`,
          labels: {
            'managed-by': 'unnamed-platform',
            'clerk-org': clerkOrgId.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
          },
        },
      });

      const [project] = await operation.promise();

      this.logger.log(
        `GCP project created successfully: ${project.projectId}`,
      );

      await this.linkBillingAccount(project.projectId!);
      await this.enableBigQueryApi(project.projectId!);

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: {
          gcpProjectId: project.projectId,
          gcpStatus: GcpStatus.active,
          gcpError: null,
        },
      });

      return project.projectId!;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create GCP project: ${errorMessage}`,
        errorStack,
      );

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: {
          gcpStatus: GcpStatus.failed,
          gcpError: errorMessage,
        },
      });

      throw error;
    }
  }

  async deleteProject(clerkOrgId: string): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { clerkOrgId },
      });

      if (!organization?.gcpProjectId) {
        this.logger.warn(
          `No GCP project found for org: ${clerkOrgId}, skipping deletion`,
        );
        return;
      }

      const projectId = organization.gcpProjectId;

      this.logger.log(
        `Deleting GCP project: ${projectId} for org: ${clerkOrgId}`,
      );

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: { gcpStatus: GcpStatus.deleting },
      });

      const [operation] = await this.projectsClient.deleteProject({
        name: `projects/${projectId}`,
      });

      await operation.promise();

      this.logger.log(
        `GCP project deleted successfully: ${projectId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to delete GCP project: ${errorMessage}`,
        errorStack,
      );

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: {
          gcpStatus: GcpStatus.delete_failed,
          gcpError: errorMessage,
        },
      });

      throw error;
    }
  }

  private async linkBillingAccount(projectId: string): Promise<void> {
    const billingAccountId = this.configService.get<string>('GCP_BILLING_ACCOUNT_ID')!;

    this.logger.log(
      `Linking billing account ${billingAccountId} to project ${projectId}`,
    );

    await this.billingClient.updateProjectBillingInfo({
      name: `projects/${projectId}`,
      projectBillingInfo: {
        billingAccountName: `billingAccounts/${billingAccountId}`,
      },
    });

    this.logger.log(`Billing account linked to project ${projectId}`);
  }

  private async enableBigQueryApi(projectId: string): Promise<void> {
    this.logger.log(`Enabling BigQuery API for project ${projectId}`);

    const [operation] = await this.serviceUsageClient.enableService({
      name: `projects/${projectId}/services/bigquery.googleapis.com`,
    });

    await operation.promise();

    this.logger.log(`BigQuery API enabled for project ${projectId}`);
  }

  private generateProjectId(clerkOrgId: string): string {
    const hash = createHash('sha256')
      .update(clerkOrgId)
      .digest('hex')
      .slice(0, 16);
    return `unnamed-${hash}`;
  }
}