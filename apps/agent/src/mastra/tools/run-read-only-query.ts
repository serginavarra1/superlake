import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase } from './shared';

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
      const body = await res.json().catch(() => null) as any;
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json() as any;
    const data = Array.isArray(json) ? json : json.data;
    return data;
  },
});
