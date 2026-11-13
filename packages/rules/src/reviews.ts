export interface ReviewDueTopic {
  readonly topicId: string;
  readonly dueDay: string;
}
export interface ReviewScheduleInput {
  readonly topicId: string;
  readonly reachedLevel2Day: string;
  readonly examDay?: string;
}
export interface ReviewScheduleResult {
  readonly status: "scheduled" | "no_future_slot";
  readonly reviews: readonly ReviewDueTopic[];
}

function calendarEpoch(day: string): number {
  const epoch = Date.parse(`${day}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(epoch) ||
    new Date(epoch).toISOString().slice(0, 10) !== day
  )
    throw new RangeError("Invalid calendar day");
  return epoch;
}

export function scheduleReviews(input: ReviewScheduleInput): ReviewScheduleResult {
  const anchor = calendarEpoch(input.reachedLevel2Day);
  const available =
    input.examDay === undefined
      ? 30
      : Math.max(0, (calendarEpoch(input.examDay) - anchor) / 86_400_000 - 3);
  const scale = Math.min(1, available / 30);
  const offsets = [
    ...new Set(
      [3, 10, 30].map((offset) => Math.floor(offset * scale)).filter((offset) => offset > 0),
    ),
  ];
  const reviews = offsets.map((offset) => ({
    topicId: input.topicId,
    dueDay: new Date(anchor + offset * 86_400_000).toISOString().slice(0, 10),
  }));
  return { status: reviews.length > 0 ? "scheduled" : "no_future_slot", reviews };
}

export function selectDueTopics(
  reviews: readonly ReviewDueTopic[],
  today: string,
): readonly ReviewDueTopic[] {
  calendarEpoch(today);
  const earliest = new Map<string, ReviewDueTopic>();
  for (const review of reviews) {
    calendarEpoch(review.dueDay);
    if (review.dueDay > today) continue;
    const prior = earliest.get(review.topicId);
    if (prior === undefined || review.dueDay < prior.dueDay)
      earliest.set(review.topicId, { ...review });
  }
  return [...earliest.values()]
    .sort((a, b) =>
      a.dueDay < b.dueDay ? -1 : a.dueDay > b.dueDay ? 1 : a.topicId < b.topicId ? -1 : 1,
    )
    .slice(0, 3);
}
