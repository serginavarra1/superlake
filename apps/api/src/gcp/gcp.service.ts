import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { createHash } from 'crypto';

@Injectable()
export class GcpService {
  private logger = new Logger(GcpService.name);
  private projectsClient: ProjectsClient;

  constructor(private prisma: PrismaService) {
    this.projectsClient = new ProjectsClient();
  }

  async createProject(clerkOrgId: string, orgName: string): Promise<string> {
    const folderId = process.env.GCP_PARENT_FOLDER_ID;
    if (!folderId) {
      throw new Error('GCP_PARENT_FOLDER_ID is not configured');
    }

    try {
      const projectId = this.generateProjectId(clerkOrgId);

      this.logger.log(
        `Creating GCP project: ${projectId} for org: ${clerkOrgId}`,
      );

      await (this.prisma as any).organization.update({
        where: { clerkOrgId },
        data: { gcpStatus: 'creating' },
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

      await (this.prisma as any).organization.update({
        where: { clerkOrgId },
        data: {
          gcpProjectId: project.projectId,
          gcpStatus: 'active',
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

      await (this.prisma as any).organization.update({
        where: { clerkOrgId },
        data: {
          gcpStatus: 'failed',
          gcpError: errorMessage,
        },
      });

      throw error;
    }
  }

  private generateProjectId(clerkOrgId: string): string {
    const hash = createHash('sha256')
      .update(clerkOrgId)
      .digest('hex')
      .slice(0, 8);
    return `unnamed-${hash}`;
  }
}
