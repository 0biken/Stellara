# Content sourcing checklist (Common Entrance MVP)

Status: working list. Nothing here is gathered yet.

This lists what a person needs to **find, obtain or decide** so Claude can draft
lessons, items and explanations in the agreed schema
([03 Curriculum and content](../md/03-curriculum-and-content.md)). Claude drafts;
named humans still author-of-record, review, verify answers and publish.

Bring each item back as files in a shared folder (one sub-folder per section
below). Mark every file with where it came from and whether we may reuse it.

---

## A. Official sources (get these first: everything else depends on them)

| # | What | Why we need it | Notes |
|---|---|---|---|
| A1 | **NECO 2027 NCEE brochure / general information** | Confirms papers, item counts, durations, CBT or paper, question types | 2026 version is reference only. Must be the 2027 one, or a written statement that it is unchanged |
| A2 | **NCEE syllabus / scope per paper** (if NECO publishes one) | Topic boundaries for each paper | Official PDF or link, with date |
| A3 | **NERDC Basic Education Curriculum, Primary 4–6** (revised 2025 edition) for Mathematics, English Studies, Basic Science and Technology, Social and Citizenship Studies, CRS, IRS | What a P5–6 child is expected to know; maps our 74 topics to the curriculum | Note which edition each document is (`legacy` or `revised_2025`) |
| A4 | **Official sample questions** published by NECO (if any) | Format reference only: how a question looks, number of options, instructions wording | **Do not send past papers to copy.** Format only |
| A5 | **Answer-sheet / CBT screen format** | So practice tests feel like the real thing | Screenshot or description |

## B. Academic decisions (an academic lead answers these)

| # | Decision | Default if nobody decides |
|---|---|---|
| B1 | Approve or edit the **74-topic draft** (`packages/content-schema/data/curriculum-draft.json`): Maths 22, English 16, Quantitative 10, Verbal 10, General Paper 16 | Nothing ships; this is a hard gate |
| B2 | Approve the **prerequisite links** between topics | Same |
| B3 | Which **topics are mastery-critical** (30 items each) vs the rest (20 items) | All 20 |
| B4 | **General Paper structure**: which subjects, and which religion option(s) (CRS, IRS, both, or neither) | Unknown — must be decided |
| B5 | What **easy / standard / hard** mean, with one example each per learning area | Claude proposes, lead approves |
| B6 | **Reading level** ceiling for P5–6 English stems | Claude proposes a target, lead approves |
| B7 | **Notation and method conventions** taught in Nigerian classrooms (long division layout, fraction notation, units, ₦ formatting, date format, British vs American spelling) | Nigerian/British conventions |
| B8 | Calculator allowed or not, per paper | Not allowed |

## C. Per-topic brief (one per topic, 74 in total)

This is the main thing to feed Claude. A teacher who knows P5–6 can fill most of it
in 20–30 minutes per topic. Use the template at the bottom of this file.

1. **Learning objectives** — 2–5 "the pupil can…" statements, from A3 where possible.
2. **Scope limits** — what is *in* and *out* for this level (e.g. "fractions up to
   twelfths", "no negative numbers").
3. **Common mistakes** — the real errors teachers see. These become the wrong
   options (distractors) and the "why someone might pick this" notes.
4. **How it is taught** — the method or steps teachers use, so our worked examples
   match the classroom.
5. **Key words** the child must know.
6. **2–3 example questions** the teacher would set, written by the teacher (not
   copied from a past paper or textbook), one per difficulty.
7. **Exam angle** — how the topic tends to appear in Common Entrance (described in
   words, not copied questions).

## D. Reading passages and other shared material (stimuli)

| # | What | Rough amount | Rules |
|---|---|---|---|
| D1 | **Comprehension passages** — stories, letters, notices, short informational texts, a few poems | ~40–60 passages, 150–400 words, each supporting 3–6 questions | Original (commissioned) **or** public domain **or** licensed in writing. Record the source and licence for every one |
| D2 | **Cloze passages** (fill-the-gap) | ~15–20 | Same rules |
| D3 | **Data tables and simple charts** for everyday statistics | ~15 | Can be invented; Nigerian context |
| D4 | **Diagrams** for geometry, measurement, shape reasoning and science | Several per topic in those strands | We can draw these as SVG from a description or sketch |
| D5 | **Maps / civic material** for General Paper (states, symbols, national institutions) | As needed | Facts must be checked against an official source; note the source |

## E. Nigerian context bank

So questions feel local and fair across regions. A one-page list for each is enough.

- Names: boys' and girls' names across Hausa, Yoruba, Igbo, Ijaw, Tiv, Efik, Edo, Fulani and others
- Places: towns, markets, landmarks across all six geopolitical zones
- Prices: realistic 2026–27 ₦ prices for food, transport, school items
- Foods, festivals, games, everyday activities
- Anything to avoid (stereotypes, sensitive topics, religious or political issues)

## F. Facts that must be current (General Paper and Basic Science)

Lists of facts that change and must be checked against an official source at
the time of writing, with the source recorded:

- National symbols, anthem, pledge wording, arms of government, number of states and
  their capitals, current office-holders (avoid where possible: they go stale)
- Health, safety and environment facts used in Basic Science items

## G. People and rights (blocking: no item is accepted without these)

| # | What | Owner |
|---|---|---|
| G1 | Named **author(s) of record** and **independent reviewer(s)** per learning area (author ≠ reviewer) | Founder / academic lead |
| G2 | Signed **IP assignment and originality warranty** for each (see [onboarding and rights](onboarding-and-rights.md)) | Founder + counsel |
| G3 | Counsel's position on **AI-assisted drafting**: how Claude-drafted content is recorded as `provenance` and owned | Counsel |
| G4 | Written **licences** for any third-party passage, image or text | Founder |
| G5 | **Takedown email address** that someone monitors | Operations |
| G6 | 2–3 written **authoring/review quotes** ([request for quote](request-for-quote.md)) | Founder |

## H. Auntie Stella and lesson voice

- 5–10 example lines in Auntie Stella's voice that the team likes, and 5 it does not
- Any words or phrases teachers or parents would find odd or unwelcome
- Voice rules already in [08 §10](../md/08-design-system.md) — read and confirm

## I. Volume to plan for (from 03 §5)

| Asset | Target | Notes |
|---|---|---|
| Topics | 74 | 22 / 16 / 10 / 10 / 16 |
| Lessons | 74 (one per topic) | 3–6 cards, 5–8 minutes |
| Practice items | ~1,800–2,200 total | 30 per mastery-critical topic, 20 elsewhere |
| Placement checks | 5 × 20 items | One per learning area |
| Practice tests | 3 full forms | From a reserved pool, never shown in practice |
| Reading passages | ~40–60 | Section D1 |

---

## Suggested order

1. **A1–A3 and B1–B4** — without these we cannot lock the topic list or test format.
2. **G1–G3** — without these nothing can be published, even if drafted.
3. **C for one learning area** (Mathematics suggested) plus **E** — Claude drafts a
   pilot batch (e.g. 3 topics: lessons + items) for review and calibration.
4. Adjust the brief template from that pilot, then do C and D for the remaining areas.

---

## Template: per-topic brief

Copy once per topic. Plain text, a Word document or a spreadsheet row are all fine.

```text
Topic code:            (e.g. mathematics.s1.t1)
Topic name:            (e.g. Place value)
Learning area/strand:
Filled in by:          (private reference, not a name in this repo)
Date:

1. Objectives (the pupil can...):
   -
2. In scope:
   Out of scope:
3. Common mistakes (and why pupils make them):
   -
4. How it is taught in class (method/steps):
5. Key words:
6. Example questions (your own, not copied):
   Easy:
   Standard:
   Hard:
7. How it tends to appear in Common Entrance (described, not copied):
8. Sources used (title, edition, page) and whether we may reuse them:
```
