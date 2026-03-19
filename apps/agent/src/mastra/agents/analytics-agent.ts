import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { listDatasetsTool, listTablesTool, getTableDetailsTool, runReadOnlyQueryTool, runWriteQueryTool, createVisualizationTool } from '../tools/datasets';

export const analyticsAgent = new Agent({
  id: 'analytics-agent',
  name: 'Analytics Agent',
  instructions: `Your goal is to provide highly precise answers to user queries by leveraging your available tools. Your primary technology stack is BigQuery. Explain everything you do.`,
  model: 'google/gemini-3.1-pro-preview',
  tools: { listDatasetsTool, listTablesTool, getTableDetailsTool, runReadOnlyQueryTool, runWriteQueryTool, createVisualizationTool },
  scorers: { },
  memory: new Memory({
    options: {
      lastMessages: 30,
      generateTitle: {
        model: 'google/gemini-3.1-flash-lite-preview',
        instructions: 'Generate a 10 word max title',
      },
    },
  }),
  maxRetries: 2,
});
