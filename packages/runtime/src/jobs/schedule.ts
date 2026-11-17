/**
 * The pg_cron table from docs/md/04 §10. Times are Africa/Lagos (UTC+1, no DST);
 * `cron_utc` is what the migration registers, because pg_cron runs in UTC.
 */
export const CRON_JOBS = [
  { name: "retention-purge", lagos: "Daily 01:00", cron_utc: "0 0 * * *" },
  { name: "update-item-stats", lagos: "Daily 02:00", cron_utc: "0 1 * * *" },
  { name: "close-learning-day", lagos: "Daily 03:05", cron_utc: "5 2 * * *" },
  { name: "schedule-due-reviews", lagos: "Daily 03:15", cron_utc: "15 2 * * *" },
  { name: "report-weekly", lagos: "Sunday 18:00", cron_utc: "0 17 * * 0" },
  { name: "finalise-practice-tests", lagos: "Every 5 minutes", cron_utc: "*/5 * * * *" },
] as const;
export type CronJobName = (typeof CRON_JOBS)[number]["name"];
