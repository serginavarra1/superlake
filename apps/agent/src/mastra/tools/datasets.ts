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
  outputSchema: z.array(z.object({ datasetId: z.string() })),
  execute: async (_input, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(`${getApiBase()}/api/datasets/ids`, {
      headers: { Authorization: authToken },
    });
    if (!res.ok) throw new Error(`list-datasets failed: ${res.status} ${res.statusText}`);
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
  outputSchema: z.array(z.object({ tableId: z.string(), type: z.string() })),
  execute: async ({ datasetId }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(
      `${getApiBase()}/api/datasets/${encodeURIComponent(datasetId)}/tables`,
      { headers: { Authorization: authToken } },
    );
    if (!res.ok) throw new Error(`list-tables failed: ${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json) ? json : json.data;
  },
});

export const runReadOnlyQueryTool = createTool({
  id: 'run-read-only-query',
  description: 'Executes a read-only BigQuery SQL SELECT query and returns paginated results',
  inputSchema: z.object({
    query: z.string(),
    startIndex: z.number().int().min(0),
    maxResults: z.number().int().describe('must be 20, 50, or 100').refine((v) => [20, 50, 100].includes(v)),
  }),
  outputSchema: z.object({
    rows: z.array(z.record(z.string(), z.unknown())),
    totalRows: z.number(),
  }),
  execute: async ({ query, startIndex, maxResults }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const res = await fetch(`${getApiBase()}/api/datasets/read-only-query`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, startIndex, maxResults }),
    });
    if (!res.ok) throw new Error(`run-query failed: ${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json) ? json : json.data;
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
    tableId: z.string(),
    datasetId: z.string(),
    description: z.string().optional(),
    schema: z.array(schemaFieldSchema),
    rowCount: z.number().nullable(),
    partitioning: z
      .object({
        type: z.string(),
        field: z.string().optional(),
        requireFilter: z.boolean(),
      })
      .optional(),
  }),
  execute: async ({ datasetId, tableId }, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const url = `${getApiBase()}/api/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`;
    const res = await fetch(url, { headers: { Authorization: authToken } });
    if (!res.ok) throw new Error(`get-table-details failed: ${res.status} ${res.statusText}`);
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
