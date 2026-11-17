// Runs before the app becomes interactive. Error monitoring only; see lib/monitoring.
import { monitoringConfigFromEnv, startMonitoring, tagNavigation } from "./lib/monitoring/sentry";

const config = monitoringConfigFromEnv();

startMonitoring(config).catch(() => {
  // Monitoring must never break the app.
});

export function onRouterTransitionStart(url: string) {
  tagNavigation(url, config).catch(() => {});
}
