# Edge Functions

Run `pnpm supabase:prepare` to bundle the shared Edge Function entry point. Guardian
routes validate Supabase Auth tokens and check family membership. Learning routes
validate the separately signed child JWT and check the stored session and consent.

The Postgres adapter runs the existing set and scoring logic inside a transaction.
The dedicated runtime role has access to grading data. Browser responses contain
client-safe projections and the feedback allowed by the learning flow.

The database schedules partition maintenance and expired session cleanup. Other
scheduled runtime jobs are outside the M2 wiring. See the [staging runbook](../README.md).
