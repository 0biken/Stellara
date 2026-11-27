# Monitoring and alerting runbook

Implements [11 §5](../md/11-devops-and-environments.md#5-monitoring-and-alerting) and TASKLIST 2.38. The web app's error reporting is built. The uptime, latency, sync-backlog, messaging and cost alerts are written down here so they can be switched on the day their targets exist (Phase 2A/2B): there are no Edge Functions or Supabase projects yet.

Status key: **Live** = in the code now. **Ready** = configuration written below, waiting for its target. **Waits for 2A/2B** = needs something that does not exist yet.

## 1. Errors: Sentry (Live, off until a DSN is set)

**Code:** `apps/web/instrumentation-client.ts` → `apps/web/lib/monitoring/sentry.ts` → `scrub.ts`.

- **Off by default.** With no `NEXT_PUBLIC_SENTRY_DSN` at build time nothing initialises and the SDK chunk (about 30 KB gzip) is never downloaded. Local builds, CI and forks send nothing.
- **Same origin.** The SDK is bundled and served from our own origin. It is the only third-party service the logged-in screens talk to (07 §6, 09 §3.7). The CSP `connect-src` allows the DSN's ingest origin only when a DSN is set.
- **What is never sent:**
  - Identity: no `user`, no IP address (`dataCollection.userInfo: false`), no cookies, no headers except User-Agent, no request bodies, no query strings or URL fragments (auth callbacks carry codes there).
  - Names, answers, emails, phone numbers, PINs and join codes: any key containing words such as `name`, `email`, `phone`, `answer`, `response`, `choice`, `pin`, `code`, `token`, `note`, `child` or `user` becomes `[Filtered]` at any depth. Free text (messages, exception values, breadcrumb messages) has emails, phone-like numbers, UUIDs and quoted strings replaced.
  - Behaviour: no session replay, no tracing, no click or console breadcrumbs (selectors and logs can contain names). Only navigation and fetch breadcrumbs, with scrubbed URLs.
  - Stack frames: no local variables, no source context lines.
- **Alert routing.** Every event has a `surface` tag (`child`, `family`, `studio`, `ops`, `basic`, `auth`, `public`) taken from the first path segment; `/admin` counts as `ops`. The path itself is not sent.
- **Tests:** `apps/web/tests/monitoring.test.ts` proves the scrubbing and the no-DSN no-op.

### Turning it on

1. Create a Sentry organisation in the **EU (Frankfurt) region**, then one project per environment: `stellara-web-staging` and `stellara-web-production`. Record the data residency in the DPIA (07 §1, TASKLIST 3.1).
2. In each project's **Security & Privacy** settings, turn on *Data Scrubber*, *Use Default Scrubbers* and *Prevent Storing of IP Addresses*. Add `name, email, phone, answer, pin, code, token` to *Additional Sensitive Fields*. The server-side scrubbers back up the client-side ones.
3. Set the GitHub environment variables (they are public by design; a DSN is not a secret):
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `NEXT_PUBLIC_SENTRY_ENVIRONMENT` = `staging` or `production`
   - `NEXT_PUBLIC_SENTRY_RELEASE` is set by CI to the commit SHA.
4. Alert rules:
   - **New issue in the child runtime → Slack** `#stellara-alerts`: *A new issue is created* AND tag `surface` equals `child`.
   - **Error rate > 2% → on-call**: a metric alert on `count()` of errors ÷ sessions over 10 minutes. This needs sessions. If we add `browserSessionIntegration` for it, review it against 07 §6 first (it sends no personal data, but it is a new data flow for the DPIA).
5. Check it works: deploy to staging, run `throw new Error("sentry check")` from the browser console on `/family/`, and confirm the event arrives with no user, no IP and a `surface: family` tag.

Source maps are not uploaded yet. Stack traces show minified frames until we add `sentry-cli sourcemaps upload` to the deploy job. Do that before the pilot.

## 2. Uptime (Ready; waits for 2A)

Tool: an uptime monitor with 1-minute checks from at least one African and one European location (for example Better Stack, or UptimeRobot with a Lagos or Johannesburg probe).

| Check | URL | Expect | Alert |
|---|---|---|---|
| App shell | `https://app.<domain>/` | 200, body contains `Stellara` | 2 consecutive failures → on-call |
| Basic mode | `https://app.<domain>/basic/` | 200 | 2 consecutive failures → on-call |
| Functions health | `https://<project>.supabase.co/functions/v1/health` | 200 within 2 s | 2 consecutive failures → on-call |
| Auth | `https://<project>.supabase.co/auth/v1/health` | 200 | 2 consecutive failures → on-call |

**Waits for 2A:** a `health` Edge Function that does a `select 1` and returns the build SHA. Add it with the first functions.

## 3. Function latency (waits for 2A)

**Alert:** `responses-submit` p95 > **800 ms** for **10 minutes** → on-call.

When the function exists:

1. Each function logs one structured line per request: `{ fn, request_id, status, duration_ms }`. No personal data (07 §6).
2. Supabase dashboard → **Logs → Edge Functions**, query:

   ```sql
   select
     timestamp_trunc(timestamp, minute) as minute,
     approx_quantiles(cast(json_value(event_message, '$.duration_ms') as int64), 100)[offset(95)] as p95_ms
   from function_logs
   where json_value(event_message, '$.fn') = 'responses-submit'
     and timestamp > timestamp_sub(current_timestamp(), interval 10 minute)
   group by minute
   order by minute desc
   ```

3. Turn it into an alert. Either use a Supabase log drain to the uptime/alerting tool with a threshold rule, or use a scheduled `pg_cron` job that runs the query every 5 minutes and posts to the on-call webhook when every minute in the window is over 800 ms.
4. Use the same pattern for `practice-test-submit` and `sync-batch` once they exist, with thresholds from 06.

## 4. Sync backlog (waits for 2B)

**Alert:** p95 of `events.sync_completed.max_delay_s` > **6 h** during learning hours (every day, 07:00–21:00 Lagos; families practise after school and at weekends) → Slack, then on-call if it lasts 2 hours. Build it on the first-party `events` table (TASKLIST 2.39) as a scheduled query, like §3.

## 5. Messaging (waits for 2F)

**Alert:** a failure rate > **5%** over 1 hour in `messages.status` → Slack. Also watch the provider dashboard (WhatsApp/SMS) for sender ID or template rejections.

## 6. Cost (Ready; set up when each account is created)

Set an alert at **80% of the monthly budget** on each account, sent to the founders' finance inbox and Slack:

| Account | Where |
|---|---|
| Supabase | Organisation → Billing → Spend cap off, usage alerts on (compute, database size, egress) |
| Vercel | Team → Settings → Billing → Spend Management, at 80% |
| WhatsApp / SMS provider | Provider console balance or usage alert |
| Sentry | Subscription → Spike protection on; usage alert at 80% |
| GitHub Actions | Billing → Spending limit (keep it at $0 for private-repo overage until reviewed) |

Write each budget figure here when it is agreed:

| Account | Monthly budget (₦/$) | 80% alert set? |
|---|---|---|
| Supabase | — | No |
| Vercel | — | No |
| Messaging | — | No |
| Sentry | — | No |

## 7. Outages and streaks

When an outage is longer than 2 hours in a learning day, add a row to `outages` so days in a row are excused (02 §7). Then follow the incident steps in 11 §6.
