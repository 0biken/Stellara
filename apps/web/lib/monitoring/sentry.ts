/**
 * Sentry for the web app (docs/md/11 §5). A no-op unless NEXT_PUBLIC_SENTRY_DSN
 * is set at build time: the SDK sits in its own chunk and is only fetched when
 * a DSN exists, so builds without one ship no Sentry code on the critical path.
 *
 * Privacy (07 §6): no automatic user data, no IP address, no session replay, no
 * tracing, no console or click breadcrumbs, and every event passes scrubEvent.
 */
import { scrubBreadcrumb, scrubEvent, surfaceFromPath } from "./scrub";

export type MonitoringConfig = {
  dsn?: string | undefined;
  environment?: string | undefined;
  release?: string | undefined;
  basePath?: string | undefined;
};

export function monitoringConfigFromEnv(): MonitoringConfig {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  };
}

/** Starts Sentry when a DSN is configured. Resolves to false when it did nothing. */
export async function startMonitoring(config: MonitoringConfig): Promise<boolean> {
  if (!config.dsn || typeof window === "undefined") return false;
  const Sentry = await import("./sentry-sdk");
  Sentry.init({
    dsn: config.dsn,
    ...(config.environment ? { environment: config.environment } : {}),
    ...(config.release ? { release: config.release } : {}),
    // Collect nothing about the person automatically (SDK v11 replaces sendDefaultPii).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.httpContextIntegration(),
      Sentry.breadcrumbsIntegration({ dom: false, sentry: false }),
    ],
    tracesSampleRate: 0,
    maxBreadcrumbs: 30,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSend: (event) => scrubEvent(event),
  });
  Sentry.setTag("surface", surfaceFromPath(window.location.pathname, config.basePath));
  return true;
}

/** Keeps the `surface` tag current on client-side navigations. */
export async function tagNavigation(url: string, config: MonitoringConfig): Promise<void> {
  if (!config.dsn || typeof window === "undefined") return;
  const Sentry = await import("./sentry-sdk");
  const pathname = new URL(url, window.location.href).pathname;
  Sentry.setTag("surface", surfaceFromPath(pathname, config.basePath));
}
