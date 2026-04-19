import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { listDatasetsTool } from '../tools/list-datasets';
import { listTablesTool } from '../tools/list-tables';
import { getTableDetailsTool } from '../tools/get-table-details';
import { runReadOnlyQueryTool } from '../tools/run-read-only-query';
import { runWriteQueryTool } from '../tools/run-write-query';
import { createVisualizationTool } from '../tools/create-visualization';
import { createDashboardTool } from '../tools/create-dashboard';

export const analyticsAgent = new Agent({
  id: 'analytics-agent',
  name: 'Analytics Agent',
  instructions: `Your goal is to provide highly precise answers to user queries by leveraging your available tools. Your primary technology stack is BigQuery.`,
  model: 'google/gemini-3.1-pro-preview',
  tools: { listDatasetsTool, listTablesTool, getTableDetailsTool, runReadOnlyQueryTool, runWriteQueryTool, createVisualizationTool, createDashboardTool },
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
