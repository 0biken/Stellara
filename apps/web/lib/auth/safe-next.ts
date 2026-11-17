export const defaultNext = "/family/";

const allowedPrefixes = ["/family"];

/**
 * Only same-origin portal paths may be used after sign-in, so the `next`
 * parameter can't send someone to another site or run a `javascript:` URL.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return defaultNext;
  }
  let path: string;
  try {
    const url = new URL(value, "https://stellara.invalid");
    if (url.origin !== "https://stellara.invalid") return defaultNext;
    path = url.pathname;
  } catch {
    return defaultNext;
  }
  const allowed = allowedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? path : defaultNext;
}
