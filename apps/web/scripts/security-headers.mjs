// One source of truth for Stellara's browser security policy (docs/md/07 §6).
// Used by the static-export CSP step (apply-csp.mjs) and by next.config.ts for
// hosts that can send response headers (Vercel, `next start`).

/** The origin of a URL, or null when the value is empty or not a URL. */
function originOf(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * The CSP directives. Only first-party scripts run: no third-party scripts and
 * no analytics; Supabase and Sentry are reached by fetch/WebSocket only.
 *
 * - `meta: true` builds the full policy for a <meta> tag (no frame-ancestors,
 *   which browsers ignore in <meta>).
 * - `meta: false` builds the header policy. Headers cannot know each static
 *   page's inline-script hashes, so this policy covers framing, plugins, base
 *   and form targets; the per-page <meta> covers scripts.
 */
export function cspDirectives({ env = process.env, scriptHashes = [], meta = true } = {}) {
  if (!meta) {
    return {
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'none'"],
      "form-action": ["'self'"],
    };
  }
  const connect = ["'self'"];
  const supabase = originOf(env.NEXT_PUBLIC_SUPABASE_URL);
  if (supabase) connect.push(supabase, supabase.replace(/^http/, "ws"));
  const sentry = originOf(env.NEXT_PUBLIC_SENTRY_DSN);
  if (sentry) connect.push(sentry);
  return {
    "default-src": ["'self'"],
    "script-src": ["'self'", ...scriptHashes],
    // React writes style attributes (motion, layout); styles cannot run code.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": connect,
    "media-src": ["'self'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };
}

export function serializeCsp(directives) {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

/** Response headers for hosts that can set them. */
export function securityHeaders(env = process.env) {
  return [
    { key: "Content-Security-Policy", value: serializeCsp(cspDirectives({ env, meta: false })) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
