import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { parse, isValid, format } from 'date-fns';
import { BigQuery } from '@google-cloud/bigquery';
import { OrganizationsService } from '../organizations/organizations.service';
import { handleGcpError } from '../common/gcp-error';
import { GcpStatus } from '@prisma/client';
import {
  DatasetInfo,
  SchemaField,
  TableDetails,
} from './datasets.types';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

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

    try {
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
    } catch (error) {
      handleGcpError(error);
    }
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

  async deleteTable(
    clerkOrgId: string,
    datasetId: string,
    tableId: string,
  ): Promise<void> {
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
    const table = bigquery.dataset(datasetId).table(tableId);

    let metadata: any;
    try {
      [metadata] = await table.getMetadata();
    } catch (error) {
      handleGcpError(error);
    }

    const updates: Record<string, any> = {};

    if (dto.description !== undefined) {
      updates.description = dto.description;
    }

    if (dto.fieldDescriptions && dto.fieldDescriptions.length > 0) {
      const descMap = Object.fromEntries(
        dto.fieldDescriptions.map((f) => [f.path, f.description]),
      );
      updates.schema = {
        fields: patchFieldDescriptions(metadata.schema?.fields ?? [], descMap),
      };
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
    const organization =
      await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) throw new NotFoundException('Organization not found');
    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });
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

  async getExcelMeta(
    clerkOrgId: string,
    fileBuffer: Buffer,
  ): Promise<{ sheets: string[] }> {
    // Org validation not strictly needed to read a local file, but
    // we gate it behind auth anyway to avoid unauthenticated usage.
    const organization =
      await this.organizationsService.getByClerkOrgId(clerkOrgId);
    if (!organization) throw new NotFoundException('Organization not found');

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
  ): Promise<{ tableId: string; rowCount: number }> {
    const organization =
      await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) throw new NotFoundException('Organization not found');
    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const gcpProjectId = organization.gcpProjectId!;
    const bucketName = `${gcpProjectId}-staging`;

    let gcsContent: Buffer;
    let sourceFormat: 'CSV' | 'NEWLINE_DELIMITED_JSON';
    let loadOptions: Record<string, unknown>;

    const sizeLimit = FILE_SIZE_LIMITS[dto.fileType];
    if (fileBuffer.length > sizeLimit) {
      throw new BadRequestException(
        `File exceeds the ${dto.fileType.toUpperCase()} size limit of ${sizeLimit / (1024 * 1024)}MB`,
      );
    }

    if (dto.fileType === 'csv') {
      gcsContent = fileBuffer;
      sourceFormat = 'CSV';
      loadOptions = {
        sourceFormat: 'CSV',
        autodetect: true,
        skipLeadingRows: 1,
        writeDisposition: 'WRITE_EMPTY',
        createDisposition: 'CREATE_IF_NEEDED',
      };
    } else {
      let records: Record<string, unknown>[];
      if (dto.fileType === 'excel') {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = dto.sheet ?? workbook.SheetNames[0];
        records = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[sheetName],
          { defval: null, range: (dto.startRow ?? 1) - 1 },
        );
      } else {
        const parsed = JSON.parse(fileBuffer.toString('utf-8'));
        if (!Array.isArray(parsed)) {
          throw new BadRequestException('JSON file must contain an array of objects');
        }
        records = parsed as Record<string, unknown>[];
      }
      const { fields, keyMap } = inferSchemaFromRecords(records.slice(0, 200));
      gcsContent = Buffer.from(
        records.map((r) => JSON.stringify(coerceRow(r, fields, keyMap))).join('\n'),
        'utf-8',
      );
      sourceFormat = 'NEWLINE_DELIMITED_JSON';
      loadOptions = {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        schema: { fields },
        writeDisposition: 'WRITE_EMPTY',
        createDisposition: 'CREATE_IF_NEEDED',
      };
    }

    const ext = sourceFormat === 'CSV' ? 'csv' : 'ndjson';
    const gcsPath = `uploads/${datasetId}/${dto.tableId}/${randomUUID()}.${ext}`;
    const storage = new Storage({ projectId: gcpProjectId });
    const gcsFile = storage.bucket(bucketName).file(gcsPath);

    try {
      await gcsFile.save(gcsContent, { resumable: false });
    } catch (error) {
      handleGcpError(error);
    }

    let rowCount = 0;
    try {
      const bigquery = new BigQuery({ projectId: gcpProjectId });
      const table = bigquery.dataset(datasetId).table(dto.tableId);

      const [job] = await table.createLoadJob(gcsFile, loadOptions as any) as any;
      const [metadata] = await job.promise();

      const errs = metadata?.status?.errors;
      if (errs?.length) throw new BadRequestException(errs[0].message);

      rowCount = parseInt(metadata?.statistics?.load?.outputRows ?? '0', 10);

      if (dto.description) {
        await table.setMetadata({ description: dto.description });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      handleGcpError(error);
    } finally {
      try {
        await gcsFile.delete();
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to delete GCS staging object gs://${bucketName}/${gcsPath}: ${cleanupError}`,
        );
      }
    }

    return { tableId: dto.tableId, rowCount };
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

// Unicode letters, digits, underscore — safe for backtick-quoted column names; dots allowed for nested field paths
const SAFE_COLUMN_RE = /^[\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*$/u;

function quoteColumn(column: string): string {
  return column.split('.').map((seg) => `\`${seg}\``).join('.');
}
// Unicode letters, digits, underscore, hyphens, spaces — safe for backtick-quoted dataset/table identifiers
const SAFE_IDENTIFIER_RE = /^[\p{L}\p{N}_ -]+$/u;

function patchFieldDescriptions(
  fields: any[],
  descMap: Record<string, string>,
  prefix = '',
): any[] {
  return fields.map((f) => {
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    const patched = { ...f };
    if (path in descMap) patched.description = descMap[path];
    if (f.fields) patched.fields = patchFieldDescriptions(f.fields, descMap, path);
    return patched;
  });
}

function mapFields(fields: any[]): SchemaField[] {
  return fields.map((f) => ({
    name: f.name,
    type: f.type,
    mode: f.mode ?? 'NULLABLE',
    description: f.description,
    fields: f.fields ? mapFields(f.fields) : undefined,
  }));
}

const FILE_SIZE_LIMITS: Record<string, number> = {
  csv: 1 * 1024 * 1024 * 1024, // 1 GB — no in-memory parsing
  excel: 100 * 1024 * 1024,    // 100 MB — fully parsed in memory
  json: 100 * 1024 * 1024,     // 100 MB — fully parsed in memory
};

// ISO formats handled by regex fast-path below.
// Only non-ISO, locale-specific date formats (all date-only) are listed here.
const LOCALE_DATE_FORMATS = [
  'd MMMM yyyy',
  'dd MMMM yyyy',
  'MMMM d, yyyy',
  'MMMM dd, yyyy',
  'd MMM yyyy',
  'dd MMM yyyy',
  'MMM d, yyyy',
  'MMM dd, yyyy',
  'yyyy/MM/dd',
  'dd/MM/yyyy',
  'dd.MM.yyyy',
  'dd-MM-yyyy',
  'MM/dd/yyyy',
  'MM-dd-yyyy',
];

const PARSE_REF_DATE = new Date(0);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;

function sanitizeColumnName(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
}

function tryParseDate(
  value: string,
): { iso: string; isTimestamp: boolean } | null {
  const trimmed = value.trim();
  if (ISO_DATE_RE.test(trimmed)) return { iso: trimmed, isTimestamp: false };
  if (ISO_TIMESTAMP_RE.test(trimmed)) {
    const d = new Date(trimmed); // handles timezone offsets via native parsing
    if (!isNaN(d.getTime())) {
      return { iso: format(d, "yyyy-MM-dd'T'HH:mm:ss"), isTimestamp: true };
    }
  }
  for (const fmt of LOCALE_DATE_FORMATS) {
    const d = parse(trimmed, fmt, PARSE_REF_DATE);
    if (isValid(d)) return { iso: format(d, 'yyyy-MM-dd'), isTimestamp: false };
  }
  return null;
}

function inferBqType(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'STRING';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'FLOAT';
  if (typeof value === 'string') {
    const parsed = tryParseDate(value);
    if (parsed) return parsed.isTimestamp ? 'TIMESTAMP' : 'DATE';
    if (/^-?\d+$/.test(value)) return 'INTEGER';
    if (/^-?\d+\.\d+$/.test(value)) return 'FLOAT';
    if (/^(true|false)$/i.test(value)) return 'BOOLEAN';
  }
  return 'STRING';
}

function inferSchemaFromRecords(
  records: Record<string, unknown>[],
): { fields: SchemaField[]; keyMap: Record<string, string> } {
  if (records.length === 0) return { fields: [], keyMap: {} };
  const keys = Object.keys(records[0]);
  const keyMap: Record<string, string> = {};
  const fields = keys.map((key) => {
    const sample = records.find(
      (r) => r[key] !== null && r[key] !== undefined && r[key] !== '',
    );
    const type = sample ? inferBqType(sample[key]) : 'STRING';
    const name = sanitizeColumnName(key);
    keyMap[name] = key;
    return { name, type, mode: 'NULLABLE' as const };
  });
  return { fields, keyMap };
}

function coerceRow(
  row: Record<string, unknown>,
  fields: SchemaField[],
  keyMap: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = row[keyMap[field.name] ?? field.name];
    if (raw === null || raw === undefined || raw === '') {
      result[field.name] = null;
      continue;
    }
    if (field.type === 'INTEGER') {
      result[field.name] = parseInt(String(raw), 10);
    } else if (field.type === 'FLOAT') {
      result[field.name] = parseFloat(String(raw));
    } else if (field.type === 'BOOLEAN') {
      result[field.name] =
        typeof raw === 'boolean' ? raw : String(raw).toLowerCase() === 'true';
    } else if (field.type === 'DATE' || field.type === 'TIMESTAMP') {
      if (/^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
        result[field.name] = String(raw);
      } else {
        const parsed = tryParseDate(String(raw));
        result[field.name] = parsed ? parsed.iso : String(raw);
      }
    } else {
      result[field.name] = String(raw);
    }
  }
  return result;
}
