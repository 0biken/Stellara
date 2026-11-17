/**
 * PII scrubbing for Sentry events (docs/md/07 §6, 11 §5).
 *
 * Nothing that can identify a child, parent or school member may leave the
 * device in an error report: no names, no answers, no emails, no phone numbers,
 * no auth codes or tokens. These helpers are pure so they can be tested without
 * the SDK and reused by any future server-side reporter.
 */
import type { Breadcrumb, ErrorEvent } from "@sentry/browser";

export const FILTERED = "[Filtered]";

/** Words that mark a key's value as personal or secret, at any depth. */
const SENSITIVE_WORDS = new Set([
  "name",
  "names",
  "nickname",
  "email",
  "mail",
  "phone",
  "msisdn",
  "answer",
  "answers",
  "response",
  "responses",
  "choice",
  "choices",
  "pin",
  "password",
  "passcode",
  "secret",
  "token",
  "otp",
  "code",
  "cookie",
  "cookies",
  "session",
  "dob",
  "birth",
  "birthday",
  "address",
  "note",
  "notes",
  "guardian",
  "parent",
  "child",
  "user",
  "text",
  "body",
]);

/** Splits `childName`, `join_code` or `X-Auth-Token` into lower-case words. */
export function isSensitiveKey(key: string): boolean {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  // HTTP status codes are diagnostics; join, class and auth codes are secrets.
  if (words.includes("status")) return false;
  return words.some((word) => SENSITIVE_WORDS.has(word));
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Nigerian and international phone numbers, and any long digit run (IDs, PINs written in text).
const PHONE = /(?:\+?\d[\d\s-]{8,}\d)/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL_ONE = new RegExp(EMAIL.source, "i");
const UUID_ONE = new RegExp(UUID.source, "i");
const QUOTED = /(["'“‘])(?:(?!\1).){1,200}\1/g;

/** Removes emails, phone-like numbers, UUIDs and quoted user text from free text. */
export function scrubText(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(UUID, "[id]")
    .replace(PHONE, "[number]")
    .replace(QUOTED, (_match, quote: string) => `${quote}[text]${quote}`);
}

/**
 * Drops the query string and fragment (auth callbacks carry codes and tokens
 * there) and replaces identifier-like path segments.
 */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/);
  const bare = cut === -1 ? url : url.slice(0, cut);
  const match = /^([a-z][a-z0-9+.-]*:\/\/[^/]+)?(.*)$/i.exec(bare);
  const origin = match?.[1] ?? "";
  const path = (match?.[2] ?? "")
    .split("/")
    .map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the raw segment; it is still checked below.
      }
      if (EMAIL_ONE.test(decoded) || UUID_ONE.test(decoded) || /\d{4,}/.test(decoded)) {
        return ":id";
      }
      return segment;
    })
    .join("/");
  return origin + path;
}

/** Deep-copies a value, filtering sensitive keys and scrubbing strings. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return FILTERED;
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? FILTERED : scrubValue(inner, depth + 1);
    }
    return out;
  }
  return value;
}

const SDK_CONTEXTS = new Set(["browser", "os", "device", "runtime", "culture", "trace"]);
const URL_KEYS = ["url", "from", "to"] as const;

/**
 * Keeps only navigation and network breadcrumbs, with scrubbed URLs. UI clicks
 * (selectors can include visible names) and console output are dropped.
 */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  const category = crumb.category ?? "";
  if (category.startsWith("ui.") || category === "console") return null;
  const data = crumb.data ? { ...crumb.data } : undefined;
  if (data) {
    for (const key of URL_KEYS) {
      if (typeof data[key] === "string") data[key] = scrubUrl(data[key] as string);
    }
  }
  const clean: Breadcrumb = { ...crumb };
  if (clean.message) clean.message = scrubText(clean.message);
  if (data) clean.data = scrubValue(data) as Record<string, unknown>;
  return clean;
}

/** Sentry `beforeSend`: strips identity, request bodies and free text. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event };
  delete scrubbed.user;
  delete scrubbed.server_name;

  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message);
  if (scrubbed.logentry?.message) {
    scrubbed.logentry = { message: scrubText(scrubbed.logentry.message) };
  }

  if (scrubbed.request) {
    const { url, headers } = scrubbed.request;
    const userAgent = headers?.["User-Agent"];
    scrubbed.request = {
      ...(url ? { url: scrubUrl(url) } : {}),
      ...(userAgent ? { headers: { "User-Agent": userAgent } } : {}),
    };
  }

  if (scrubbed.exception?.values) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((value) => {
        const clean = { ...value };
        if (clean.value) clean.value = scrubText(clean.value);
        if (clean.stacktrace?.frames) {
          clean.stacktrace = {
            ...clean.stacktrace,
            frames: clean.stacktrace.frames.map((frame) => {
              const bare = { ...frame };
              delete bare.vars;
              if (bare.abs_path) bare.abs_path = scrubUrl(bare.abs_path);
              if (bare.filename) bare.filename = scrubUrl(bare.filename);
              return bare;
            }),
          };
        }
        return clean;
      }),
    };
  }

  if (scrubbed.extra)
    scrubbed.extra = scrubValue(scrubbed.extra) as NonNullable<ErrorEvent["extra"]>;
  if (scrubbed.contexts) {
    const contexts: Record<string, unknown> = {};
    for (const [key, context] of Object.entries(scrubbed.contexts)) {
      // SDK-made contexts describe the device, not the person.
      contexts[key] = SDK_CONTEXTS.has(key) ? context : scrubValue(context);
    }
    scrubbed.contexts = contexts as NonNullable<ErrorEvent["contexts"]>;
  }
  if (scrubbed.tags) scrubbed.tags = scrubValue(scrubbed.tags) as NonNullable<ErrorEvent["tags"]>;
  if (scrubbed.breadcrumbs) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((crumb): crumb is Breadcrumb => crumb !== null);
  }
  return scrubbed;
}

const CHILD_SEGMENTS = new Set(["child", "sky", "learn", "practice", "test", "pin"]);
const SURFACES = new Set(["family", "school", "studio", "ops", "basic"]);

/**
 * Names the product surface for alert routing ("new issue in child runtime →
 * Slack", 11 §5) without sending the path itself.
 */
export function surfaceFromPath(pathname: string, basePath = ""): string {
  const local =
    basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const first = local.split("/").find(Boolean) ?? "";
  if (CHILD_SEGMENTS.has(first)) return "child";
  if (SURFACES.has(first)) return first;
  if (first === "sign-in" || first === "auth") return "auth";
  return "public";
}
