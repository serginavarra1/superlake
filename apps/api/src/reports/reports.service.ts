import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { GcpStatus } from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { MetricDto, ReportConfigDto } from './reports.types';

// Unicode letters, digits, underscore — safe for backtick-quoted column names
const SAFE_COLUMN_RE = /^[\p{L}\p{N}_]+$/u;
// Unicode letters, digits, underscore, hyphens, spaces — safe for backtick-quoted dataset/table identifiers
const SAFE_IDENTIFIER_RE = /^[\p{L}\p{N}_ -]+$/u;

function assertIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(value)) {
    throw new BadRequestException(`Invalid ${label}: "${value}"`);
  }
}

function assertColumn(value: string): void {
  if (!SAFE_COLUMN_RE.test(value)) {
    throw new BadRequestException(`Invalid column name: "${value}"`);
  }
}

function granularityExpr(column: string, granularity: string | null): string {
  const col = `\`${column}\``;
  switch (granularity) {
    case 'date':
      return `DATE(${col})`;
    case 'month_year':
      return `DATE_TRUNC(${col}, MONTH)`;
    case 'year':
      return `DATE_TRUNC(${col}, YEAR)`;
    default:
      return col;
  }
}

function buildQuery(config: ReportConfigDto): string {
  const {
    dataSource,
    dimension,
    dimensionGranularity,
    groupBy,
    groupByGranularity,
    groupByIncludeEmpty,
    metrics,
    orderBy,
  } = config;

  assertIdentifier(dataSource.datasetId, 'datasetId');
  assertIdentifier(dataSource.tableId, 'tableId');
  if (dimension) assertColumn(dimension);
  if (groupBy) assertColumn(groupBy);
  for (const m of metrics) {
    if (m.column !== null) assertColumn(m.column);
  }

  const table = `\`${dataSource.datasetId}.${dataSource.tableId}\``;

  const selectParts: string[] = [];
  const groupByExprs: string[] = [];

  // Dimension
  if (dimension) {
    const dimExpr = granularityExpr(dimension, dimensionGranularity ?? null);
    selectParts.push(`${dimExpr} AS dimension`);
    groupByExprs.push(dimExpr);
  }

  // Group by
  if (groupBy) {
    const gbExpr = granularityExpr(groupBy, groupByGranularity ?? null);
    selectParts.push(`${gbExpr} AS group_by`);
    groupByExprs.push(gbExpr);
  }

  // Metrics
  metrics.forEach((m: MetricDto, i: number) => {
    const col = m.column !== null ? `\`${m.column}\`` : '*';
    const expr = m.operation === 'count_distinct'
      ? `COUNT(DISTINCT ${col})`
      : `${m.operation.toUpperCase()}(${col})`;
    selectParts.push(`${expr} AS metric_${i}`);
  });

  if (selectParts.length === 0) {
    throw new BadRequestException(
      'Report config must include at least a dimension or a metric',
    );
  }

  let sql = `SELECT\n  ${selectParts.join(',\n  ')}\nFROM ${table}`;

  // WHERE: exclude NULLs in groupBy unless explicitly included
  if (groupBy && !groupByIncludeEmpty) {
    sql += `\nWHERE \`${groupBy}\` IS NOT NULL`;
  }

  // GROUP BY
  if (groupByExprs.length > 0) {
    sql += `\nGROUP BY ${groupByExprs.join(', ')}`;
  }

  // ORDER BY — BigQuery supports aliases in ORDER BY
  if (orderBy) {
    let orderAlias: string;
    if (orderBy.target === 'dimension' && dimension) {
      orderAlias = 'dimension';
    } else if (orderBy.target === 'group_by' && groupBy) {
      orderAlias = 'group_by';
    } else {
      const idx = metrics.findIndex((m) => m.id === orderBy.target);
      orderAlias = idx >= 0 ? `metric_${idx}` : (dimension ? 'dimension' : 'group_by');
    }
    sql += `\nORDER BY ${orderAlias} ${orderBy.direction.toUpperCase()}`;
  }

  return sql;
}

// BigQuery date/time types that carry their value in a `.value` string property
const BQ_TEMPORAL_TYPES = new Set([
  'BigQueryDate',
  'BigQueryTime',
  'BigQueryTimestamp',
  'BigQueryDatetime',
]);

// Recursively convert BigInt and BigQuery temporal values for JSON serialisation
function serialise(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(serialise);
  if (value !== null && typeof value === 'object') {
    const ctorName = (value as object).constructor?.name;
    if (BQ_TEMPORAL_TYPES.has(ctorName)) {
      return (value as { value: string }).value;
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialise(v)]),
    );
  }
  return value;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly organizationsService: OrganizationsService) {}

  async runQuery(clerkOrgId: string, config: ReportConfigDto): Promise<unknown[]> {
    const organization = await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const sql = buildQuery(config);
    this.logger.debug(`Running report query:\n${sql}`);

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });
    const [rows] = await bigquery.query({ query: sql });

    return serialise(rows) as unknown[];
  }
}
