import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("data request upgrade preserves legacy deletions and permits subsequent exports", () => {
  const container = process.env.STELLARA_TEST_DB_CONTAINER;
  assert.match(container ?? "", /^supabase_db_stellara(?:_proof)?$/, "Use a synthetic local stack");
  const migration = readFileSync(
    new URL("../migrations/20261119030000_data_requests_and_consent_expiry.sql", import.meta.url),
    "utf8",
  );
  // All fixture DDL and the actual migration are rolled back, including on failure.
  const input = `begin;
    drop table public.data_requests;
    create table public.data_requests (
      guardian_id uuid, child_id uuid, kind text check (kind in ('export','delete')),
      status text, download_expires_at timestamptz
    );
    insert into public.data_requests values
      ('fd000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000002','delete','pending',null),
      ('fd000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000002','export','completed',null);
    ${migration}
    do $$ begin
      if not exists (select from public.data_requests where kind='deletion') then
        raise exception 'Legacy deletion request was lost';
      end if;
    end $$;
    insert into public.data_requests values
      ('fd000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000002','export','pending',null);
    rollback;`;
  execFileSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    {
      input,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
});
