# M2 migrations

The CLI-generated M2 migration creates family consent/profiles, versioned content, partitioned append-only learning history, rule state, and private rotating child sessions. All public tables and partitions have RLS. Policies allow family reads and published content only; sensitive columns and answer keys have no client grants. Security-definer lookup functions live in the non-exposed private schema with explicit execution grants.

Use `pnpm db:reset` on the disposable local stack. Never edit applied production migrations; create a new migration through the CLI. Test policy changes with `pnpm db:test`. No hosted project is linked or changed.
