import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase } from './shared';

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
      const body = await res.json().catch(() => null) as any;
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json() as any;
    return Array.isArray(json) ? json : json.data;
  },
});
