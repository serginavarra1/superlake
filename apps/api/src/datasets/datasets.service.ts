import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { OrganizationsService } from '../organizations/organizations.service';
import { GcpStatus } from '@prisma/client';
import {
  DatasetInfo,
  SchemaField,
  TableDetails,
} from './datasets.types';

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

  async getTableDetails(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
  ): Promise<TableDetails> {
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
    const [metadata] = await bigquery.dataset(datasetId).table(tableId).getMetadata();

    return {
      tableId: metadata.tableReference.tableId,
      datasetId: metadata.tableReference.datasetId,
      type: metadata.type ?? 'TABLE',
      description: metadata.description,
      schema: mapFields(metadata.schema?.fields ?? []),
      rowCount:
        metadata.numRows != null ? parseInt(metadata.numRows, 10) : null,
      sizeBytes:
        metadata.numBytes != null ? parseInt(metadata.numBytes, 10) : null,
      createdAt: metadata.creationTime
        ? new Date(parseInt(metadata.creationTime, 10)).toISOString()
        : null,
      lastModifiedAt: metadata.lastModifiedTime
        ? new Date(parseInt(metadata.lastModifiedTime, 10)).toISOString()
        : null,
      location: metadata.location ?? null,
      partitioning: metadata.timePartitioning
        ? {
            type: metadata.timePartitioning.type,
            field: metadata.timePartitioning.field,
            requireFilter:
              metadata.timePartitioning.requirePartitionFilter ?? false,
          }
        : metadata.rangePartitioning
          ? {
              type: 'RANGE',
              field: metadata.rangePartitioning.field,
              requireFilter: false,
            }
          : undefined,
      clustering: metadata.clustering
        ? { fields: metadata.clustering.fields }
        : undefined,
      viewQuery: metadata.view?.query,
    };
  }

  async getDistinctValues(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
    column: string,
  ): Promise<(string | number | null)[]> {
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

    if (!SAFE_IDENTIFIER_RE.test(datasetId)) {
      throw new BadRequestException(`Invalid datasetId: "${datasetId}"`);
    }
    if (!SAFE_IDENTIFIER_RE.test(tableId)) {
      throw new BadRequestException(`Invalid tableId: "${tableId}"`);
    }
    if (!SAFE_COLUMN_RE.test(column)) {
      throw new BadRequestException(`Invalid column name: "${column}"`);
    }

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });
    const query = `SELECT DISTINCT \`${column}\` FROM \`${datasetId}.${tableId}\` ORDER BY 1 LIMIT 100`;

    const [rows] = await bigquery.query({ query });

    return rows.map((row: Record<string, unknown>) => {
      const val = row[column];
      if (val === null || val === undefined) return null;
      return val as string | number;
    });
  }
}

// Unicode letters, digits, underscore — safe for backtick-quoted column names
const SAFE_COLUMN_RE = /^[\p{L}\p{N}_]+$/u;
// Unicode letters, digits, underscore, hyphens, spaces — safe for backtick-quoted dataset/table identifiers
const SAFE_IDENTIFIER_RE = /^[\p{L}\p{N}_ -]+$/u;

function mapFields(fields: any[]): SchemaField[] {
  return fields.map((f) => ({
    name: f.name,
    type: f.type,
    mode: f.mode ?? 'NULLABLE',
    description: f.description,
    fields: f.fields ? mapFields(f.fields) : undefined,
  }));
}
