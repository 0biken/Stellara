# Local database tests

`pnpm db:test` runs pgTAP policy/integrity tests and the shared RuntimeStore contract suite against PostgreSQL, followed by handler integration tests. The same contract cases run against MemoryStore in the runtime package.

**Use only the disposable local Stellara database at 127.0.0.1:54322.** Node test fixtures truncate application tables between cases. Run `pnpm db:reset` afterward to restore the sample bank. HTTP handler tests use real PostgreSQL and mocked guardian identity validation; `bash scripts/m2-smoke.sh` additionally exercises real local Supabase Auth and served Edge Functions.

Coverage includes cross-family reads, consent prerequisites, protected keys/PINs, append-only writes, published content, JSON state and timestamp round trips, rollback, interval boundaries, concurrent PIN failures, refresh rotation/replay, session expiry/revocation, and concurrent idempotent response submission. Keep runtime branch coverage at or above 90%.
