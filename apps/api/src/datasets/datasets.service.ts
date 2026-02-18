import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { OrganizationsService } from '../organizations/organizations.service';
import { GcpStatus } from '@prisma/client';

export interface TableInfo {
  tableId: string;
  type: string;
}

export interface DatasetInfo {
  datasetId: string;
  tables: TableInfo[];
}

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(private organizationsService: OrganizationsService) {}

  async listDatasets(clerkOrgId: string): Promise<DatasetInfo[]> {
    const organization =
      await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });

    const [datasets] = await bigquery.getDatasets();

    const result: DatasetInfo[] = await Promise.all(
      datasets.map(async (dataset) => {
        const datasetId = dataset.id!;
        const [tables] = await dataset.getTables();

        return {
          datasetId,
          tables: tables.map((table) => ({
            tableId: table.id!,
            type: table.metadata?.type ?? 'TABLE',
          })),
        };
      }),
    );

    return result;
  }
}
