import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const schemaFieldSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    mode: z.string(),
    description: z.string().optional(),
    fields: z.array(schemaFieldSchema).optional(),
  }),
);

function getApiBase(): string {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL environment variable is not set');
  return base.replace(/\/$/, '');
}

export const listDatasetsTool = createTool({
  id: 'list-datasets',
  description: 'Lists all available dataset IDs',
  inputSchema: z.object({}),
  outputSchema: z.union([
    z.array(z.object({ datasetId: z.string() })),
    z.object({ error: z.string() }),
  ]),
  execute: async (_input, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(`${getApiBase()}/api/datasets/ids`, {
      headers: { Authorization: authToken },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json();
    return Array.isArray(json) ? json : json.data;
  },
});

export const listTablesTool = createTool({
  id: 'list-tables',
  description: 'Lists the tables within a specific dataset',
  inputSchema: z.object({
    datasetId: z.string(),
  }),
  outputSchema: z.union([
    z.array(z.object({ tableId: z.string(), type: z.string() })),
    z.object({ error: z.string() }),
  ]),
  execute: async ({ datasetId }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(
      `${getApiBase()}/api/datasets/${encodeURIComponent(datasetId)}/tables`,
      { headers: { Authorization: authToken } },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json();
    return Array.isArray(json) ? json : json.data;
  },
});

export const runReadOnlyQueryTool = createTool({
  id: 'run-read-only-query',
  description: 'Executes a read-only BigQuery SQL query. Always use `` on column names to avoid errors',
  inputSchema: z.object({
    query: z.string(),
    startIndex: z.number().int().min(0),
    maxResults: z.number().int().describe('must be 20, 50, or 100').refine((v) => [20, 50, 100].includes(v)),
  }),
  outputSchema: z.object({
    rows: z.array(z.record(z.string(), z.unknown())).optional(),
    totalRows: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ query, startIndex, maxResults }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(`${getApiBase()}/api/datasets/read-only-query`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, startIndex, maxResults }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json();
    const data = Array.isArray(json) ? json : json.data;
    return data;
  },
});

export const runWriteQueryTool = createTool({
  id: 'run-write-query',
  description:
    'Executes a write BigQuery SQL query. Use it to modify data and create transformations',
  requireApproval: true,
  inputSchema: z.object({
    query: z.string().describe('The write SQL query to execute'),
  }),
  outputSchema: z.object({
    affectedRows: z.number().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ query }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(`${getApiBase()}/api/datasets/write-query`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    return await res.json();
  },
});

export const createVisualizationTool = createTool({
  id: 'create-visualization',
  description:
    'Creates a data visualization from BigQuery data.',
  inputSchema: z.object({
    title: z.string(),
    dataSource: z.object({
      datasetId: z.string(),
      tableId: z.string(),
    }),
    dimension: z.string().describe('internally does a group by').optional(),
    dimensionGranularity: z.array(z.enum(['day', 'month', 'year'])).optional(),
    groupBy: z.string().optional(),
    groupByGranularity: z.array(z.enum(['day', 'month', 'year'])).optional(),
    groupByIncludeEmpty: z.boolean(),
    metrics: z.array(
      z.object({
        id: z.string(),
        operation: z.enum(['sum', 'avg', 'count', 'count_distinct', 'min', 'max']),
        column: z.string().optional(),
      }),
    ),
    orderBy: z
      .object({
        target: z.string(),
        direction: z.enum(['asc', 'desc']),
      })
      .optional(),
    visualization: z
      .object({
        type: z.enum(['bar', 'line', 'pie', 'single_metric']),
        stacked: z.boolean(),
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
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()).optional(),
  }),
  execute: async (input, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const base = getApiBase();

    const validateRes = await fetch(`${base}/api/dashboards/widget-data/validate`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!validateRes.ok) {
      const body = await validateRes.text().catch(() => '');
      return { valid: false, errors: [`Validation request failed (${validateRes.status}): ${body}`] };
    }
    const validateJson = await validateRes.json();
    const validation = validateJson.data ?? validateJson;

    return { valid: validation.valid, errors: validation.errors ?? undefined };
  },
});

export const getTableDetailsTool = createTool({
  id: 'get-table-details',
  description:
    'Gets the schema, row count, and partitioning for a table',
  inputSchema: z.object({
    datasetId: z.string(),
    tableId: z.string(),
  }),
  outputSchema: z.object({
    tableId: z.string().optional(),
    datasetId: z.string().optional(),
    description: z.string().optional(),
    schema: z.array(schemaFieldSchema).optional(),
    rowCount: z.number().nullable().optional(),
    partitioning: z
      .object({
        type: z.string(),
        field: z.string().optional(),
        requireFilter: z.boolean(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ datasetId, tableId }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const url = `${getApiBase()}/api/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`;
    const res = await fetch(url, { headers: { Authorization: authToken } });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json();
    const data = json.data ?? json;
    return {
      tableId: data.tableId,
      datasetId: data.datasetId,
      description: data.description,
      schema: data.schema,
      rowCount: data.rowCount,
      partitioning: data.partitioning,
    };
  },
});
