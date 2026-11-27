import { IntlMessageFormat } from "intl-messageformat";

import english from "./en-NG.json" with { type: "json" };
import hausa from "./ha.json" with { type: "json" };
import igbo from "./ig.json" with { type: "json" };
import yoruba from "./yo.json" with { type: "json" };

export type Locale = "en-NG" | "yo" | "ha" | "ig";
export type Catalogue = typeof english;
export type MessageKey = keyof Catalogue;
/** Argument contracts follow the ICU fields in the English source catalogue. */
export interface MessageArguments {
  "progress.count": { current: number; total: number };
  "question.header": { current: number; total: number };
  "sky.topicLabel": { topic: string };
  "days.count": { count: number };
  "days.inARow": { count: number };
  "stardust.amount": { amount: number };
  "money.amount": { amount: number };
  "pictureKey.progress": { count: number };
  "family.signedInAs": { name: string };
  "child.greetingFirst": { name: string };
  "child.greetingReturning": { name: string };
  "star.label": { topic: string; state: string };
  "todaySet.detail": { count: number; minutes: number };
  "practice.header": { topic: string; current: number; total: number };
  "practice.inARow": { count: number };
  "setDone.summary": { correct: number; total: number; stardust: number };
  "setDone.sprouted": { topic: string };
  "setDone.grew": { topic: string };
  "placement.header": { current: number; total: number };
  "report.pageTitle": { name: string };
  "report.period": { start: string; end: string };
  "report.statMastered": { count: number };
  "report.statInProgress": { count: number };
  "report.statActiveTerm": { count: number };
  "report.statActiveMonth": { count: number };
  "report.celebrateGain": { topic: string; gain: number };
  "report.celebrateRun": { name: string; days: number };
  "report.celebrateDays": { name: string; days: number };
  "report.nextEmpty": { name: string };
  "report.coverageRow": { paper: string; practised: number; total: number };
  "report.noteReview": { name: string; topics: string };
  "report.notePractise": { name: string; topics: string };
  "report.notePractiseAny": { name: string };
  "report.monthMastered": { name: string; topics: string };
  "report.monthPractised": { name: string; days: number; topics: string };
  "report.monthPractisedAny": { name: string; days: number };
  "report.empty": { name: string };
  "report.read": { name: string };
}
export type MessageValues<K extends MessageKey> = K extends keyof MessageArguments
  ? MessageArguments[K]
  : Record<string, never>;
const translations: Record<Locale, Partial<Catalogue>> = {
  "en-NG": english,
  yo: yoruba,
  ha: hausa,
  ig: igbo,
};
/** Messages use ICU-compatible text; untranslated catalogues fall back to en-NG. */
export function getCatalogue(locale: Locale = "en-NG"): Catalogue {
  const translated = translations[resolveLocale(locale)];
  return Object.fromEntries(
    Object.entries(english).map(([key, message]) => [
      key,
      validMessage(translated[key as MessageKey]) ?? message,
    ]),
  ) as Catalogue;
}

const intlLocales: Record<Locale, string> = {
  "en-NG": "en-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  ig: "ig-NG",
};

function resolveLocale(locale: Locale | undefined): Locale {
  return locale && Object.hasOwn(translations, locale) ? locale : "en-NG";
}

function validMessage(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export class I18nFormatError extends Error {
  constructor(
    public readonly key: string,
    public readonly locale: Locale,
    cause: unknown,
  ) {
    super(
      `Could not format message "${key}" (${locale}): ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = "I18nFormatError";
  }
}

/** Returns plain text only. Render through a framework text node, never innerHTML.
 * A missing translation uses English for both wording and ICU value formatting.
 */
export function formatMessage<K extends MessageKey>(
  key: K,
  ...args: K extends keyof MessageArguments
    ? [values: MessageValues<K>, locale?: Locale]
    : [values?: MessageValues<K>, locale?: Locale]
): string {
  const [values, locale] = args;
  if (!Object.hasOwn(english, key)) return key;
  const requestedLocale = resolveLocale(locale);
  const translated = validMessage(translations[requestedLocale][key]);
  const messageLocale = translated ? requestedLocale : "en-NG";
  const message = translated ?? english[key];
  try {
    const result = new IntlMessageFormat(
      message,
      intlLocales[messageLocale],
      {
        number: {
          naira: {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          },
        },
      },
      { ignoreTag: true },
    ).format(values);
    if (typeof result !== "string") throw new Error("Expected a plain text message");
    return result;
  } catch (cause) {
    throw new I18nFormatError(key, messageLocale, cause);
  }
}

export function formatNumber(value: number, locale: Locale = "en-NG"): string {
  return new Intl.NumberFormat(intlLocales[resolveLocale(locale)]).format(value);
}

/** Explicit timezone argument wins over options.timeZone; Lagos is the default. */
export function formatDate(
  value: Date | number,
  options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" },
  locale: Locale = "en-NG",
  timezone?: string,
): string {
  return new Intl.DateTimeFormat(intlLocales[resolveLocale(locale)], {
    ...options,
    timeZone: timezone ?? options.timeZone ?? "Africa/Lagos",
  }).format(value);
}
