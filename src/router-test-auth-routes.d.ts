import type { Route as RootRoute } from './routes/__root';
import type { Route as AgentAuthRoute } from './routes/api/test/agent-auth';
import type { Route as E2EAuthRoute } from './routes/api/test/e2e-auth';

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/api/test/agent-auth': {
      id: '/api/test/agent-auth';
      path: '/api/test/agent-auth';
      fullPath: '/api/test/agent-auth';
      preLoaderRoute: typeof AgentAuthRoute;
      parentRoute: typeof RootRoute;
    };
    '/api/test/e2e-auth': {
      id: '/api/test/e2e-auth';
      path: '/api/test/e2e-auth';
      fullPath: '/api/test/e2e-auth';
      preLoaderRoute: typeof E2EAuthRoute;
      parentRoute: typeof RootRoute;
    };
  }
}
