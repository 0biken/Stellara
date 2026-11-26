# Content pipeline (pilot)

A staff-only command-line tool. It turns a teacher's topic brief into draft questions and a lesson with Claude, checks them, and records an independent reviewer's decisions and timing.

Nothing here is published, and nothing reaches children. Publishing belongs to the content studio (task 2.32). Before any item is accepted for launch you still need named authors and reviewers (G1), signed agreements (G2) and counsel's position on AI-assisted drafting (G3). Until G3 is decided, draft items have no `provenance`.

## Where files go

Everything lives in `private/content-pilot/` at the repository root. Git ignores this folder, but it is not secure storage. Never commit briefs, drafts or reviews. Never put contributor names in a brief: `filled_by` is a private reference and is never sent to the API.

```text
private/content-pilot/
  briefs/mathematics.s1.t1.json      brief you write
  mathematics.s1.t1/
    batch.json                       draft items, lesson and drafting record
    check.json                       automated check results
    review.md                        reviewer's reading copy
    review.json                      reviewer's decisions and minutes
  pilot-summary.json                 written by report
```

## Steps

Run commands from the repository root. Build once:

```powershell
pnpm --filter @stellara/content-pipeline build
```

1. **Write a brief** for each topic as JSON in `private/content-pilot/briefs/`, using the Section C fields in the [content sourcing checklist](../../docs/authoring/content-sourcing-checklist.md#c-per-topic-brief-one-per-topic-74-in-total). The schema is `topicBriefSchema` in `src/schemas.ts`. It needs at least two common mistakes.
2. **Draft.** This calls Claude (`claude-opus-5-5`) and is billed, so get approval first. Credentials come from `ANTHROPIC_API_KEY` or an `ant auth login` profile. `--author-id` is the UUID of the named author of record.

   ```powershell
   pnpm --filter @stellara/content-pipeline pipeline draft --brief private/content-pilot/briefs/mathematics.s1.t1.json --author-id <author-uuid>
   ```

   Exit code 0 means the checks passed, 1 means they found errors (see `check.json`), and 2 means a usage or input error. `draft` refuses to overwrite a folder whose `review.json` already exists.

3. **Fix or redraft** until checks pass. After editing `batch.json` by hand, re-run checks:

   ```powershell
   pnpm --filter @stellara/content-pipeline pipeline check private/content-pilot/mathematics.s1.t1
   ```

4. **Make the review sheet:**

   ```powershell
   pnpm --filter @stellara/content-pipeline pipeline review-sheet private/content-pilot/mathematics.s1.t1
   ```

5. **The reviewer** (not the author) reads `review.md`, works every answer by hand and fills `review.json`: their `reviewer_id` UUID and, per item, a `decision` (`approve`, `changes_requested` or `reject`), `answer_verified`, `minutes` and a `note`.
6. **Apply the decisions:**

   ```powershell
   pnpm --filter @stellara/content-pipeline pipeline apply-review private/content-pilot/mathematics.s1.t1
   ```

   The whole file is refused if the reviewer is the author, if an approval lacks `answer_verified: true`, or if an approved item fails checks.

7. **Summarise the pilot:**

   ```powershell
   pnpm --filter @stellara/content-pipeline pipeline report
   ```

   It reports approval counts, the median review minutes per item and the review hours that projects for 2,000 items.

## What the checks cover

- The item would pass the publication schema once review fields are added
- Pilot shape: three practice items (easy, standard, hard) and at least one lesson-check item
- A distractor note for every wrong option
- Lesson cards reference lesson-check items
- No duplicate stems across topic folders
- Balanced `$` maths delimiters
- No banned words from the voice guide
- An arithmetic recheck of single-number answers, which also catches two options that are both correct

Long sentences produce a warning only, at a proposed 20 words, until the reading level (B6) is decided. A warning such as "work this answer by hand" means the machine could not check it.
