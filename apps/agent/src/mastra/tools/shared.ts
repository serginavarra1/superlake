import { z } from 'zod';

export const schemaFieldSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    mode: z.string(),
    description: z.string().optional(),
    fields: z.array(schemaFieldSchema).optional(),
  }),
);

export function getApiBase(): string {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL environment variable is not set');
  return base.replace(/\/$/, '');
}

export const widgetConfigSchema = z.object({
  title: z.string(),
  dataSource: z.object({
    datasetId: z.string(),
    tableId: z.string(),
  }),
  dimension: z.string().describe('Primary grouping column (X axis).').optional(),
  dimensionGranularity: z.array(z.enum(['day', 'month', 'year'])).describe('Time truncation for dimension date columns. IMPORTANT: Each value in the array adds a grouping level — e.g. ["month", "year"] groups by month within each year, while ["month"] alone merges months across all years.').optional(),
  groupBy: z.string().describe('Secondary grouping column. IMPORTANT: It always requires dimension to be set.').optional(),
  groupByGranularity: z.array(z.enum(['day', 'month', 'year'])).describe('Time truncation for groupBy date columns.').optional(),
  groupByIncludeEmpty: z.boolean().describe('Include rows where groupBy is null.'),
  metrics: z.array(
    z.object({
      id: z.string(),
      operation: z.enum(['sum', 'avg', 'count', 'count_distinct', 'min', 'max']),
      column: z.string().describe('Omit for count operation.').optional(),
    }),
  ),
  orderBy: z
    .object({
      target: z.string().describe('Metric id or "dimension".'),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  visualization: z
    .object({
      type: z.enum(['bar', 'line', 'pie', 'single_metric']),
      stacked: z.boolean().describe('Applicable to bar and line only.'),
    })
    .optional(),
  filters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      condition: z.object({
        id: z.string(),
        column: z.string().optional(),
        operator: z
          .enum([
            'is_null', 'is_not_null',
            'equals', 'not_equals',
            'contains', 'not_contains',
            'starts_with', 'ends_with',
            'greater_than', 'less_than',
            'greater_than_or_equal', 'less_than_or_equal',
            'in', 'not_in',
          ])
          .optional(),
        value: z.union([z.string(), z.array(z.string())]).optional(),
      }),
    }),
  ),
});
