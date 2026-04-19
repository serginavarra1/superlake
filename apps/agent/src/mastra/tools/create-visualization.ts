import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getApiBase, widgetConfigSchema } from './shared';

export const createVisualizationTool = createTool({
  id: 'create-visualization',
  description:
    'Creates a data visualization from BigQuery data.',
  inputSchema: widgetConfigSchema,
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
    const validateJson = await validateRes.json() as any;
    const validation = validateJson.data ?? validateJson;

    return { valid: validation.valid, errors: validation.errors ?? undefined };
  },
});
