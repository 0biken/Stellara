# Stellara Supabase staging

This stack serves the M2 family journey with synthetic data. Use Supabase CLI
2.95.0 to match CI.

## Local setup

1. Start Docker and install workspace dependencies with `pnpm install --frozen-lockfile`.
2. Run `pnpm supabase:prepare` to bundle the server runtime and generate sample SQL.
3. Create `supabase/functions/.env` from the example and set two independent random
   secrets of at least 32 bytes. Run `supabase start` from the repository root.
4. Set the web app's `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using `supabase status`. Run `pnpm dev`.
5. Open the local email capture UI listed by `supabase status`. Sign in with a
   synthetic email and create a child through the family UI.

On a disposable local stack, `supabase db reset --local` rebuilds the database with
sample content. Run `supabase test db` for pgTAP. The HTTP test at
`supabase/tests/live-family.test.mjs` creates synthetic accounts using
`STELLARA_TEST_URL`, `STELLARA_TEST_PUBLISHABLE_KEY`, and `STELLARA_TEST_SERVICE_KEY`
from the local stack. Run it with `node --test supabase/tests/live-family.test.mjs`.

## Hosted staging rollout

1. Verify that the project reference belongs to dedicated staging. Enable Google OAuth
   and outbound email. Allow the staging web app's exact `/auth/callback/` URL
   and configure the provider callback on the Google side.
2. Run `pnpm supabase:prepare`, link the staging project, review
   `supabase db push --dry-run`, and apply with `supabase db push --include-seed`.
   The seed contains sample content. Test families are created through Auth.
3. Give a dedicated Postgres login permission to `SET ROLE stellara_runtime` without
   inheriting it. Set its TLS transaction-pooler URL as `STELLARA_RUNTIME_DB_URL`.
   Set `STELLARA_ENV=staging`, `STELLARA_WEB_ORIGINS` to the staging web origin, and
   `STELLARA_STAGING_TEST_EMAILS` to the comma-separated verified test accounts.
   Store the PIN pepper and JWT secret in Edge Function secrets. Deploy with
   `supabase functions deploy --project-ref <staging-ref> --use-api`.
4. Deploy the frontend with the staging URL and publishable key. Verify both
   sign-in methods. With a synthetic child, complete a practice set, reload to
   check persistence, replay a response, then withdraw consent and verify the
   previously issued token is rejected. Check partition scheduling in the dashboard.

Production consent depends on the approved guardian verification method. Device
refresh, phone OTP, billing, pack delivery, and data-rights fulfillment are outside M2.
