import {
  awardStardust,
  creditLearningDay,
  initialMasteryState,
  initialStardust,
  learningDay,
  placementStrandResult,
  rules_version,
  scheduleReviews,
  scoreResponse,
  updateMastery,
  type MasteryEvent,
  type MasteryState,
  type ScoringResponse,
  type ScoringResult,
  type StardustEvent,
} from "@stellara/rules";

import {
  parseRequest,
  responsesSubmitRequestSchema,
  RuntimeError,
  type ResponsesSubmitResponse,
  type SubmitResult,
  type SubmittedResponse,
} from "./contracts.js";
import { answerKey, gradeResponse } from "./grade.js";
import { loadActiveChild } from "./set-start.js";
import { isApplication, isQuick, masteryCode } from "./util.js";

import type {
  ActivityDay,
  AttemptRecord,
  ChildContext,
  LedgerRow,
  MasteryEventRecord,
  PlacementStrandResult,
  RuntimeDeps,
  SetRecord,
} from "./ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

interface Prepared {
  readonly request: SubmittedResponse;
  readonly set: SetRecord;
  readonly item: PublishedItem;
  readonly scoring: ScoringResponse;
  readonly valid: boolean;
  result?: ScoringResult;
}

const itemKey = (id: string, version: number) => `${id}@${version}`;

/**
 * `responses-submit`: one transaction per batch. Idempotent on `client_id`: a stored
 * response returns its stored result and is never scored or awarded again.
 */
export async function submitResponses(
  deps: RuntimeDeps,
  ctx: ChildContext,
  input: unknown,
): Promise<ResponsesSubmitResponse> {
  const request = parseRequest(responsesSubmitRequestSchema, input);
  const child = await loadActiveChild(deps, ctx);
  const { store } = deps;

  return store.transaction(async () => {
    const now = deps.clock.now();
    const today = learningDay(now, child.timezone);
    const deviceClock = Date.parse(request.device_clock);
    const clientIds = [...new Set(request.responses.map((r) => r.client_id))];
    const existing = new Map((await store.findAttempts(clientIds)).map((a) => [a.client_id, a]));
    for (const attempt of existing.values())
      if (attempt.child_id !== child.id) throw new RuntimeError("SET_NOT_OWNED");

    // 1. Validate new responses against their sets.
    const fresh = new Map<string, SubmittedResponse>();
    for (const r of request.responses)
      if (!existing.has(r.client_id) && !fresh.has(r.client_id)) fresh.set(r.client_id, r);
    const sets = new Map<string, SetRecord>();
    const items = new Map<string, PublishedItem>();
    for (const r of fresh.values()) {
      let set = sets.get(r.set_id);
      if (!set) {
        const loaded = await store.getSet(r.set_id);
        if (!loaded) throw new RuntimeError("SET_NOT_FOUND");
        if (loaded.child_id !== child.id) throw new RuntimeError("SET_NOT_OWNED");
        if (loaded.finished_at !== null) throw new RuntimeError("SET_CLOSED");
        sets.set(r.set_id, (set = loaded));
      }
      const ref = set.items.find((i) => i.item_id === r.item_id);
      if (!ref) throw new RuntimeError("ITEM_NOT_IN_SET");
      const item =
        ref.version === r.item_version ? await store.getItem(ref.item_id, ref.version) : null;
      if (!item) throw new RuntimeError("ITEM_VERSION_MISMATCH");
      items.set(itemKey(item.id, item.version), item);
    }

    // 2. Credit time, mark, and build rule inputs (chronological).
    const prepared: Prepared[] = [...fresh.values()]
      .map((r): Prepared => {
        const set = sets.get(r.set_id)!;
        const item = items.get(itemKey(r.item_id, r.item_version))!;
        const recordedAt = Date.parse(r.recorded_at);
        const credit = creditLearningDay(
          { recordedAt, receivedAt: now, deviceClockAtSync: deviceClock },
          child.timezone,
        );
        const graded = gradeResponse(answerKey(item), r.response);
        return {
          request: r,
          set,
          item,
          valid: graded !== "invalid",
          scoring: {
            eventId: r.client_id,
            itemId: item.id,
            itemVersion: String(item.version),
            answeredAt: credit.source === "device" ? recordedAt : now,
            learningDay: credit.day,
            setId: set.id,
            correct: graded === true,
            difficulty: item.difficulty,
            application: isApplication(item),
            responseMs: r.response_ms,
            quick: isQuick(item),
            hintShown: r.hint_shown,
            explanationShown: false,
            keyOnDevice: r.key_on_device,
            offline: r.key_on_device,
            grownup: ctx.grownup === true,
          },
        };
      })
      .sort((a, b) => a.scoring.answeredAt - b.scoring.answeredAt);

    // 3. Score each response the way updateMastery will, so results are known per response.
    const states = new Map<string, MasteryState>();
    const stateFor = async (topicId: string) => {
      let state = states.get(topicId);
      if (!state) {
        state = (await store.getMastery(child.id, topicId)) ?? initialMasteryState(topicId);
        states.set(topicId, state);
      }
      return state;
    };
    const simulated = new Map<string, { prior: ScoringResponse[]; ids: string[] }>();
    for (const p of prepared) {
      if (!p.valid) {
        p.result = { scored: false, confidence: null, reason: "invalid_response" };
        continue;
      }
      const state = await stateFor(p.item.topic_id);
      const sim = simulated.get(p.item.topic_id) ?? { prior: [], ids: [] };
      simulated.set(p.item.topic_id, sim);
      p.result = scoreResponse(
        p.scoring,
        [...state.priorAttempts, ...sim.prior],
        [...state.processedResponseIds, ...sim.ids],
      );
      sim.prior.push(p.scoring);
      sim.ids.push(p.scoring.eventId);
    }

    const attempts: AttemptRecord[] = prepared.map((p) => ({
      id: deps.ids.uuid(),
      client_id: p.request.client_id,
      child_id: child.id,
      set_id: p.set.id,
      item_id: p.item.id,
      item_version: p.item.version,
      topic_id: p.item.topic_id,
      response: p.request.response,
      is_correct: p.scoring.correct,
      scored: p.result!.scored,
      confidence: p.result!.confidence,
      reason: p.result!.reason,
      hint_shown: p.request.hint_shown,
      response_ms: p.request.response_ms,
      recorded_at: Date.parse(p.request.recorded_at),
      received_at: now,
      answered_at: p.scoring.answeredAt,
      learning_day: p.scoring.learningDay,
      key_on_device: p.request.key_on_device,
      rules_version,
    }));
    await store.insertAttempts(attempts);

    // 4. Set completion (after this batch's attempts are stored).
    const completed: SetRecord[] = [];
    const setAttempts = new Map<string, readonly AttemptRecord[]>();
    for (const set of sets.values()) {
      const all = await store.setAttempts(set.id);
      setAttempts.set(set.id, all);
      const answered = new Set(all.map((a) => a.item_id));
      if (set.items.every((i) => answered.has(i.item_id))) completed.push(set);
    }

    // 5. Mastery. Assessments are judged as one event once all 10 answers are in.
    const events: { topicId: string; event: MasteryEvent; lastAttempt: string; day: string }[] = [];
    const groups = new Map<string, Prepared[]>();
    for (const p of prepared) {
      if (!p.valid || p.set.kind === "topic_assessment") continue;
      const key = `${p.set.id}|${p.item.topic_id}`;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    for (const group of groups.values()) {
      const first = group[0]!;
      const last = group[group.length - 1]!;
      events.push({
        topicId: first.item.topic_id,
        lastAttempt: last.request.client_id,
        day: last.scoring.learningDay,
        event: {
          eventId: `${first.set.id}:${first.item.topic_id}:${first.request.client_id}`,
          kind: first.set.kind === "placement" ? "placement" : "practice",
          occurredAt: now,
          responses: group.map((p) => p.scoring),
        },
      });
    }
    for (const set of completed.filter((s) => s.kind === "topic_assessment")) {
      const topicId = set.topic_ids[0]!;
      const valid = (setAttempts.get(set.id) ?? [])
        .filter((a) => a.reason !== "invalid_response")
        .sort((a, b) => a.answered_at - b.answered_at);
      const responses: ScoringResponse[] = [];
      for (const a of valid) {
        const fromBatch = prepared.find((p) => p.request.client_id === a.client_id);
        const item =
          fromBatch?.item ??
          items.get(itemKey(a.item_id, a.item_version)) ??
          (await store.getItem(a.item_id, a.item_version));
        /* c8 ignore next */
        if (!item) continue;
        responses.push({
          eventId: a.client_id,
          itemId: a.item_id,
          itemVersion: String(a.item_version),
          answeredAt: a.answered_at,
          learningDay: a.learning_day,
          setId: set.id,
          correct: a.is_correct,
          difficulty: item.difficulty,
          application: isApplication(item),
          responseMs: a.response_ms,
          quick: isQuick(item),
          hintShown: a.hint_shown,
          explanationShown: false,
          keyOnDevice: a.key_on_device,
          offline: a.key_on_device,
          grownup: ctx.grownup === true,
        });
      }
      const last = valid[valid.length - 1];
      events.push({
        topicId,
        lastAttempt: last?.client_id ?? set.id,
        day: last?.learning_day ?? today,
        event: { eventId: `assessment:${set.id}`, kind: "assessment", occurredAt: now, responses },
      });
    }

    const masteryChanges: ResponsesSubmitResponse["mastery_changes"][number][] = [];
    const masteryRows: MasteryEventRecord[] = [];
    const levelAwards: StardustEvent[] = [];
    for (const { topicId, event, lastAttempt, day } of events) {
      const before = await stateFor(topicId);
      const { state, reason } = updateMastery(before, event);
      states.set(topicId, state);
      if (state.level !== before.level) {
        masteryChanges.push({
          topic_id: topicId,
          from: masteryCode(before.level),
          to: masteryCode(state.level),
        });
        masteryRows.push({
          id: deps.ids.uuid(),
          child_id: child.id,
          topic_id: topicId,
          from_level: before.level,
          to_level: state.level,
          cause: reason,
          attempt_id: lastAttempt,
          created_at: now,
        });
        levelAwards.push({
          id: `level:${topicId}:${state.level}`,
          day,
          kind: "level",
          topicId,
          level: state.level,
        });
      }
      if (before.firstReachedLevel2At === null && state.firstReachedLevel2At !== null) {
        const scheduled = scheduleReviews({
          topicId,
          reachedLevel2Day: learningDay(state.firstReachedLevel2At, child.timezone),
          ...(child.exam_date ? { examDay: child.exam_date } : {}),
        });
        const reviews = await store.listReviews(child.id);
        await store.putReviews(child.id, [...reviews, ...scheduled.reviews]);
      }
    }
    for (const [topicId, state] of states)
      if (events.some((e) => e.topicId === topicId)) await store.putMastery(child.id, state);
    await store.insertMasteryEvents(masteryRows);

    // 6. Finish completed sets: review bookkeeping and placement strand results.
    const reviewAwards: StardustEvent[] = [];
    const reviewDays = new Map<string, number>();
    let placement: ResponsesSubmitResponse["placement"];
    for (const set of completed) {
      let result: PlacementStrandResult[] | null = null;
      if (set.kind === "review") {
        reviewAwards.push({ id: `review:${set.id}`, day: today, kind: "review" });
        reviewDays.set(today, (reviewDays.get(today) ?? 0) + 1);
        const reviews = await store.listReviews(child.id);
        await store.putReviews(
          child.id,
          reviews.filter((r) => !(set.review_topic_ids.includes(r.topicId) && r.dueDay <= today)),
        );
      }
      if (set.kind === "placement") {
        const strandOf = new Map(
          (await store.topicStrands(set.topic_ids)).map((s) => [s.topic_id, s.strand_id]),
        );
        const tally = new Map<string, { correct: number; answered: number }>();
        const firstPerItem = new Map<string, AttemptRecord>();
        for (const a of setAttempts.get(set.id) ?? [])
          if (!firstPerItem.has(a.item_id)) firstPerItem.set(a.item_id, a);
        for (const a of firstPerItem.values()) {
          const strand = strandOf.get(a.topic_id);
          /* c8 ignore next */
          if (!strand) continue;
          const t = tally.get(strand) ?? { correct: 0, answered: 0 };
          tally.set(strand, {
            correct: t.correct + (a.is_correct ? 1 : 0),
            answered: t.answered + 1,
          });
        }
        result = [...tally.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([strand_id, t]) => ({
            strand_id,
            ...t,
            label: placementStrandResult(t.correct, t.answered),
          }));
        placement = result.map(({ strand_id, label }) => ({ strand_id, label }));
      }
      await store.updateSet({ ...set, finished_at: now, placement: result });
    }

    // 7. Stardust: responses, then level-ups, then completed review sets.
    let stardust = (await store.getStardust(child.id)) ?? initialStardust();
    const ledger: LedgerRow[] = [];
    const awarded = new Map<string, number>();
    const award = (event: StardustEvent, refId: string) => {
      const next = awardStardust(stardust, event);
      if (next.state === stardust) return;
      stardust = next.state;
      awarded.set(event.id, next.awarded);
      ledger.push({
        id: deps.ids.uuid(),
        child_id: child.id,
        event: event.kind,
        amount: next.awarded,
        learning_day: event.day,
        ref_id: refId,
        created_at: now,
      });
    };
    for (const p of prepared)
      award(
        {
          id: p.request.client_id,
          day: p.scoring.learningDay,
          kind: "response",
          correct: p.scoring.correct,
          scored: p.result!.scored,
          dueReview: p.set.kind === "review" && p.set.review_topic_ids.includes(p.item.topic_id),
        },
        p.request.client_id,
      );
    for (const event of levelAwards) award(event, event.id);
    for (const event of reviewAwards) award(event, event.id.slice("review:".length));
    await store.putStardust(child.id, stardust);
    await store.appendLedger(ledger);

    // 8. Activity days (qualifying: 5 scored responses or a completed review set).
    const scoredByDay = new Map<string, number>();
    for (const a of attempts)
      scoredByDay.set(a.learning_day, (scoredByDay.get(a.learning_day) ?? 0) + (a.scored ? 1 : 0));
    for (const day of new Set([...scoredByDay.keys(), ...reviewDays.keys()])) {
      const prior = await store.getActivityDay(child.id, day);
      const scored_count = (prior?.scored_count ?? 0) + (scoredByDay.get(day) ?? 0);
      const review_sets_done = (prior?.review_sets_done ?? 0) + (reviewDays.get(day) ?? 0);
      const qualifying = scored_count >= 5 || review_sets_done > 0;
      const next: ActivityDay = {
        child_id: child.id,
        learning_day: day,
        scored_count,
        review_sets_done,
        qualifying,
        credited_by: qualifying ? "activity" : (prior?.credited_by ?? null),
      };
      await store.putActivityDay(next);
    }

    // 9. Results in request order, replays included.
    const replayStardust = new Map(
      (await store.ledgerByRefs(child.id, [...existing.keys()])).map((row) => [
        row.ref_id,
        row.amount,
      ]),
    );
    const results: SubmitResult[] = [];
    for (const r of request.responses) {
      const stored =
        existing.get(r.client_id) ?? attempts.find((a) => a.client_id === r.client_id)!;
      const item =
        items.get(itemKey(stored.item_id, stored.item_version)) ??
        (await store.getItem(stored.item_id, stored.item_version));
      results.push({
        client_id: r.client_id,
        is_correct: stored.is_correct,
        scored: stored.scored,
        explanation_html: item?.explanation ?? "",
        stardust: existing.has(r.client_id)
          ? (replayStardust.get(r.client_id) ?? 0)
          : (awarded.get(r.client_id) ?? 0),
      });
    }
    const streak = await store.getStreak(child.id);
    return {
      results,
      mastery_changes: masteryChanges,
      stardust_today: stardust.byDay[today] ?? 0,
      run_length: streak?.run ?? 0,
      ...(placement ? { placement } : {}),
    };
  });
}
