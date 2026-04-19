import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase, widgetConfigSchema } from './shared';

export const createDashboardTool = createTool({
  id: 'create-dashboard',
  description:
    'Proposes a complete dashboard composed of multiple visualizations with grid positions.',
  inputSchema: z.object({
    title: z.string().describe('Dashboard title'),
    widgets: z
      .array(
        z.object({
          config: widgetConfigSchema,
          x: z.number().int().min(0).describe('column position in a 24-col grid'),
          y: z.number().int().min(0).describe('row position'),
          w: z.number().int().min(1).describe('width in columns (1–24)'),
          h: z.number().int().min(1).describe('height in rows'),
        }),
      )
      .min(1),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()).optional(),
  }),
  execute: async (input, context) => {
    const authToken = context?.requestContext?.get('auth-token') as string;
    const base = getApiBase();

    const validateRes = await fetch(`${base}/api/dashboards/validate-dashboard`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!validateRes.ok) {
      const body = await validateRes.text().catch(() => '');
      return { valid: false, errors: [`Validation request failed (${validateRes.status}): ${body}`] };
    }
    const validateJson = await validateRes.json() as any;
    const validation = validateJson.data ?? validateJson;

    return { valid: validation.valid, errors: validation.errors ?? undefined };
  },
});
