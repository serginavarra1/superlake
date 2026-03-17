import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { OrganizationsService } from '../organizations/organizations.service';
import { handleGcpError } from '../common/gcp-error';
import { GcpStatus } from '@prisma/client';
import { DatasetInfo, SchemaField, TableDetails } from './datasets.types';
import {
  SAFE_COLUMN_RE,
  SAFE_IDENTIFIER_RE,
  FILE_SIZE_LIMITS,
  quoteColumn,
  mapFields,
  patchFieldDescriptions,
  detectCsvDelimiter,
  sanitizeColumnName,
} from './datasets.utils';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(private organizationsService: OrganizationsService) {}

  private async getActiveOrg(clerkOrgId: string) {
    const org = await this.organizationsService.getByClerkOrgId(clerkOrgId);
    if (!org) throw new NotFoundException('Organization not found');
    if (org.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${org.gcpStatus})`,
      );
    }
    return org;
  }

  async listDatasets(clerkOrgId: string): Promise<DatasetInfo[]> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });

    try {
      const [datasets] = await bigquery.getDatasets();
      return Promise.all(
        datasets.map(async (dataset) => {
          const [tables] = await dataset.getTables();
          return {
            datasetId: dataset.id!,
            tables: tables.map((table) => ({
              tableId: table.id!,
              type: table.metadata?.type ?? 'TABLE',
            })),
          };
        }),
      );
    } catch (error) {
      handleGcpError(error);
    }
  }

  async getTableDetails(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
  ): Promise<TableDetails> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });

    let metadata: any;
    try {
      [metadata] = await bigquery.dataset(datasetId).table(tableId).getMetadata();
    } catch (error) {
      handleGcpError(error);
    }

    return {
      tableId: metadata.tableReference.tableId,
      datasetId: metadata.tableReference.datasetId,
      type: metadata.type ?? 'TABLE',
      description: metadata.description,
      schema: mapFields(metadata.schema?.fields ?? []),
      rowCount: metadata.numRows != null ? parseInt(metadata.numRows, 10) : null,
      sizeBytes: metadata.numBytes != null ? parseInt(metadata.numBytes, 10) : null,
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
            requireFilter: metadata.timePartitioning.requirePartitionFilter ?? false,
          }
        : metadata.rangePartitioning
          ? { type: 'RANGE', field: metadata.rangePartitioning.field, requireFilter: false }
          : undefined,
      clustering: metadata.clustering ? { fields: metadata.clustering.fields } : undefined,
      viewQuery: metadata.view?.query,
    };
  }

  async getTableRows(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
    startIndex: number,
    maxResults: number,
  ): Promise<{ rows: Record<string, unknown>[]; totalRows: number }> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    let rows: any[];
    try {
      [rows] = await bigquery.dataset(datasetId).table(tableId).getRows({
        startIndex: startIndex.toString(),
        maxResults,
      });
    } catch (error) {
      handleGcpError(error);
    }
    const serialized = rows!.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (val === null || val === undefined) out[key] = null;
        else if (typeof val === 'object' && 'value' in (val as any)) out[key] = (val as any).value;
        else out[key] = val;
      }
      return out;
    });
    return { rows: serialized, totalRows: serialized.length };
  }

  async deleteTable(clerkOrgId: string, datasetId: string, tableId: string): Promise<void> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    try {
      await bigquery.dataset(datasetId).table(tableId).delete();
    } catch (error) {
      handleGcpError(error);
    }
  }

  async updateTable(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
    dto: { description?: string; fieldDescriptions?: { path: string; description: string }[] },
  ): Promise<void> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    const table = bigquery.dataset(datasetId).table(tableId);

    let metadata: any;
    try {
      [metadata] = await table.getMetadata();
    } catch (error) {
      handleGcpError(error);
    }

    const updates: Record<string, any> = {};
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.fieldDescriptions && dto.fieldDescriptions.length > 0) {
      const descMap = Object.fromEntries(dto.fieldDescriptions.map((f) => [f.path, f.description]));
      updates.schema = { fields: patchFieldDescriptions(metadata.schema?.fields ?? [], descMap) };
    }

    try {
      await table.setMetadata(updates);
    } catch (error) {
      handleGcpError(error);
    }
  }

  async createDataset(
    clerkOrgId: string,
    dto: { datasetId: string; location?: string; description?: string },
  ): Promise<{ datasetId: string }> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    try {
      await bigquery.createDataset(dto.datasetId, {
        location: dto.location,
        description: dto.description,
      });
    } catch (error) {
      handleGcpError(error);
    }
    return { datasetId: dto.datasetId };
  }

  async createTable(
    clerkOrgId: string,
    datasetId: string,
    dto: { tableId: string; schema: SchemaField[]; description?: string },
  ): Promise<{ tableId: string }> {
    const org = await this.getActiveOrg(clerkOrgId);
    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    try {
      await bigquery.dataset(datasetId).createTable(dto.tableId, {
        schema: { fields: dto.schema },
        ...(dto.description ? { description: dto.description } : {}),
      });
    } catch (error) {
      handleGcpError(error);
    }
    return { tableId: dto.tableId };
  }

  async getExcelMeta(clerkOrgId: string, fileBuffer: Buffer): Promise<{ sheets: string[] }> {
    const org = await this.organizationsService.getByClerkOrgId(clerkOrgId);
    if (!org) throw new NotFoundException('Organization not found');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    return { sheets: workbook.SheetNames };
  }

  async createTableFromFile(
    clerkOrgId: string,
    datasetId: string,
    dto: {
      tableId: string;
      fileType: 'csv' | 'excel' | 'json';
      description?: string;
      sheet?: string;
      startRow?: number;
    },
    fileBuffer: Buffer,
  ): Promise<{ tableId: string; rowCount: number } | undefined> {
    const org = await this.getActiveOrg(clerkOrgId);

    const limit = FILE_SIZE_LIMITS[dto.fileType];
    if (fileBuffer.length > limit) {
      throw new BadRequestException(
        `File too large: maximum size for ${dto.fileType} is ${Math.round(limit / 1024 / 1024)} MB`,
      );
    }

    switch (dto.fileType) {
      case 'csv':
        return this.createTableFromCsv(org.gcpProjectId!, datasetId, dto, fileBuffer);
      case 'excel':
        return this.createTableFromExcel(org.gcpProjectId!, datasetId, dto, fileBuffer);
      case 'json':
        return this.createTableFromJson(org.gcpProjectId!, datasetId, dto, fileBuffer);
    }
  }

  private async createTableFromCsv(
    gcpProjectId: string,
    datasetId: string,
    dto: { tableId: string; description?: string },
    fileBuffer: Buffer,
  ): Promise<{ tableId: string; rowCount: number }> {
    const delimiter = detectCsvDelimiter(fileBuffer);

    const storage = new Storage({ projectId: gcpProjectId });
    const gcsFile = storage.bucket(`${gcpProjectId}-staging`).file(`uploads/${randomUUID()}.csv`);
    await gcsFile.save(fileBuffer);

    try {
      const table = new BigQuery({ projectId: gcpProjectId }).dataset(datasetId).table(dto.tableId);
      const [job] = await table.load(gcsFile, {
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        autodetect: true,
        fieldDelimiter: delimiter,
        ...(dto.description ? { description: dto.description } : {}),
      });

      const errors = job.status?.errors;
      if (errors && errors.length > 0) {
        throw new BadRequestException(
          `Failed to load CSV: ${errors.map((e: any) => e.message).join('; ')}`,
        );
      }

      const [metadata] = await table.getMetadata();
      return { tableId: dto.tableId, rowCount: parseInt(metadata.numRows, 10) };
    } finally {
      await gcsFile.delete().catch(() => {});
    }
  }

  private async createTableFromExcel(
    gcpProjectId: string,
    datasetId: string,
    dto: { tableId: string; description?: string; sheet?: string; startRow?: number },
    fileBuffer: Buffer,
  ): Promise<{ tableId: string; rowCount: number }> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', dense: true });

    const sheetName = dto.sheet ?? workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new BadRequestException(
        `Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(', ')}`,
      );
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    });

    const headerIndex = (dto.startRow ?? 1) - 1;
    const rawHeaders = rows[headerIndex] as unknown[];
    if (!rawHeaders || rawHeaders.length === 0) {
      throw new BadRequestException('No header row found in the Excel file');
    }

    // Sanitize headers and deduplicate
    const seen = new Map<string, number>();
    const headers = rawHeaders.map((h) => {
      let name = sanitizeColumnName(h == null ? '' : String(h));
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      if (count > 0) name = `${name}_${count + 1}`;
      return name;
    });

    const dataRows = rows.slice(headerIndex + 1);
    const ndjson = dataRows
      .map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((col, i) => { obj[col] = (row as unknown[])[i] ?? null; });
        return JSON.stringify(obj);
      })
      .join('\n');

    const storage = new Storage({ projectId: gcpProjectId });
    const gcsFile = storage.bucket(`${gcpProjectId}-staging`).file(`uploads/${randomUUID()}.json`);
    await gcsFile.save(Buffer.from(ndjson, 'utf8'));

    try {
      const table = new BigQuery({ projectId: gcpProjectId }).dataset(datasetId).table(dto.tableId);
      const [job] = await table.load(gcsFile, {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        autodetect: true,
        ...(dto.description ? { description: dto.description } : {}),
      });

      const errors = job.status?.errors;
      if (errors && errors.length > 0) {
        throw new BadRequestException(
          `Failed to load Excel: ${errors.map((e: any) => e.message).join('; ')}`,
        );
      }

      const [metadata] = await table.getMetadata();
      return { tableId: dto.tableId, rowCount: parseInt(metadata.numRows, 10) };
    } finally {
      await gcsFile.delete().catch(() => {});
    }
  }

  private async createTableFromJson(
    gcpProjectId: string,
    datasetId: string,
    dto: { tableId: string; description?: string },
    fileBuffer: Buffer,
  ): Promise<{ tableId: string; rowCount: number }> {
    // Detect format: JSON array vs already-NDJSON
    const firstChar = fileBuffer.toString('utf8', 0, 100).trimStart()[0];
    let ndjsonBuffer: Buffer;

    if (firstChar === '[') {
      const parsed: unknown = JSON.parse(fileBuffer.toString('utf8'));
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('JSON file must contain an array of objects');
      }
      ndjsonBuffer = Buffer.from(
        parsed.map((row) => JSON.stringify(row)).join('\n'),
        'utf8',
      );
    } else {
      // Assume already NDJSON — upload directly without parsing
      ndjsonBuffer = fileBuffer;
    }

    const storage = new Storage({ projectId: gcpProjectId });
    const gcsFile = storage.bucket(`${gcpProjectId}-staging`).file(`uploads/${randomUUID()}.json`);
    await gcsFile.save(ndjsonBuffer);

    try {
      const table = new BigQuery({ projectId: gcpProjectId }).dataset(datasetId).table(dto.tableId);
      const [job] = await table.load(gcsFile, {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        autodetect: true,
        ...(dto.description ? { description: dto.description } : {}),
      });

      const errors = job.status?.errors;
      if (errors && errors.length > 0) {
        throw new BadRequestException(
          `Failed to load JSON: ${errors.map((e: any) => e.message).join('; ')}`,
        );
      }

      const [metadata] = await table.getMetadata();
      return { tableId: dto.tableId, rowCount: parseInt(metadata.numRows, 10) };
    } finally {
      await gcsFile.delete().catch(() => {});
    }
  }

  async getDistinctValues(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
    column: string,
  ): Promise<(string | number | null)[]> {
    const org = await this.getActiveOrg(clerkOrgId);

    if (!SAFE_IDENTIFIER_RE.test(datasetId)) {
      throw new BadRequestException(`Invalid datasetId: "${datasetId}"`);
    }
    if (!SAFE_IDENTIFIER_RE.test(tableId)) {
      throw new BadRequestException(`Invalid tableId: "${tableId}"`);
    }
    if (!SAFE_COLUMN_RE.test(column)) {
      throw new BadRequestException(`Invalid column name: "${column}"`);
    }

    const bigquery = new BigQuery({ projectId: org.gcpProjectId! });
    const query = `SELECT DISTINCT ${quoteColumn(column)} FROM \`${datasetId}.${tableId}\` ORDER BY 1 LIMIT 100`;

    let rows: any[];
    try {
      [rows] = await bigquery.query({ query });
    } catch (error) {
      handleGcpError(error);
    }

    // BigQuery returns nested field paths (e.g. "address.street") using only the
    // leaf segment as the row key, so extract by the last segment of the path.
    const leafKey = column.split('.').pop()!;
    return rows.map((row: Record<string, unknown>) => {
      const val = row[leafKey];
      if (val === null || val === undefined) return null;
      return val as string | number;
    });
  }
}
