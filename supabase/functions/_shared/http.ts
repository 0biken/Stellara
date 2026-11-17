export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
export function fail(error: unknown): Response {
  if (error instanceof ApiError)
    return json(
      { error: { code: error.code, message: error.message, retryable: false, ...error.details } },
      error.status,
    );
  const e = error as { code?: string; toEnvelope?: () => unknown };
  if (typeof e?.toEnvelope === "function") {
    const status = e.code?.endsWith("_NOT_FOUND")
      ? 404
      : e.code === "SET_NOT_OWNED"
        ? 403
        : e.code === "SET_CLOSED"
          ? 409
          : 400;
    return json(e.toEnvelope(), status);
  }
  // No database values, PINs, tokens or request bodies are returned or logged.
  console.error("backend request failed", error instanceof Error ? error.name : "unknown");
  return json(
    { error: { code: "INTERNAL", message: "Something went wrong.", retryable: true } },
    500,
  );
}
