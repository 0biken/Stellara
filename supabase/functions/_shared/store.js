export function runtimeStore(sql) {
  const one = (rows) => rows[0] ?? null;
  const document = (rows) => one(rows)?.document ?? null;
  const documents = (rows) => rows.map((row) => row.document);
  const state = async (child, field) =>
    one(
      await sql`select ${sql(field)} from stellara_private.learning_state where child_id=${child}`,
    )?.[field] ?? null;
  const putState = (child, field, value) => sql`
    insert into stellara_private.learning_state (child_id,${sql(field)}) values (${child},${sql.json(value)})
    on conflict (child_id) do update set ${sql(field)}=excluded.${sql(field)}`;
  const items = (filter) => sql`
    select v.document || jsonb_build_object('answer',a.answer) as document
    from stellara_private.items i
    join stellara_private.item_versions v on v.item_id=i.id
    join stellara_private.item_answers a using (item_id,version)
    where v.published_at is not null and ${filter}
    order by i.id,v.version`;

  return {
    // The handler owns the transaction and the child row lock for every call.
    transaction: (fn) => fn(),
    async getChild(id) {
      return one(
        await sql`select id,created_by as guardian_id,first_name,avatar_key,timezone,
        exam_date::text, status,term_id,year,extract(epoch from last_active_at)*1000 as last_active_at
        from public.children where id=${id}`,
      );
    },
    async publishedItems(topics) {
      return documents(
        await items(
          sql`i.topic_id=any(${sql.array(topics, 2950)}::uuid[]) and i.status='published' and v.version=i.current_version`,
        ),
      );
    },
    async getItem(id, version) {
      return document(await items(sql`i.id=${id} and v.version=${version}`));
    },
    async getPublishedLesson(topic) {
      return document(
        await sql`select document from stellara_private.lessons where topic_id=${topic}
        and published_at is not null order by version desc limit 1`,
      );
    },
    async topicStrands(topics) {
      return sql`select id as topic_id,strand_code as strand_id from stellara_private.curriculum_nodes
        where id=any(${sql.array(topics, 2950)}::uuid[]) and strand_code is not null`;
    },
    insertSet: (set) => sql`insert into stellara_private.sets (id,child_id,kind,document)
      values (${set.id},${set.child_id},${set.kind},${sql.json(set)})`,
    async getSet(id) {
      return document(await sql`select document from stellara_private.sets where id=${id}`);
    },
    updateSet: (set) => sql`update stellara_private.sets set document=${sql.json(set)}
      where id=${set.id} and child_id=${set.child_id}`,
    async listChildSets(child, kind) {
      return documents(
        await sql`select document from stellara_private.sets where child_id=${child}
        ${kind ? sql`and kind=${kind}` : sql``} order by (document->>'started_at')::bigint desc,id`,
      );
    },
    async findAttempts(ids) {
      return documents(
        await sql`select a.document from stellara_private.attempt_clients c
        join stellara_private.attempts a using (client_id,received_at) where c.client_id=any(${sql.array(ids, 2950)}::uuid[])`,
      );
    },
    async setAttempts(set) {
      return documents(
        await sql`select document from stellara_private.attempts where set_id=${set} order by received_at,id`,
      );
    },
    async insertAttempts(attempts) {
      for (const a of [...attempts].sort((left, right) =>
        left.client_id.localeCompare(right.client_id),
      )) {
        const received = new Date(a.received_at).toISOString();
        await sql`insert into stellara_private.attempt_clients values (${a.client_id},${received})`;
        await sql`insert into stellara_private.attempts (received_at,id,client_id,child_id,set_id,item_id,item_version,document)
          values (${received},${a.id},${a.client_id},${a.child_id},${a.set_id},${a.item_id},${a.item_version},${sql.json(a)})`;
      }
    },
    async getMastery(child, topic) {
      return document(
        await sql`select document from stellara_private.mastery_states where child_id=${child} and topic_id=${topic}`,
      );
    },
    putMastery: (child, mastery) => sql`insert into stellara_private.mastery_states
      values (${child},${mastery.topicId},${sql.json(mastery)})
      on conflict (child_id,topic_id) do update set document=excluded.document`,
    async insertMasteryEvents(events) {
      for (const row of events) {
        await sql`insert into stellara_private.mastery_events values (${row.id},${row.child_id},${sql.json(row)})`;
      }
    },
    getStardust: (child) => state(child, "stardust"),
    putStardust: (child, value) => putState(child, "stardust", value),
    async appendLedger(entries) {
      for (const e of entries) {
        await sql`insert into stellara_private.stardust_ledger (id,child_id,learning_day,ref_id,amount,document)
        values (${e.id},${e.child_id},${e.learning_day},${e.ref_id},${e.amount},${sql.json(e)})`;
      }
    },
    async ledgerByRefs(child, ids) {
      return documents(
        await sql`select document from stellara_private.stardust_ledger
        where child_id=${child} and ref_id=any(${sql.array(ids, 25)}::text[])`,
      );
    },
    async getActivityDay(child, day) {
      return document(
        await sql`select document from stellara_private.activity_days where child_id=${child} and learning_day=${day}`,
      );
    },
    putActivityDay: (day) => sql`insert into stellara_private.activity_days
      values (${day.child_id},${day.learning_day},${sql.json(day)})
      on conflict (child_id,learning_day) do update set document=excluded.document`,
    async getStreak(child) {
      return document(
        await sql`select document from stellara_private.streak_state where child_id=${child}`,
      );
    },
    async listReviews(child) {
      return (await state(child, "reviews")) ?? [];
    },
    putReviews: (child, value) => putState(child, "reviews", value),
    putDueQueue: (child, value) => putState(child, "due_queue", value),
    async isKeyExposed(child, item) {
      return (
        (
          await sql`select 1 from stellara_private.key_exposures where child_id=${child} and item_id=${item}`
        ).length > 0
      );
    },
    async recordKeyExposure(child, itemIds) {
      for (const item of itemIds) {
        await sql`insert into stellara_private.key_exposures (child_id,item_id)
          values (${child},${item}) on conflict do nothing`;
      }
    },
  };
}

const ms = (value) => (value === null || value === undefined ? null : +new Date(value));
const reportRow = (row) => ({
  id: row.id,
  child_id: row.child_id,
  kind: row.kind,
  period_start: ms(row.period_start),
  period_end: ms(row.period_end),
  payload: row.payload,
  template_version: row.template_version,
  created_at: ms(row.created_at),
  opened_at: ms(row.opened_at),
});

/** Postgres `ReportStore` (packages/runtime/src/reports.ts). Runs as `stellara_runtime`. */
export function reportStore(sql) {
  return {
    async listActiveChildren() {
      return sql`select id,created_by as guardian_id,first_name,timezone,exam_date::text,status,
        term_id,year,extract(epoch from last_active_at)*1000 as last_active_at,
        extract(epoch from created_at)*1000 as created_at
        from public.children where status='active' order by id`;
    },
    async listMasteryLevels(child) {
      return sql`select topic_id,(document->>'level')::int as level
        from stellara_private.mastery_states where child_id=${child}`;
    },
    async masteryEventsBetween(child, start, end) {
      return (
        await sql`select document from stellara_private.mastery_events where child_id=${child}
        and (document->>'created_at')::bigint >= ${start} and (document->>'created_at')::bigint < ${end}`
      ).map((row) => row.document);
    },
    async scoredDaysBetween(child, start, end) {
      // attempts is partitioned by received_at; answers can arrive up to a week late offline.
      const from = new Date(start).toISOString();
      const to = new Date(end + 8 * 86_400_000).toISOString();
      return (
        await sql`select distinct document->>'learning_day' as day from stellara_private.attempts
        where child_id=${child} and received_at >= ${from} and received_at < ${to}
        and (document->>'scored')::boolean
        and (document->>'answered_at')::bigint >= ${start} and (document->>'answered_at')::bigint < ${end}
        order by 1`
      ).map((row) => row.day);
    },
    async pathwayTopicIds(year) {
      return (
        await sql`select id from stellara_private.curriculum_nodes
        where kind='topic' and year=${year} order by sort,id`
      ).map((row) => row.id);
    },
    async topicTitles(ids) {
      return sql`select id,title from stellara_private.curriculum_nodes
        where id=any(${sql.array(ids, 2950)}::uuid[])`;
    },
    async reportBlueprints() {
      // Only blueprints an academic lead approved; none until the 2027 format is verified.
      return (
        await sql`select document from stellara_private.test_blueprints
        where document->>'status'='approved' order by document->>'paper'`
      ).map((row) => ({ paper: row.document.paper, topicIds: row.document.topic_ids ?? [] }));
    },
    async findReport(child, kind, periodEnd) {
      const [row] = await sql`select * from stellara_private.reports where child_id=${child}
        and kind=${kind} and period_end=${new Date(periodEnd).toISOString()}`;
      return row ? reportRow(row) : null;
    },
    insertReport: (report) => sql`insert into stellara_private.reports
      (id,child_id,kind,period_start,period_end,payload,template_version,created_at)
      values (${report.id},${report.child_id},${report.kind},${new Date(report.period_start).toISOString()},
      ${new Date(report.period_end).toISOString()},${sql.json(report.payload)},${report.template_version},
      ${new Date(report.created_at).toISOString()})`,
    async listChildReports(child, limit) {
      return (
        await sql`select * from stellara_private.reports where child_id=${child}
        order by period_end desc,kind limit ${limit}`
      ).map(reportRow);
    },
    async markReportOpened(child, id) {
      const [row] =
        await sql`update stellara_private.reports set opened_at=coalesce(opened_at,now())
        where id=${id} and child_id=${child} returning *`;
      return row ? reportRow(row) : null;
    },
  };
}
