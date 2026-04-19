import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase, schemaFieldSchema } from './shared';

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
      const body = await res.json().catch(() => null) as any;
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json() as any;
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
