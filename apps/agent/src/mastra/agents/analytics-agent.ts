import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const analyticsAgent = new Agent({
  id: 'analytics-agent',
  name: 'Analytics Agent',
  instructions: ``,
  model: 'google/gemini-3.1-pro-preview',
  tools: { },
  scorers: { },
  memory: new Memory({
    options: {
      generateTitle: {
        model: 'google/gemini-3.1-flash-lite-preview',
        instructions: 'Generate a 10 word max title',
      },
    },
  })
});
