/** Explicit calendar arithmetic. Never reads the ambient clock. */
export function addCalendarDays(day: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(days))
    throw new RangeError("Invalid calendar day");
  const value = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== day)
    throw new RangeError("Invalid calendar day");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function localParts(
  at: number,
  timezone: string,
): { day: string; hour: number; minute: number; second: number } {
  if (!Number.isFinite(at)) throw new RangeError("Invalid timestamp");
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (key: string) => p.find((x) => x.type === key)!.value;
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}
export function learningDay(at: number, timezone: string): string {
  const p = localParts(at, timezone);
  return p.hour < 3 ? addCalendarDays(p.day, -1) : p.day;
}
/** Finds the first instant belonging to a learning day, including skipped/repeated local hours. */
export function learningDayBounds(day: string, timezone: string): { start: number; end: number } {
  addCalendarDays(day, 0);
  const boundary = (target: string) => {
    const anchor = Date.parse(`${target}T03:00:00Z`);
    let low = anchor - 36 * 3600000,
      high = anchor + 36 * 3600000;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (learningDay(mid, timezone) < target) low = mid;
      else high = mid;
    }
    return high;
  };
  return { start: boundary(day), end: boundary(addCalendarDays(day, 1)) };
}
export interface TimeCreditInput {
  readonly recordedAt: number;
  readonly receivedAt: number;
  readonly deviceClockAtSync: number;
}
export function creditLearningDay(
  input: TimeCreditInput,
  timezone: string,
): { day: string; credited: boolean; source: "device" | "server" } {
  const delay = input.receivedAt - input.recordedAt;
  const credited = delay >= 0 && delay <= 72 * 3600000;
  const trusted = credited && Math.abs(input.deviceClockAtSync - input.receivedAt) < 600000;
  return {
    day: learningDay(trusted ? input.recordedAt : input.receivedAt, timezone),
    credited,
    source: trusted ? "device" : "server",
  };
}
