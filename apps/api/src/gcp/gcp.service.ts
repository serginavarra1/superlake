import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { ServiceUsageClient } from '@google-cloud/service-usage';
import { CloudBillingClient } from '@google-cloud/billing';
import { Storage } from '@google-cloud/storage';
import { GcpStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { handleGcpError } from '../common/gcp-error';

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


      await this.linkBillingAccount(project.projectId!);
      await this.enableBigQueryApi(project.projectId!);
      await this.enableStorageApi(project.projectId!);
      await this.createStagingBucket(project.projectId!);
      await this.grantBigQueryRoles(project.projectId!);

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

      handleGcpError(error);
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

      await this.prisma.organization.update({
        where: { clerkOrgId },
        data: { gcpStatus: GcpStatus.deleting },
      });

      const [operation] = await this.projectsClient.deleteProject({
        name: `projects/${projectId}`,
      });

      await operation.promise();

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

      handleGcpError(error);
    }
  }

  private async linkBillingAccount(projectId: string): Promise<void> {
    const billingAccountId = this.configService.get<string>('GCP_BILLING_ACCOUNT_ID')!;

    await this.billingClient.updateProjectBillingInfo({
      name: `projects/${projectId}`,
      projectBillingInfo: {
        billingAccountName: `billingAccounts/${billingAccountId}`,
      },
    });
    
  }

  private async enableBigQueryApi(projectId: string): Promise<void> {
    const [operation] = await this.serviceUsageClient.enableService({
      name: `projects/${projectId}/services/bigquery.googleapis.com`,
    });

    await operation.promise();
  }

  private async enableStorageApi(projectId: string): Promise<void> {
    const [operation] = await this.serviceUsageClient.enableService({
      name: `projects/${projectId}/services/storage.googleapis.com`,
    });

    await operation.promise();
  }

  async grantFivetranRoles(projectId: string, saEmail: string): Promise<void> {
    const member = `serviceAccount:${saEmail}`;
    const [policy] = await this.projectsClient.getIamPolicy({
      resource: `projects/${projectId}`,
    });
    const bindings = policy.bindings ?? [];
    const roles = [
      'roles/bigquery.user',
      'roles/bigquery.dataEditor',
      'roles/bigquery.jobUser',
      'roles/storage.objectAdmin',
    ];
    for (const role of roles) {
      const binding = bindings.find((b) => b.role === role);
      if (binding) {
        if (!(binding.members ?? []).includes(member)) {
          binding.members = [...(binding.members ?? []), member];
        }
      } else {
        bindings.push({ role, members: [member] });
      }
    }
    await this.projectsClient.setIamPolicy({
      resource: `projects/${projectId}`,
      policy: { ...policy, bindings },
    });
  }

  private async grantBigQueryRoles(projectId: string): Promise<void> {
    const readSa = `serviceAccount:${this.configService.get<string>('GCP_BQ_READ_SA')}`;
    const writeSa = `serviceAccount:${this.configService.get<string>('GCP_BQ_WRITE_SA')}`;

    const [policy] = await this.projectsClient.getIamPolicy({
      resource: `projects/${projectId}`,
    });
    const bindings = policy.bindings ?? [];

    const merge = (role: string, member: string) => {
      const binding = bindings.find((b) => b.role === role);
      if (binding) binding.members = [...(binding.members ?? []), member];
      else bindings.push({ role, members: [member] });
    };

    merge('roles/bigquery.dataViewer', readSa);
    merge('roles/bigquery.jobUser', readSa);
    merge('roles/bigquery.dataEditor', writeSa);
    merge('roles/bigquery.jobUser', writeSa);
    merge('roles/storage.objectViewer', writeSa);

    await this.projectsClient.setIamPolicy({
      resource: `projects/${projectId}`,
      policy: { ...policy, bindings },
    });
  }

  private async createStagingBucket(projectId: string): Promise<void> {
    const storage = new Storage({ projectId });
    await storage.createBucket(`${projectId}-staging`, {
      location: 'EU',
      lifecycle: {
        rule: [{ action: { type: 'Delete' }, condition: { age: 1 } }],
      },
    });
  }

  private generateProjectId(clerkOrgId: string): string {
    const hash = createHash('sha256')
      .update(clerkOrgId)
      .digest('hex')
      .slice(0, 16);
    return `unnamed-${hash}`;
  }
}