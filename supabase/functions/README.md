# Edge Functions

Future Deno server adapters belong here. They must validate identity, clocks and pause evidence before invoking the pure rules package. No function is deployed yet.

## Learning runtime adapters (pending 2A)

The logic for `set-start`, `responses-submit` and the scheduled jobs already lives in `packages/runtime` (`@stellara/runtime`). It is pure TypeScript, does no I/O, and is tested against an in-memory store. Each function here should stay a thin adapter:

1. Verify the child JWT (`child-session`, ADR-004) and build a `ChildContext` (`child_id`, `grownup`).
2. Construct `RuntimeDeps`: a Postgres `RuntimeStore` that uses the service role, with `transaction` mapped to one database transaction; a real `Clock`; `crypto.randomUUID` for `Ids`; and a `Rng`.
3. Call `startSet` or `submitResponses` with the raw JSON body. Request validation happens inside, using the contracts in `contracts.ts`.
4. Map a thrown `RuntimeError` to `error.toEnvelope()` with HTTP 4xx. Any other error is a 500.

pg_cron calls `closeLearningDay`, `scheduleDueReviews`, `updateItemStats` and `retentionPurgePlan` through a function or RPC, on the schedule in `CRON_JOBS` (`packages/runtime/src/jobs/schedule.ts`). The SQL adapter carries out the purge plan by dropping or anonymising partitions, because `attempts` DELETE is revoked.

`MemoryStore` (`@stellara/runtime/testing`) is the reference behaviour for the Postgres store. Every `RuntimeStore` method it implements must keep the same semantics.
