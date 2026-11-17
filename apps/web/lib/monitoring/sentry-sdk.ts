// The only Sentry exports the app uses. Importing these by name (instead of
// `import("@sentry/browser")`) lets the bundler drop replay, feedback, tracing
// and the rest of the SDK from the lazily loaded monitoring chunk.
export {
  breadcrumbsIntegration,
  browserApiErrorsIntegration,
  dedupeIntegration,
  eventFiltersIntegration,
  functionToStringIntegration,
  globalHandlersIntegration,
  httpContextIntegration,
  init,
  linkedErrorsIntegration,
  setTag,
} from "@sentry/browser";
