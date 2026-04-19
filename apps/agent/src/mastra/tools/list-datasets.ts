import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase } from './shared';

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
      const body = await res.json().catch(() => null) as any;
      const message = body?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
      return { error: message };
    }
    const json = await res.json() as any;
    return Array.isArray(json) ? json : json.data;
  },
});
