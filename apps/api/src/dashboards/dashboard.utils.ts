import { BadRequestException } from '@nestjs/common';
import { MetricDto, ReportConfigDto } from './dashboards.types';

// Unicode letters, digits, underscore — safe for backtick-quoted column names; dots allowed for nested field paths
const SAFE_COLUMN_RE = /^[\p{L}\p{N}_ ]+(?:\.[\p{L}\p{N}_ ]+)*$/u;
// Unicode letters, digits, underscore, hyphens, spaces — safe for backtick-quoted dataset/table identifiers
const SAFE_IDENTIFIER_RE = /^[\p{L}\p{N}_ -]+$/u;

// BigQuery date/time types that carry their value in a `.value` string property
export const BQ_TEMPORAL_TYPES = new Set([
  'BigQueryDate',
  'BigQueryTime',
  'BigQueryTimestamp',
  'BigQueryDatetime',
]);

export function assertIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(value)) {
    throw new BadRequestException(`Invalid ${label}: "${value}"`);
  }
}

export function assertColumn(value: string): void {
  if (!SAFE_COLUMN_RE.test(value)) {
    throw new BadRequestException(`Invalid column name: "${value}"`);
  }
}

// Backtick-quote each path segment individually so nested fields like
// `parent`.`child` are valid BigQuery syntax (not `parent.child`).
export function quoteColumn(column: string): string {
  return column.split('.').map((seg) => `\`${seg}\``).join('.');
}

// Try to parse a string value as a number so BigQuery receives the correct type
// when comparing against numeric columns. Falls back to the original string.
export function coerceScalar(v: string): string | number {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function granularityExpr(column: string, granularity: string[] | null): string {
  const col = quoteColumn(column);
  if (!granularity || granularity.length === 0) return col;

  const hasDay   = granularity.includes('day');
  const hasMonth = granularity.includes('month');
  const hasYear  = granularity.includes('year');

  if (hasDay && hasMonth && hasYear)  return `DATE(${col})`;
  if (!hasDay && hasMonth && hasYear) return `DATE_TRUNC(${col}, MONTH)`;
  if (!hasDay && !hasMonth && hasYear) return `DATE_TRUNC(${col}, YEAR)`;
  if (!hasDay && hasMonth && !hasYear) return `EXTRACT(MONTH FROM DATE(${col}))`;
  if (hasDay && !hasMonth && !hasYear) return `EXTRACT(DAY FROM DATE(${col}))`;
  if (hasDay && hasMonth && !hasYear)  return `FORMAT_DATE('%m-%d', DATE(${col}))`;
  if (hasDay && !hasMonth && hasYear)  return `FORMAT_DATE('%Y-%d', DATE(${col}))`;

  return `DATE(${col})`;
}

// Recursively convert BigInt and BigQuery temporal values for JSON serialisation
export function serialise(value: unknown): unknown {
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

export interface QueryPlan {
  sql: string;
  params: Record<string, unknown>;
  types: Record<string, string | string[]>;
}

export function buildQuery(config: ReportConfigDto): QueryPlan {
  const {
    dataSource,
    dimension,
    dimensionGranularity,
    groupBy,
    groupByGranularity,
    groupByIncludeEmpty,
    metrics,
    orderBy,
    filters,
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
    const col = m.column !== null ? quoteColumn(m.column) : '*';
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

  const whereClauses: string[] = [];
  const params: Record<string, unknown> = {};
  const types: Record<string, string | string[]> = {};

  // Exclude NULLs in groupBy unless explicitly included
  if (groupBy && !groupByIncludeEmpty) {
    whereClauses.push(`${quoteColumn(groupBy)} IS NOT NULL`);
  }

  // Filter conditions → parameterized WHERE clauses
  (filters ?? []).forEach((filter, i) => {
    const { condition } = filter;
    if (!condition?.column || !condition?.operator) return;

    const needsValue = !['is_null', 'is_not_null'].includes(condition.operator);
    if (needsValue && (condition.value === null || condition.value === undefined)) return;
    if (
      (condition.operator === 'in' || condition.operator === 'not_in') &&
      Array.isArray(condition.value) && condition.value.length === 0
    ) return;

    assertColumn(condition.column);
    const col = quoteColumn(condition.column);
    const p = `f${i}`;

    switch (condition.operator) {
      case 'is_null':
        whereClauses.push(`${col} IS NULL`);
        break;
      case 'is_not_null':
        whereClauses.push(`${col} IS NOT NULL`);
        break;
      case 'equals':
        whereClauses.push(`${col} = @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'not_equals':
        whereClauses.push(`${col} != @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'contains':
        whereClauses.push(`${col} LIKE @${p}`);
        params[p] = `%${condition.value}%`;
        break;
      case 'not_contains':
        whereClauses.push(`${col} NOT LIKE @${p}`);
        params[p] = `%${condition.value}%`;
        break;
      case 'starts_with':
        whereClauses.push(`${col} LIKE @${p}`);
        params[p] = `${condition.value}%`;
        break;
      case 'ends_with':
        whereClauses.push(`${col} LIKE @${p}`);
        params[p] = `%${condition.value}`;
        break;
      case 'greater_than':
        whereClauses.push(`${col} > @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'less_than':
        whereClauses.push(`${col} < @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'greater_than_or_equal':
        whereClauses.push(`${col} >= @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'less_than_or_equal':
        whereClauses.push(`${col} <= @${p}`);
        params[p] = coerceScalar(condition.value as string);
        break;
      case 'in': {
        const raw = Array.isArray(condition.value) ? condition.value : [condition.value as string];
        const coerced = raw.map(coerceScalar);
        const allNumeric = coerced.every((v) => typeof v === 'number');
        whereClauses.push(`${col} IN UNNEST(@${p})`);
        params[p] = coerced;
        types[p] = [allNumeric ? 'FLOAT64' : 'STRING'];
        break;
      }
      case 'not_in': {
        const raw = Array.isArray(condition.value) ? condition.value : [condition.value as string];
        const coerced = raw.map(coerceScalar);
        const allNumeric = coerced.every((v) => typeof v === 'number');
        whereClauses.push(`${col} NOT IN UNNEST(@${p})`);
        params[p] = coerced;
        types[p] = [allNumeric ? 'FLOAT64' : 'STRING'];
        break;
      }
    }
  });

  let sql = `SELECT\n  ${selectParts.join(',\n  ')}\nFROM ${table}`;

  if (whereClauses.length > 0) {
    sql += `\nWHERE ${whereClauses.join('\n  AND ')}`;
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

  return { sql, params, types };
}
