import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { MastraAuthClerk } from '@mastra/auth-clerk';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
import { analyticsAgent } from './agents/analytics-agent';
import { extractUserIdFromToken, extractOrgIdFromToken } from '../lib/jwt';

export const mastra = new Mastra({
  workflows: { },
  agents: { analyticsAgent },
  server: {
    auth: new MastraAuthClerk({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
      secretKey: process.env.CLERK_SECRET_KEY!,
      jwksUri: process.env.CLERK_JWKS_URI!,
    }),
    middleware: [
      {
        path: '/api/*',
        handler: async (c, next) => {
          const authHeader = c.req.header('Authorization');
          const userId = extractUserIdFromToken(authHeader);
          const orgId = extractOrgIdFromToken(authHeader);

          if (!userId || !orgId) {
            return c.json({ error: 'Unauthorized' }, 401);
          }

          const requestContext = c.get('requestContext');
          requestContext.set(MASTRA_RESOURCE_ID_KEY, `${orgId}:${userId}`);
          requestContext.set('auth-token', authHeader!);

          return next();
        },
      },
    ],
  },
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL!,
    schemaName: 'mastra',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
