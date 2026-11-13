# 02 · Learning rules

These are the rules the product runs on. The implemented baseline is **v0.1.0**, with the clarifications approved on 13 November 2026 below. Thresholds remain subject to pilot tuning. Rule changes need a version bump (`rules_version`) and new fixtures. Technical acceptance does not replace product sign-off.

Implementation: rules live in one pure TypeScript package, `packages/rules`, used by Edge Functions and tests. The UI never computes a scored outcome on its own. See [04](04-technical-architecture.md).

## 1. Definitions

| Term | Meaning |
|---|---|
| **Item** | One question (version-pinned). Has a difficulty: `easy`, `standard` or `hard`. May be tagged `application`. |
| **Response** | One answer to one item, stored in `attempts` (immutable). |
| **Scored response** | A response that counts as evidence of learning (§2). |
| **Set** | A group of items done in one sitting: practice set, review set, topic assessment, placement check or practice test. |
| **Topic** | The smallest curriculum node with its own mastery state (for example "Equivalent fractions"). |
| **Strand** | A group of topics (for example "Fractions, decimals and percentages"). |
| **Learning day** | A calendar day that ends at 03:00 local time (default `Africa/Lagos`). |

## 2. Scored response

A response is **scored** when all of these are true:

1. It is the **first attempt** on this item by this child, or the child has not seen the item for **30 days**.
2. It was given **before** any hint or explanation for this item was shown in this sitting.
3. Response time is at least `min_response_ms` (default **2,500 ms**; 1,500 ms for items flagged `quick`).
4. It was made in a set whose answer key was **not on the device**, or it is an offline response with `key_on_device = true`, in which case it is scored with `confidence = 'low'` (see §3.4).
5. The child profile was in normal mode (not "practice with a grown-up" mode).

Everything else is stored as practice and never moves mastery.

## 3. Mastery (rule v0.1.0)

### 3.1 Levels

| Level | Code | Rule at topic level |
|---|---|---|
| — | `not_assessed` | Fewer than 4 scored responses |
| 1 | `foundation` | At least 4 scored responses; Level 2 not met |
| 2 | `developing` | At least 6 scored responses; at least 5 of the last 10 correct |
| 3 | `proficient` | At least 10 scored; 8 of the last 10 correct; 6 of those 8 are `standard` or `hard`; across at least 2 sets on 2 different learning days. **Or** a Topic Assessment passed at 8/10 or better |
| 4 | `advanced` | Level 3, plus 4 of the last 5 `hard` items correct across 2 sets, including at least 2 `application` items |
| 5 | `mastered` | Level 4, plus a retention check passed at 4/5 on unseen mixed items at least **14 days** after reaching Level 4 (**7 days** if the child's exam is under 6 weeks away) |

### 3.2 Moving down

- A retention check scoring **2/5 or lower** drops the topic **one level**.
- No other event lowers a level. A bad practice set alone never does.

### 3.3 Caps

- Placement returns strand results and starting-topic recommendations only; it never changes topic mastery, including when all answers are correct.
- Level 3 and above use only `confidence = 'normal'` responses for every count, accuracy window, assessment and retention requirement.
- Returning to Level 4 after a retention downgrade starts a fresh 14-day wait (7 days when the exam is strictly under 42 days away).

### 3.4 Offline evidence

Offline practice packs may carry answer keys so children get instant feedback. Those responses are scored with `confidence = 'low'`. They count towards Levels 1–2 only. Practice tests never ship keys.

### 3.5 Display

| Level | Star shape | Parent wording | Child wording |
|---|---|---|---|
| `not_assessed` | dashed outline | Not yet measured | A star waiting for you |
| `foundation` | outline | Getting started | Started |
| `developing` | half filled | Developing | Growing |
| `proficient` | filled | Proficient | Shining |
| `advanced` | filled, thicker edge | Advanced | Bright |
| `mastered` | filled, with a sprout (two leaves and a bud) | Mastered | Sprouted |

## 4. Spaced review

- After a topic reaches Level 2, schedule reviews at **+3, +10 and +30 days**.
- A review is 3–5 items from the topic, mixed into the next review set.
- Anchor the offsets at first attainment of Level 2. If necessary, proportionally scale all three offsets to the exam-minus-3-day cutoff, round down to whole calendar days, omit nonfuture dates and merge duplicates. Return `no_future_slot` when no future date fits.
- A missed review stays due and does not pile up. At most 3 due topics are pulled into one review set.

## 5. Sets

| Set type | Items | Timed | Keys on device | Feeds mastery |
|---|---|---|---|---|
| Practice set | 8–12 | No | Online: no. Offline pack: yes | Yes (§2, §3.4) |
| Review set | 6–10 | No | No | Yes |
| Topic Assessment | 10 | Soft limit: 15 min, shown as a calm bar | No | Yes; can unlock Level 3 |
| Placement check | 20 per configured learning area | No | No | Strand summary only; no topic mastery |
| Practice test | Blueprint (§5.1) | Yes, server timer | Never | Yes for item-level evidence; the test score is reported separately |

### 5.1 Practice test blueprint

The blueprint is configuration, not code: table `test_blueprints`. **The NCEE values below are placeholders. Verify against NECO's 2027 brochure.**

| Field | Example (placeholder) |
|---|---|
| `papers` | Mathematics, English, Quantitative Aptitude, Verbal Aptitude, General Paper |
| `items_per_paper` | Set per blueprint |
| `duration_minutes` | Set per blueprint |
| `navigation` | Free movement within a paper, flag for review |
| `calculator` | Off unless the blueprint says otherwise |

### 5.2 Timer and interruption rules

- The server sets `started_at` and `ends_at` when a session starts.
- The client shows `ends_at - server_now`, synced each minute, and counts down locally.
- Answers are saved locally first, then sent in batches every 10 answers or every 30 s.
- If the connection drops, the child keeps going. Locally saved answers with `answered_at <= ends_at` are accepted up to **15 minutes** after `ends_at`.
- **Resume:** at most **2 resumes**, with a total pause of up to **20 minutes** (the app closed or the device switched off). The timer does not stop for a lost connection, only for an app close counted as a pause.
- A validated pause extends `ends_at` by its actual duration. The future server adapter must validate pause evidence; an arbitrary client claim is insufficient. Answers during a pause are rejected. A third resume or excess total pause finalizes the session. The server accounts for an ongoing validated pause, bounded by the remaining pause allowance, before applying the grace period.
- At `ends_at` plus the grace period, the server finalises the session and scores what it has.
- A response time below 1,000 ms on more than 30% of items flags the session as `suspect_timing` (shown to the teacher, not the child).

## 6. Stardust

Stardust is a motivation currency. **It never enters mastery** and is never sold.

| Event | Stardust |
|---|---|
| Correct scored response | +10 |
| Correct response on a due review item | +5 extra |
| Completed review set | +20 |
| Completed practice test with at least 80% of items answered | +30 |
| Topic reaches a new level | +25 |

- **Daily cap:** 200 Stardust per learning day. Above the cap, events are logged with 0 value.
- Awards are clamped to the remaining allowance: 195 plus a +10 event awards 5. A topic's new highest-level transition awards +25 once; a jump from Level 0 to Level 3 awards +25, and regaining an old level awards nothing. Correct scored placement answers earn ordinary Stardust.
- All awards go to `stardust_ledger` (append-only), written only by the server.
- No Stardust for opening lessons, watching or logging in.

**Level names** (by total Stardust): Spark 0 · Glow 500 · Beam 1,500 · Comet 3,500 · Nebula 7,000 · Galaxy 12,000. These describe light, not attainment.

## 7. Days in a row and resting clouds

| Rule | Value |
|---|---|
| Qualifying day | At least 5 scored responses **or** one completed review set in a learning day |
| Day boundary | 03:00 local, default `Africa/Lagos` |
| Resting clouds at start | 2 |
| Earn a cloud | 1 per 5 qualifying days |
| Maximum clouds held | 3 |
| Use | Automatic on a missed day while the run is above 0 |
| Rest Mode | Up to 14 days, twice per school term. Set by a parent or teacher. The run is frozen and no clouds are used |
| Repair | Once per term, within 48 hours of a run ending, by completing a review set |
| Platform outage | If the service is down for more than 2 hours in a learning day, that day is excused for everyone |
| Offline | Work credits its local learning day if synced within 72 hours |
| Purchase | Clouds are never sold |

Copy rule: never "lose", "break" or "don't miss". See [08 Design system §10](08-design-system.md#10-voice-in-the-interface).

Voluntary qualifying practice during Rest Mode increases the run and can earn clouds; inactive Rest Mode days preserve it without using clouds. Repair within 48 hours restores the previous run plus actual qualifying activity; excused missed days do not increase its length. Event IDs prevent replay from counting or awarding twice.

## 8. Parent report rules

The weekly report is generated on Sunday at 18:00 Lagos time using consecutive Sunday-18:00 cutoffs, with an inclusive start and exclusive end. Late-Sunday activity belongs to the next report. Display the actual period; do not describe this snapshot as a complete Monday-to-Monday learning week.

| Block | Rule |
|---|---|
| Headline stats | Topics at `mastered`; topics at `developing`–`advanced` ("in progress"); active days this term |
| Celebrate | The topic with the highest level gain this week. If none, the longest days-in-a-row run this week. If none, "Tolu practised on N days" (N ≥ 1). If N = 0, a neutral "No practice this week" with one suggested 10-minute set |
| Practise next | Up to 2 topics: due reviews first, then the lowest-level topic in the current class assignment |
| Common Entrance coverage | Per paper: share of blueprint topics with `developing` or above. Always labelled "Share of the syllabus practised, not a predicted score" |
| Note from Auntie Stella | Template chosen by rule from the celebrate and practise-next blocks. No free text from staff in the MVP |
| Forbidden | Predicted scores, "ready", rankings against other children, any comparison with classmates |

## 9. Placement check

- 20 items per configured learning area, spread evenly across strands. Optional and resumable. Learning areas are distinct from official exam papers.
- Result per strand: "Looks secure so far" (≥ 75% correct and at least 4 items), "Check this" (< 50%), otherwise "Not yet measured enough".
- It never reports topic-level results or changes topic mastery, and is never called a test.

## 10. Fixtures

QA fixtures live in `packages/rules/fixtures/*.json`. Each fixture is a response sequence plus the expected state. Minimum set:

| ID | Sequence (C = correct, W = wrong; S/H = standard/hard; one set per day unless noted) | Expected |
|---|---|---|
| M-01 | 3 scored C | `not_assessed` |
| M-02 | 4 scored: C W W W | `foundation` |
| M-03 | 6 scored: C C W C C W | `foundation` (only 4 correct; Level 2 needs 5 of the last 10) |
| M-04 | 10 scored, 8 C (6 of them S/H), one set, one day | `developing` (fails the 2-day gate) |
| M-05 | As M-04, split over 2 sets on 2 days | `proficient` |
| M-06 | Topic Assessment 8/10, no prior history | `proficient` (assessment route skips the 2-day gate) |
| M-07 | M-05 then 4 of 5 H correct (2 application) over 2 sets | `advanced` |
| M-08 | M-07 then retention check 4/5 after 14 days | `mastered` |
| M-09 | M-08 then retention check 2/5 | `advanced` |
| M-10 | 10 C, all offline `key_on_device` | `developing` (low-confidence cap) |
| M-11 | Placement: 20/20 correct in a strand | Topic mastery remains unchanged (`not_assessed` for a new topic) |
| M-12 | Same item answered C twice within 30 days | Second response not scored |
| M-13 | Correct after hint shown | Not scored |
| M-14 | Correct in 900 ms | Not scored |
| S-01 | 6 qualifying days, miss day 7, qualify day 8 | Run continues at 7 qualifying days; clouds 2 → 3 on day 5 (earned) → 2 on day 7 (used) |
| S-02 | Offline day synced after 80 hours | Day not credited |
| S-03 | Outage of 3 hours on a day with 0 responses | Day excused, run continues |
| X-01 | 25 correct scored responses in one day | Stardust 200 (capped) |

Run length counts qualifying days only; a cloud day keeps the run alive but does not add to it.
