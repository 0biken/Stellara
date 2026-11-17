import type { Sql } from "postgres";
import type { StoreHarness } from "@stellara/runtime/testing";
import { PgStore } from "../functions/_shared/pg-store.js";

export function createHarness(sql: Sql): StoreHarness {
  const guardian = "eeeeeeee-0000-4000-8000-000000000001";
  return {
    store: new PgStore(sql),
    async reset() {
      // Tests require the disposable local stack. Rollback tests never use this cleanup path.
      const port = (await sql`select inet_server_port() as port`)[0]?.port;
      if (!port) throw new Error("Expected a TCP local database");
      await sql.begin(async (tx) => {
        await tx`grant truncate on all tables in schema public to postgres`;
        await tx`truncate public.profiles,public.topics,public.outages cascade`;
        await tx`revoke truncate on public.attempts,public.stardust_ledger from postgres`;
        await tx`do $$ declare r record; begin
          for r in select inhrelid::regclass as rel from pg_inherits where inhparent='public.attempts'::regclass loop
            execute format('revoke truncate on %s from postgres',r.rel);
          end loop;
        end $$`;
      });
      await sql`delete from auth.users where id=${guardian}`;
      await sql`insert into auth.users(id,email) values(${guardian},'contract@example.test')`;
      await sql`insert into public.consents(guardian_id,notice_version,purposes,method,declared_adult,verified_at) values(${guardian},'test','{"core_learning":true}','declaration_v0',true,now())`;
    },
    async seedChild(c) {
      await sql`insert into public.children(id,guardian_id,first_name,avatar_key,year,pin_hash,timezone,exam_date,status,term_id,last_active_at)
        values(${c.id},${guardian},'Test','star',5,'test-hash',${c.timezone},${c.exam_date},${c.status},${c.term_id},${c.last_active_at === null ? null : new Date(c.last_active_at)})`;
    },
    async seedItems(items, strands = {}) {
      await sql.begin(async (tx) => {
        for (const item of items) {
          await tx`insert into public.topics(id,code,title,year,strand_id) values(${item.topic_id},${item.topic_id},'Test',5,${strands[item.topic_id] ?? "number"}) on conflict(id) do nothing`;
          await tx`insert into public.items(id,topic_id,current_version,status) values(${item.id},${item.topic_id},${item.version},'published') on conflict(id) do update set current_version=greatest(items.current_version,excluded.current_version)`;
          const body = item as unknown as Record<string, unknown>;
          await tx`insert into public.item_versions(item_id,version,type,stem,options,"left","right",slots,explanation,hint,difficulty,tags,stimulus_id,media,curriculum_edition,provenance,licence_ref,author_id,reviewer_id,answer_verified_at,status)
        values(${item.id},${item.version},${item.type},${item.stem},${tx.json((body.options ?? null) as never)},${tx.json((body.left ?? null) as never)},${tx.json((body.right ?? null) as never)},${tx.json((body.slots ?? null) as never)},${item.explanation},${item.hint ?? null},${item.difficulty},${tx.array(item.tags)},${item.stimulus_id},${tx.json(item.media)},${item.curriculum_edition},${item.provenance},${item.licence_ref ?? null},${item.author_id},${item.reviewer_id},${item.answer_verified_at},'published')`;
          await tx`insert into public.item_answers(item_id,version,answer) values(${item.id},${item.version},${tx.json(item.answer)})`;
        }
      });
    },
    async seedOutage(o) {
      await sql`insert into public.outages(starts_at,ends_at) values(${new Date(o.start)},${new Date(o.end)})`;
    },
  };
}
