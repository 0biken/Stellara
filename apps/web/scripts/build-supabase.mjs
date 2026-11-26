import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("../../../", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
const generated = "supabase/functions/_shared/backend.generated.js";
await build({
  absWorkingDir: path("."),
  entryPoints: ["supabase/functions/_shared/backend.js"],
  outfile: path(generated),
  bundle: true,
  platform: "neutral",
  mainFields: ["module", "main"],
  format: "esm",
  external: ["npm:*"],
  logLevel: "warning",
});
const bundle = await build({
  absWorkingDir: path("."),
  stdin: {
    contents: 'export * from "./packages/runtime/src/testing/sample-content.ts";',
    resolveDir: path("."),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const data = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const value = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const json = (v) => value(JSON.stringify(v)) + "::jsonb";
const statements = ["begin;", "set local standard_conforming_strings = on;"];
for (const [i, topic] of data.SAMPLE_TOPIC_DEFS.entries()) {
  statements.push(`insert into stellara_private.curriculum_nodes (id,kind,title,code,sort,year,strand_code)
  values (${value(topic.id)},'topic',${value(topic.title)},${value(topic.id)},${i},${value(topic.year)},${value(topic.strand_id)})
  on conflict (id) do nothing;`);
}
for (const { answer, ...item } of [
  ...data.SAMPLE_PRACTICE_ITEMS,
  ...data.SAMPLE_CHECK_ITEMS,
  ...data.SAMPLE_PLACEMENT_ITEMS,
]) {
  const id = value(item.id);
  statements.push(`insert into stellara_private.items (id,topic_id,current_version,status)
  values (${id},${value(item.topic_id)},${item.version},'published') on conflict (id) do nothing;
  insert into stellara_private.item_versions (item_id,version,document,published_at)
  select ${id},${item.version},${json(item)},${value(item.answer_verified_at)}::timestamptz where not exists
  (select 1 from stellara_private.item_versions where item_id=${id} and version=${item.version});
  insert into stellara_private.item_answers values (${id},${item.version},${json(answer)}) on conflict do nothing;`);
}
for (const { cards, ...lesson } of data.SAMPLE_LESSONS) {
  const id = value(lesson.id);
  statements.push(`insert into stellara_private.lessons (id,version,topic_id,document,published_at)
  values (${id},${lesson.version},${value(lesson.topic_id)},${json({ ...lesson, cards })},'2026-11-01T00:00:00Z')
  on conflict do nothing;`);
  for (const [i, card] of cards.entries()) {
    statements.push(
      `insert into stellara_private.lesson_cards values (${id},${lesson.version},${i},${json(card)}) on conflict do nothing;`,
    );
  }
}
statements.push("commit;");
await writeFile(path("supabase/seed/content.generated.sql"), statements.join("\n") + "\n");
