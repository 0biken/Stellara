# Database tests

Run `supabase test db` on the seeded local stack for the RLS and constraint checks.
Run the HTTP integration test separately as described in the [staging runbook](../README.md).

Run `node --test supabase/tests/permissions.test.mjs` for staff permission unit tests.
For the upgrade regression, set `STELLARA_TEST_DB_CONTAINER` to `supabase_db_stellara`
(or `supabase_db_stellara_proof`) and run `node --test supabase/tests/migrations.test.mjs`.
It applies the actual migration to legacy request fixtures inside a rolled-back
transaction on that synthetic local stack. It requires a running Docker engine;
it deliberately fails rather than silently skipping when the stack is unavailable.
