# Content Pipeline Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small command-line pipeline that turns a teacher's topic brief into AI-drafted, machine-checked, human-reviewed question and lesson drafts, and run it on the three Mathematics pilot topics to measure review time.

**Architecture:** A new private workspace package, `packages/content-pipeline`, with one Node CLI. It reads a brief, asks Claude for a draft through structured outputs, converts the result into the existing `@stellara/content-schema/server` draft shapes, runs automated checks, writes a review sheet for a named reviewer, applies their decisions and summarises timing. Files live on disk under the git-ignored `private/content-pilot/`. Nothing is published and nothing reaches children: publication stays with the content studio (task 2.32).

**Tech Stack:** TypeScript (strict, NodeNext, repo `tsconfig.base.json`), Zod `4.6.7`, `@anthropic-ai/sdk` (exact pin), Vitest `5.1.0`, pnpm workspace and Turborepo.

**Spec:** [03 Curriculum and content](../../md/03-curriculum-and-content.md) (§4 schema, §5 volume, §6 checks, §8 style guide), [Content sourcing checklist](../../authoring/content-sourcing-checklist.md) (pilot batch, Section C brief template, gates B and G), [08 §10 Voice](../../md/08-design-system.md#10-voice-in-the-interface). Decisions from the 26 Nov 2026 chat: a small pipeline, not a CMS; AI drafts, a person verifies every answer; pilot first, then decide how far to scale.

## Global Constraints

- AI is used only by staff, offline. No pipeline module may be imported by `apps/web`, `packages/ui/src` or `packages/i18n/src` (enforced in Task 1).
- Never send child data or contributor names to the API. A brief's `filled_by` field is never put in a prompt.
- Content files (briefs, batches, reviews) live under `private/content-pilot/`, which is git-ignored. Never commit real briefs or drafts. Tests use synthetic fixtures only.
- Model: `claude-opus-5-5`, adaptive thinking (omit `thinking`), `output_config.effort: "high"`, `max_tokens: 16000`, non-streaming.
- Draft output is never `published`. Draft items have `version: 1`, `status: "draft"`, and no `provenance` until counsel decides G3 (the check report states "provenance pending counsel (G3)").
- `author_id` is the named author of record (G1) passed on the command line; `reviewer_id` must differ (UUIDs compared lowercase, as `uuidSchema` already does).
- Style rules to encode in the prompt (03 §8, 08 §10): Nigerian names, places and ₦ across regions, no stereotypes; one idea per stem; no double negatives or trick questions; distractors from real misconceptions, each with a one-line "why someone might pick this" note; original content, never copied from past papers; Auntie Stella lines ≤ 15 words for ages 8–12; never say: weak areas, failed, you are ready, guaranteed score, hurry, expo, runz, live questions, official JAMB/NECO, AI tutor.
- Pilot shape per topic (checklist "First Mathematics batch"): exactly 3 `practice` items, one each `easy`, `standard`, `hard`; 1–3 `lesson_check` items; one lesson of 3–6 cards with at least one `check` or `try_it` card. Pilot item types: `single_choice`, `numeric`, `ordering`.
- Proposed reading limit, pending academic decision B6: `MAX_SENTENCE_WORDS = 20`, warning only.
- Any real API run spends money: get the user's yes before Task 7 Step 3.

## Review Focus

1. **Two options both equal the correct value, or none does** (a model slip that makes an item unanswerable): the check must report an error, not a pass. Test in Task 3.
2. **The model returns a lesson card that references an item key it never defined, or repeats a key**: conversion fails with a message naming the key, and no batch file is written. Test in Task 2.
3. **Re-running `draft` on a topic folder a reviewer has already started**: the command refuses rather than overwriting `review.json`. Test in Task 5.
4. **A reviewer approves without ticking answer-verified, or uses the author's UUID in different letter case**: `apply-review` refuses the whole file and changes nothing. Test in Task 6.
5. **The API refuses, hits `max_tokens`, or returns unparseable output**: `draft` throws `DraftError` with the stop reason, and writes nothing. Test in Task 5.

---

### Task 1: Package scaffold, brief and model-output schemas, boundary rule

**Files:**
- Create: `packages/content-pipeline/{package.json,tsconfig.json,tsconfig.test.json,vitest.config.ts}` (copy the `packages/content-schema` versions; `package.json` name `@stellara/content-pipeline`, `"private": true`, `"type": "module"`, `bin`-free, scripts `build`, `typecheck`, `test` as in content-schema plus `"pipeline": "node dist/cli.js"`; dependencies `@stellara/content-schema: "workspace:*"`, `zod: "4.6.7"`)
- Create: `packages/content-pipeline/src/schemas.ts`
- Create: `packages/content-pipeline/tests/fixtures.ts` (synthetic brief and model draft for `mathematics.s1.t1`)
- Create: `packages/content-pipeline/tests/schemas.test.ts`
- Modify: `turbo.json` — add `"@stellara/content-pipeline#test": { "dependsOn": ["^build"], "outputs": [] }` (tests import the built content-schema `dist`)
- Modify: `scripts/check-boundaries.mjs` — add `@stellara\/content-pipeline(?:\/|$)|(?:^|\/)packages\/content-pipeline\/` to the forbidden delivery import regex
- Modify: `scripts/boundaries.test.mjs` — one test
- Modify: `.gitignore` — confirm `private/` is present (it is); no change expected

**Interfaces:**
- Produces (`src/schemas.ts`):
  - `topicBriefSchema`, `type TopicBrief` — `{ topic_code: string /^[a-z_]+\.s\d+\.t\d+$/, objectives: string[] (min 1), in_scope: string, out_of_scope: string, common_mistakes: { mistake: string; why: string }[] (min 2), method: string, key_words: string[], example_questions: { easy: string; standard: string; hard: string }, exam_angle: string, sources: { title: string; edition: string; pages: string; reuse: "yes" | "no" | "unknown" }[], filled_by?: string }`. All strings trimmed, non-empty.
  - `modelDraftSchema`, `type ModelDraft` — the shape Claude must return. Use `nullable`, not `optional`, and no unions, so it is structured-output friendly:
    `{ items: ModelItem[]; lesson: { title: string; cards: ModelCard[] } }`
    `ModelItem = { key: string; purpose: "practice" | "lesson_check"; type: "single_choice" | "numeric" | "ordering"; difficulty: "easy" | "standard" | "hard"; stem: string; options: { id: string; text: string }[]; correct_option_id: string | null; correct_order: string[]; numeric_answer: string | null; explanation: string; hint: string; distractor_notes: { option_id: string; why: string }[]; check_expression: string | null }`
    `ModelCard = { kind: "explain" | "worked_example" | "check" | "try_it" | "summary"; body: string | null; steps: string[]; item_keys: string[] }`
  - `PROMPT_VERSION = "pilot-1"`, `MAX_SENTENCE_WORDS = 20`.

- [ ] **Step 1: Write failing tests** in `tests/schemas.test.ts`:
  - `accepts the synthetic place-value brief` — `topicBriefSchema.parse(brief).topic_code === "mathematics.s1.t1"`.
  - `rejects a brief with fewer than two common mistakes` — `safeParse(...).success === false`.
  - `rejects a malformed topic code` — `"Maths 1"` fails.
  - `accepts the synthetic model draft` — `modelDraftSchema.parse(modelDraft).items.length === 4`.
  And in `scripts/boundaries.test.mjs`: `web import boundary rejects the content pipeline` — a temp `apps/web/x.ts` importing `@stellara/content-pipeline` yields one error.
- [ ] **Step 2: Run** `pnpm install` then `pnpm --filter @stellara/content-pipeline test` and `node --test scripts/boundaries.test.mjs`. Expected: FAIL (module not found / boundary test fails).
- [ ] **Step 3: Implement** the package files, `src/schemas.ts` and the boundary regex change.
- [ ] **Step 4: Run** the same commands plus `pnpm --filter @stellara/content-pipeline typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): scaffold package with brief and draft schemas`.

### Task 2: Convert a model draft into a schema-valid draft batch

**Files:**
- Create: `packages/content-pipeline/src/curriculum.ts`
- Create: `packages/content-pipeline/src/batch.ts`
- Test: `packages/content-pipeline/tests/batch.test.ts`

**Interfaces:**
- Consumes: `ModelDraft`, `PROMPT_VERSION` (Task 1); `draftItemSchema`, `draftLessonSchema`, `DraftItem`, `DraftLesson` from `@stellara/content-schema/server`; `validateCurriculum` from `@stellara/content-schema/curriculum`.
- Produces:
  - `loadCurriculum(path?: URL): Curriculum` — default `new URL("../../content-schema/data/curriculum-draft.json", import.meta.url)`.
  - `findTopic(curriculum: Curriculum, code: string): { id: string; title: string; curriculum_edition: "legacy" | "revised_2025" }` — throws `Error("Unknown topic code: <code>")`.
  - `type ItemNote = { key: string; distractor_notes: { option_id: string; why: string }[]; check_expression: string | null }`
  - `type DraftBatch = { batch_version: 1; topic_code: string; topic_id: string; drafting: { model: string; prompt_version: string; drafted_at: string; brief_sha256: string }; items: DraftItem[]; lesson: DraftLesson; notes: Record<string, ItemNote> }` (`notes` keyed by item UUID)
  - `toDraftBatch(input: { draft: ModelDraft; topic: ReturnType<typeof findTopic>; topicCode: string; authorId: string; model: string; briefSha256: string; now: Date; newId?: () => string }): DraftBatch` — `newId` defaults to `crypto.randomUUID`.

Mapping rules: each item gets a new UUID, `version: 1`, `status: "draft"`, `topic_id`, `curriculum_edition` from the topic, `author_id`, `stimulus_id: null`, `tags: []`, `media: []`, `exposure_count: 0`. `single_choice` → `answer: { option_id: correct_option_id }`; `numeric` → `answer: { value: numeric_answer }` and no options; `ordering` → `answer: { option_ids: correct_order }`. Lesson cards: `explain`/`summary` → `{ kind, body }`; `worked_example` → `{ kind, body, steps }`; `check` → `{ kind, item_id }` from its single key; `try_it` → `{ kind, item_ids }`. Parse every item and the lesson through the server draft schemas before returning.

- [ ] **Step 1: Write failing tests:**
  - `finds the place value topic` — `findTopic(loadCurriculum(), "mathematics.s1.t1").id === "72000000-0000-4000-8000-000000000004"`.
  - `maps the synthetic draft into four draft items and a lesson` — with a counter `newId`, items have `status "draft"`, `version 1`, the topic id, the author id; the lesson's `check` card `item_id` equals the UUID given to the `lesson_check` key.
  - `maps a numeric answer to a canonical value` — a `numeric_answer: "4000"` item yields `answer: { value: "4000" }`.
  - `rejects a card that references an undefined key` — throws with message containing `"unknown item key"` and the key.
  - `rejects duplicate item keys` — throws containing `"duplicate item key"`.
- [ ] **Step 2: Run** `pnpm --filter @stellara/content-pipeline test -- batch`. Expected: FAIL.
- [ ] **Step 3: Implement** `curriculum.ts` and `batch.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): convert model drafts to schema draft batches`.

### Task 3: Arithmetic machine check

**Files:**
- Create: `packages/content-pipeline/src/arithmetic.ts`
- Test: `packages/content-pipeline/tests/arithmetic.test.ts`

**Interfaces:**
- Produces:
  - `class ExpressionError extends Error`
  - `evaluateExpression(expr: string): number` — grammar: numbers (`\d+(\.\d+)?`, no commas), `+ - * / × ÷`, parentheses, unary minus, whitespace. Recursive descent with the usual precedence. Anything else, division by zero or an empty string throws `ExpressionError`. Never uses `eval` or `Function`.
  - `parseNumberText(text: string): number | null` — strips `₦`, spaces and thousands commas; returns `null` if what is left is not a plain number (`"₦1,250"` → 1250, `"47,325"` → 47325, `"seven"` → null).
  - `type MachineCheck = { status: "match" | "mismatch" | "unchecked" | "error"; detail: string }`
  - `machineCheck(item: DraftItem, expression: string | null): MachineCheck` — compares with tolerance `1e-9`:
    - `numeric`: needs an expression, else `unchecked`; compare with `Number(answer.value)`.
    - `single_choice`: needs an expression, else `unchecked`; if every option parses as a number, exactly one option must equal the expected value and it must be the keyed answer, else `mismatch`; if options are not numeric, `unchecked`.
    - `ordering`: if every option parses as a number, the keyed order must be strictly ascending or strictly descending (`match`), else `mismatch`; otherwise `unchecked`. Detail says the reviewer must confirm the direction the stem asks for.
    - A thrown `ExpressionError` gives `error` with its message.

- [ ] **Step 1: Write failing tests:**
  - `evaluates precedence and parentheses` — `"2 + 3 × 4"` → 14, `"(2 + 3) * 4"` → 20, `"4705 - 2398"` → 2307, `"-3 + 5"` → 2, `"7 * 1000"` → 7000.
  - `rejects unsafe or malformed input` — `"process.exit()"`, `"2 +"`, `""`, `"1 / 0"`, `"1,000 + 1"` each throw `ExpressionError`.
  - `parses naira and thousands separators` — the three examples above.
  - `flags two options equal to the answer` — single choice with options `"7000"`, `"7,000"`, `"700"` and expression `"7*1000"` → `mismatch`.
  - `flags a keyed option that is not the computed value` — options `"700"`, `"7000"`, key `"700"`, expression `"7*1000"` → `mismatch`.
  - `matches a correct numeric item` and `marks a numeric item without an expression unchecked`.
  - `accepts a descending numeric order and rejects an unsorted one`.
- [ ] **Step 2: Run** `pnpm --filter @stellara/content-pipeline test -- arithmetic`. Expected: FAIL.
- [ ] **Step 3: Implement** `arithmetic.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): add safe arithmetic answer check`.

### Task 4: Batch checks

**Files:**
- Create: `packages/content-pipeline/src/checks.ts`
- Test: `packages/content-pipeline/tests/checks.test.ts`

**Interfaces:**
- Consumes: `DraftBatch`, `ItemNote` (Task 2); `machineCheck`, `MachineCheck` (Task 3); `publishedItemSchema`, `publishedLessonSchema` from `@stellara/content-schema/server`; `MAX_SENTENCE_WORDS` (Task 1).
- Produces:
  - `type ItemCheck = { item_id: string; key: string; errors: string[]; warnings: string[]; machine_check: MachineCheck }`
  - `type CheckReport = { topic_code: string; ok: boolean; batch_errors: string[]; batch_warnings: string[]; items: ItemCheck[] }` — `ok` is true only when there are no errors anywhere.
  - `checkBatch(batch: DraftBatch, existingStems?: string[]): CheckReport`

Checks (error unless marked warning):
1. **Publishable shape:** parse each item through `publishedItemSchema` with placeholders spread *under* the item (`provenance: "original"`, two fixed different placeholder UUIDs for author and reviewer, `answer_verified_at: "1970-01-01T00:00:00Z"`, `status: "published"`), and report the remaining issue messages. Placeholder fields never appear in the batch.
2. **Required text:** `explanation` and `hint` present.
3. **Distractor notes:** every wrong option of a `single_choice` item has a note in `notes[item_id]`.
4. **Pilot coverage (batch):** exactly three `practice` items, one per difficulty; at least one `lesson_check` item.
5. **Lesson:** `publishedLessonSchema` accepts the lesson with `status: "published"`; every referenced item ID exists in the batch and has purpose `lesson_check`.
6. **Duplicates:** stems normalised (lowercase, collapse whitespace, strip punctuation) must be unique within the batch and absent from `existingStems`.
7. **Maths delimiters:** an odd number of unescaped `$` in a stem or explanation is an error (full KaTeX rendering is a later gate).
8. **Word list:** any banned term from Global Constraints in a stem, explanation, hint or lesson card is an error.
9. **Machine check:** `mismatch` and `error` are errors; `unchecked` is a warning ("reviewer must work this answer by hand").
10. **Reading length (warning):** a stem sentence over `MAX_SENTENCE_WORDS` words.
11. **Provenance (batch warning, always):** `"provenance pending counsel (G3)"`.

- [ ] **Step 1: Write failing tests** using the Task 2 batch built from fixtures:
  - `passes the synthetic batch` — `ok === true`, `batch_warnings` contains the G3 line.
  - `fails when the hard practice item is missing` — drop it; a batch error names `"hard"`.
  - `fails a wrong option without a distractor note`.
  - `fails a lesson check card pointing at a practice item`.
  - `fails a stem that repeats an existing stem with different spacing and case`.
  - `fails the banned term "expo" in a hint`.
  - `fails an unbalanced dollar sign`.
  - `warns on a 25-word stem sentence but stays ok`.
- [ ] **Step 2: Run** `pnpm --filter @stellara/content-pipeline test -- checks`. Expected: FAIL.
- [ ] **Step 3: Implement** `checks.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): add automated batch checks`.

### Task 5: Drafter and the `draft` and `check` commands

**Files:**
- Modify: `packages/content-pipeline/package.json` — add exact-pinned `@anthropic-ai/sdk` (`pnpm --filter @stellara/content-pipeline add -E @anthropic-ai/sdk`; if the repo's minimum release age blocks the newest version, take the newest allowed one)
- Create: `packages/content-pipeline/src/prompt.ts`
- Create: `packages/content-pipeline/src/drafter.ts`
- Create: `packages/content-pipeline/src/files.ts`
- Create: `packages/content-pipeline/src/cli.ts`
- Test: `packages/content-pipeline/tests/drafter.test.ts`, `packages/content-pipeline/tests/cli.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2 and 4.
- Produces:
  - `buildPrompt(brief: TopicBrief, topicTitle: string): { system: string; user: string }` — the system prompt states the Global Constraints style rules, the pilot shape and the `check_expression` rule ("give an arithmetic expression whose value is the answer for any item whose answer is one number; otherwise null"). The user message carries the brief fields except `filled_by`.
  - `type DraftModel = (prompt: { system: string; user: string }) => Promise<ModelDraft>`
  - `class DraftError extends Error`
  - `claudeDraftModel(client?: Anthropic): DraftModel` — calls `client.beta.messages.parse({ model: "claude-opus-5-5", max_tokens: 16000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: { effort: "high", format: zodOutputFormat(modelDraftSchema) }, system, messages: [{ role: "user", content: user }] })` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`. Throws `DraftError` when `stop_reason` is `"refusal"` or `"max_tokens"` (include the reason and any `stop_details.category`) or when `parsed_output` is null. If the installed SDK's beta namespace has no `parse`, use `client.messages.parse` without `betas`/`fallbacks` and note it in the commit message. If the Zod helper rejects Zod 4.6.7 schemas, pass `{ type: "json_schema", schema: z.toJSONSchema(modelDraftSchema) }` and parse the text block with `modelDraftSchema`.
  - `readJson<T>(path: string, schema: z.ZodType<T>): T`, `writeJson(path: string, value: unknown): void` (2-space indent, trailing newline, writes to a temp file then renames).
  - `draftTopic(opts: { briefPath: string; authorId: string; outRoot: string; model: DraftModel; now?: Date }): Promise<{ dir: string; report: CheckReport }>` — writes `<outRoot>/<topic_code>/batch.json` and `check.json`. Refuses with `Error("review already started")` if `review.json` exists in that folder. Reads stems from every other `batch.json` under `outRoot` for the duplicate check. Writes nothing when the model throws.
  - `cli.ts`: `main(argv: string[], deps?: { model?: DraftModel }): Promise<number>`; commands `draft --brief <path> --author-id <uuid> [--out <dir>]` and `check <topicDir>`. Default `--out` is `private/content-pilot` resolved from the current directory. Exit codes: `0` ok, `1` check errors, `2` usage or input error. Print a one-line summary per item (key, difficulty, errors, warnings, machine-check status).

- [ ] **Step 1: Write failing tests** (no real API calls; tests pass a fake `DraftModel`):
  - `prompt never contains filled_by` — a brief with `filled_by: "PRIVATE-REF-9"` gives a prompt where neither string contains it, and the user message contains each objective and mistake.
  - `draftTopic writes batch and check files` — temp `outRoot`; files exist and `check.json` parses with `ok: true`.
  - `draftTopic refuses when review.json exists` — the existing `batch.json` is byte-identical afterwards.
  - `draftTopic writes nothing when the model throws DraftError`.
  - `claudeDraftModel throws DraftError on refusal and on max_tokens` — a stub client whose `beta.messages.parse` resolves `{ stop_reason: "refusal", stop_details: { category: "cyber" }, parsed_output: null }` (and a `max_tokens` variant).
  - `cli returns 2 for a missing --author-id`.
- [ ] **Step 2: Run** `pnpm --filter @stellara/content-pipeline test -- drafter cli`. Expected: FAIL.
- [ ] **Step 3: Implement** the four source files.
- [ ] **Step 4: Run** the tests, then `pnpm --filter @stellara/content-pipeline typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): draft topics with Claude and check them`.

### Task 6: Review sheet, applying decisions and the pilot report

**Files:**
- Create: `packages/content-pipeline/src/review.ts`
- Create: `packages/content-pipeline/src/report.ts`
- Modify: `packages/content-pipeline/src/cli.ts` — commands `review-sheet <topicDir>`, `apply-review <topicDir>`, `report [<outRoot>]`
- Test: `packages/content-pipeline/tests/review.test.ts`, `packages/content-pipeline/tests/report.test.ts`

**Interfaces:**
- Consumes: `DraftBatch`, `checkBatch`, `CheckReport`, `readJson`, `writeJson`.
- Produces:
  - `reviewFileSchema`, `type ReviewFile = { reviewer_id: string /* uuid */; decisions: { item_id: string; decision: "approve" | "changes_requested" | "reject" | null; answer_verified: boolean; minutes: number | null; note: string }[]; lesson: { decision: "approve" | "changes_requested" | "reject" | null; minutes: number | null; note: string } }`
  - `renderReviewSheet(batch: DraftBatch, report: CheckReport): string` — Markdown: the topic, then per item its stem, options with the keyed answer marked, the explanation, hint, distractor notes, machine-check status and any warnings; then the lesson cards in order. It opens with: "Work every answer yourself before you tick answer_verified. Record the minutes you spent on each item."
  - `reviewTemplate(batch: DraftBatch): ReviewFile` — one decision per item, all `null`/`false`, `reviewer_id: ""`. `review-sheet` writes `review.md` always and `review.json` only if it does not exist.
  - `applyReview(batch: DraftBatch, review: ReviewFile, now: Date): DraftBatch` — refuses (throws, returning nothing partial) when: `reviewer_id` equals any item's `author_id` (lowercase compare); an `approve` has `answer_verified: false`; an `approve` targets an item whose fresh `checkBatch` result has errors; a decision names an unknown item. Otherwise `approve` → `status: "approved"`, `reviewer_id`, `answer_verified_at: now.toISOString()`; `changes_requested` → `status: "changes_requested"`; `reject` and `null` leave the item unchanged. The lesson decision is recorded in `review.json` only, because lesson status has no `approved` state. `apply-review` writes the updated `batch.json`.
  - `type PilotSummary = { topics: number; items: number; approved: number; changes_requested: number; rejected: number; undecided: number; first_pass_approval_rate: number; median_minutes_per_item: number | null; total_review_minutes: number; projected_review_hours_2000_items: number | null }`
  - `summarisePilot(entries: { batch: DraftBatch; review: ReviewFile | null }[]): PilotSummary` — median over items with recorded minutes; projection `median × 2000 / 60`, rounded to one decimal. `report` prints it as a table and writes `<outRoot>/pilot-summary.json`.

- [ ] **Step 1: Write failing tests:**
  - `refuses a reviewer who is the author in upper case`.
  - `refuses approval without answer_verified` — and the input batch object is unchanged.
  - `refuses approval of an item that now fails checks`.
  - `approves and stamps reviewer and time` — `status "approved"`, `answer_verified_at === "2026-12-01T09:00:00.000Z"`.
  - `review-sheet does not overwrite an existing review.json`.
  - `review sheet marks the keyed option and shows the machine check status`.
  - `summarises minutes 4, 10 and 6 as median 6 and 200 projected hours` — plus counts and `first_pass_approval_rate` for 2 approved of 3.
  - `reports null median when no minutes were recorded`.
- [ ] **Step 2: Run** `pnpm --filter @stellara/content-pipeline test -- review report`. Expected: FAIL.
- [ ] **Step 3: Implement** `review.ts`, `report.ts` and the CLI commands.
- [ ] **Step 4: Run** `pnpm --filter @stellara/content-pipeline test`, `pnpm --filter @stellara/content-pipeline typecheck`, `pnpm lint` and `node --test scripts/boundaries.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-pipeline): add review sheets, decisions and pilot summary`.

### Task 7: Runbook and the three-topic pilot

**Files:**
- Create: `packages/content-pipeline/README.md` — the runbook below
- Modify: `docs/authoring/content-sourcing-checklist.md` — under "First Mathematics batch", link the runbook
- Modify: `TASKLIST.md` — note under 2.33 that the pilot pipeline exists and the pilot result (Step 5)

Runbook order: build (`pnpm --filter @stellara/content-pipeline build`) → write a brief JSON per topic in `private/content-pilot/briefs/` (Section C fields) → `pnpm --filter @stellara/content-pipeline pipeline draft --brief … --author-id …` → fix or redraft until `check` exits 0 → `review-sheet` → reviewer fills `review.json` → `apply-review` → `report`. It states the gates: nothing here is published; G1–G3 are still needed before any item is accepted for launch.

- [ ] **Step 1: Write the README and doc links.** Commit `docs(content-pipeline): add pilot runbook`.
- [ ] **Step 2 (human): Get three briefs** for `mathematics.s1.t1`, `t2`, `t3` from a P5–6 teacher, using the Section C template. Claude may pre-fill drafts from the legacy NERDC Primary 4–6 Mathematics pages listed in the source register for the teacher to correct.
- [ ] **Step 3 (human approval): Ask the user to approve the API spend**, then confirm credentials with `ant auth status` (or `ANTHROPIC_API_KEY`) and run `draft` for the three briefs. Expected: three topic folders, each `check` exits 0 after at most one redraft.
- [ ] **Step 4 (human): An independent reviewer** (not the author of record) works through each `review.md`, fills `review.json` with minutes, then `apply-review` runs.
- [ ] **Step 5: Run `report`** and record in `TASKLIST.md` under 2.33: items drafted, first-pass approval rate, median minutes per item and projected hours for 2,000 items. Commit `docs: record content pipeline pilot result`.

The decision after the pilot (scale with the Batches API, add stimuli and English, or change the brief template) is a separate plan.
