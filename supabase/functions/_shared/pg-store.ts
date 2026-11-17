import type { Sql, TransactionSql } from "postgres";
import type {
  RuntimeStore,
  ChildRecord,
  SetRecord,
  AttemptRecord,
  MasteryEventRecord,
  LedgerRow,
  ActivityDay,
  ItemStats,
  PublishedItem,
  MasteryState,
  StardustState,
  StreakState,
  ReviewDueTopic,
  StreakOutage,
} from "@stellara/runtime";

const timeFields = new Set([
  "started_at",
  "finished_at",
  "recorded_at",
  "received_at",
  "answered_at",
  "created_at",
  "updated_at",
  "last_active_at",
]);
const jsonFields = new Set(["items", "placement", "response", "state"]);
function decode<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      v instanceof Date
        ? timeFields.has(k)
          ? v.getTime()
          : k === "answer_verified_at"
            ? v.toISOString().replace(".000Z", "Z")
            : v.toISOString().slice(0, 10)
        : v,
    ]),
  ) as T;
}
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;

/** One instance per request. Never share its transaction-bound connection across requests. */
export class PgStore implements RuntimeStore {
  private q: Sql | TransactionSql;
  constructor(
    private readonly sql: Sql | TransactionSql,
    private readonly childId?: string,
  ) {
    this.q = sql;
  }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.q !== this.sql || !("begin" in this.sql)) return fn();
    let result!: T;
    await this.sql.begin(async (tx) => {
      this.q = tx;
      try {
        if (this.childId)
          await tx`select id from public.children where id=${this.childId} for update`;
        result = await fn();
      } finally {
        this.q = this.sql;
      }
    });
    return result;
  }
  private async rows<T>(query: string, values: unknown[] = []): Promise<T[]> {
    const rows = await this.q.unsafe(query, values as never[]);
    return rows.map((row) => decode<T>(row));
  }
  private async one<T>(query: string, values: unknown[]): Promise<T | null> {
    return (await this.rows<T>(query, values))[0] ?? null;
  }
  private async write(table: string, record: object, conflict?: string[]) {
    const entries = Object.entries(record);
    const cols = entries.map(([k]) => quote(k));
    const values = entries.map(([k, v]) =>
      v === null
        ? null
        : timeFields.has(k)
          ? new Date(v as number).toISOString()
          : jsonFields.has(k)
            ? this.q.json(v as never)
            : Array.isArray(v)
              ? this.q.array(v as string[])
              : v,
    );
    const update = conflict
      ? ` on conflict (${conflict.map(quote).join(",")}) do update set ${cols
          .filter((c) => !conflict.map(quote).includes(c))
          .map((c) => `${c}=excluded.${c}`)
          .join(",")}`
      : "";
    await this.q.unsafe(
      `insert into public.${quote(table)} (${cols.join(",")}) values (${entries.map(([key], n) => `$${n + 1}${key === "topic_ids" || key === "review_topic_ids" ? "::uuid[]" : ""}`).join(",")})${update}`,
      values as never[],
    );
  }
  getChild(id: string) {
    return this.one<ChildRecord>(
      "select id,timezone,exam_date::text,status,term_id,last_active_at from public.children where id=$1",
      [id],
    );
  }
  listActiveChildren() {
    return this.rows<ChildRecord>(
      "select id,timezone,exam_date::text,status,term_id,last_active_at from public.children where status='active' order by id",
    );
  }
  private async itemRows(where: string, params: unknown[], latest = false) {
    const rows = await this.rows<Record<string, unknown>>(
      `select ${latest ? "distinct on (v.item_id)" : ""} v.*, i.topic_id, a.answer, coalesce(s.exposure_count,0) as exposure_count from public.item_versions v join public.items i on i.id=v.item_id join public.item_answers a using(item_id,version) left join public.item_stats s on s.item_id=v.item_id where ${where} order by v.item_id,v.version desc`,
      params,
    );
    return rows.map((r) => {
      const item: Record<string, unknown> = { ...r, id: r.item_id, status: "published" };
      delete item.item_id;
      delete item.published_at;
      for (const key of ["options", "left", "right", "slots", "hint", "licence_ref"])
        if (item[key] === null) delete item[key];
      if (item.answer_verified_at instanceof Date)
        item.answer_verified_at = item.answer_verified_at.toISOString();
      return item as PublishedItem;
    });
  }
  publishedItems(ids: readonly string[]) {
    return this.itemRows(
      "i.topic_id=any($1::uuid[]) and v.status='published'",
      [this.q.array([...ids])],
      true,
    );
  }
  async getItem(id: string, version: number) {
    return (
      (
        await this.itemRows(
          "v.item_id=$1 and v.version=$2 and v.status in ('published','retired')",
          [id, version],
        )
      )[0] ?? null
    );
  }
  async topicStrands(ids: readonly string[]) {
    const rows = await this.rows<{ topic_id: string; strand_id: string }>(
      "select id as topic_id,strand_id from public.topics where id=any($1::uuid[])",
      [this.q.array([...ids])],
    );
    return ids.flatMap((id) => rows.filter((r) => r.topic_id === id));
  }
  insertSet(set: SetRecord) {
    return this.write("sets", set);
  }
  getSet(id: string) {
    return this.one<SetRecord>("select * from public.sets where id=$1", [id]);
  }
  updateSet(set: SetRecord) {
    return this.write("sets", set, ["id"]);
  }
  findAttempts(ids: readonly string[]) {
    return this.rows<AttemptRecord>(
      "select * from public.attempts where client_id=any($1::uuid[]) order by received_at,id",
      [this.q.array([...ids])],
    );
  }
  setAttempts(id: string) {
    return this.rows<AttemptRecord>(
      "select * from public.attempts where set_id=$1 order by received_at,id",
      [id],
    );
  }
  async insertAttempts(rows: readonly AttemptRecord[]) {
    await this.transaction(async () => {
      for (const row of rows) {
        await this.write("attempt_client_ids", {
          client_id: row.client_id,
          child_id: row.child_id,
          received_at: row.received_at,
        });
        await this.write("attempts", row);
      }
    });
  }
  attemptsReceivedBetween(start: number, end: number) {
    return this.rows<AttemptRecord>(
      "select * from public.attempts where received_at >= $1 and received_at < $2 order by received_at,id",
      [new Date(start).toISOString(), new Date(end).toISOString()],
    );
  }
  async getMastery(c: string, t: string) {
    return (
      (
        await this.one<{ state: MasteryState }>(
          "select state from public.mastery_states where child_id=$1 and topic_id=$2",
          [c, t],
        )
      )?.state ?? null
    );
  }
  putMastery(c: string, state: MasteryState) {
    return this.write(
      "mastery_states",
      {
        child_id: c,
        topic_id: state.topicId,
        level: state.level,
        scored_count: state.evidence.length,
        updated_at: Date.now(),
        state,
      },
      ["child_id", "topic_id"],
    );
  }
  async insertMasteryEvents(rows: readonly MasteryEventRecord[]) {
    for (const row of rows) await this.write("mastery_events", row);
  }
  async getStardust(c: string) {
    return (
      (
        await this.one<{ state: StardustState }>(
          "select state from public.stardust_state where child_id=$1",
          [c],
        )
      )?.state ?? null
    );
  }
  putStardust(c: string, state: StardustState) {
    return this.write("stardust_state", { child_id: c, total: state.total, state }, ["child_id"]);
  }
  async appendLedger(rows: readonly LedgerRow[]) {
    for (const row of rows) await this.write("stardust_ledger", row);
  }
  ledgerByRefs(c: string, refs: readonly string[]) {
    return this.rows<LedgerRow>(
      "select * from public.stardust_ledger where child_id=$1 and ref_id=any($2::text[]) order by created_at,id",
      [c, this.q.array([...refs])],
    );
  }
  getActivityDay(c: string, d: string) {
    return this.one<ActivityDay>(
      "select * from public.activity_days where child_id=$1 and learning_day=$2",
      [c, d],
    );
  }
  putActivityDay(day: ActivityDay) {
    return this.write("activity_days", day, ["child_id", "learning_day"]);
  }
  async getStreak(c: string) {
    return (
      (
        await this.one<{ state: StreakState }>(
          "select state from public.streaks where child_id=$1",
          [c],
        )
      )?.state ?? null
    );
  }
  putStreak(c: string, state: StreakState) {
    return this.write("streaks", { child_id: c, run_length: state.run, state }, ["child_id"]);
  }
  listReviews(c: string) {
    return this.rows<ReviewDueTopic>(
      'select topic_id as "topicId",due_day::text as "dueDay" from public.reviews where child_id=$1 and kind=\'scheduled\' order by ordinal',
      [c],
    );
  }
  private async replaceReviews(c: string, rows: readonly ReviewDueTopic[], kind: string) {
    await this.transaction(async () => {
      await this.q`delete from public.reviews where child_id=${c} and kind=${kind}`;
      for (const [ordinal, r] of rows.entries())
        await this.write("reviews", {
          child_id: c,
          topic_id: r.topicId,
          due_day: r.dueDay,
          kind,
          ordinal,
        });
    });
  }
  putReviews(c: string, r: readonly ReviewDueTopic[]) {
    return this.replaceReviews(c, r, "scheduled");
  }
  putDueQueue(c: string, r: readonly ReviewDueTopic[]) {
    return this.replaceReviews(c, r, "due_queue");
  }
  async outagesBetween(start: number, end: number): Promise<StreakOutage[]> {
    const rows = await this
      .q`select starts_at,ends_at from public.outages where ends_at>${new Date(start)} and starts_at<${new Date(end)} order by starts_at`;
    return rows.map((r) => ({
      start: new Date(r.starts_at).getTime(),
      end: new Date(r.ends_at).getTime(),
    }));
  }
  getItemStats(id: string) {
    return this.one<ItemStats>("select * from public.item_stats where item_id=$1", [id]);
  }
  putItemStats(s: ItemStats) {
    return this.write("item_stats", s, ["item_id"]);
  }
}
