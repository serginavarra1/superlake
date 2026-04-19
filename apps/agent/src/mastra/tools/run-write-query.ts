import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase } from './shared';

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
      const body = await res.json().catch(() => null) as any;
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    return await res.json();
  },
});
