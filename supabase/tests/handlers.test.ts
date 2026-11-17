import { localDatabase } from "./local-db.js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { topicItems, uuidFrom } from "@stellara/runtime/testing";
import { handler } from "../functions/_shared/handlers.ts";
import type { FunctionName } from "../functions/_shared/handlers.ts";
import { createHarness } from "./harness.js";

const sql = localDatabase(6);
const env = {
  url: "http://auth.test",
  anonKey: "local",
  jwtSecret: "local-tests-only-secret-with-32-characters",
  environment: "test",
};
const guardian = "eeeeeeee-0000-4000-8000-000000000001",
  topic = uuidFrom(2, 1),
  device = uuidFrom(9, 1);
const pin = ["sun", "kite", "drum", "star"];
const h = createHarness(sql);
beforeEach(async () => {
  await h.reset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) => {
      const headers = options.headers as Record<string, string>;
      return headers.Authorization === "Bearer parent"
        ? Response.json({ id: guardian, role: "authenticated", is_anonymous: false })
        : new Response(null, { status: 401 });
    }),
  );
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await sql.end();
});
async function call(name: FunctionName, body: unknown, token = "parent", environment = "test") {
  const res = await handler(name, sql, { ...env, environment })(
    new Request(`http://local/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
}
async function family() {
  const started = await call("consent-start", {
    notice_version: "m2-v0",
    purposes: { core_learning: true },
    declaration: { is_adult: true },
  });
  expect(started.status).toBe(200);
  const consent_id = started.body.consent_id;
  expect(
    (
      await call("consent-confirm", {
        consent_id,
        declaration: { is_adult: true, is_parent_or_guardian: true },
      })
    ).status,
  ).toBe(200);
  const created = await call("child-create", {
    consent_id,
    first_name: "Ada",
    avatar_key: "star",
    year: 5,
    pin,
  });
  expect(created.status).toBe(200);
  const child_id = created.body.child_id as string;
  const login = await call("child-session", { child_id, pin, device_id: device });
  expect(login.status).toBe(200);
  return { child_id, consent_id, ...login.body };
}
describe("local API handlers", () => {
  it("requires guardian authentication and blocks declaration consent in production", async () => {
    expect((await call("consent-start", {}, "invalid")).status).toBe(401);
    expect((await call("consent-start", {}, "parent", "production")).body.error.code).toBe(
      "CONSENT_METHOD_UNAVAILABLE",
    );
    expect(
      (
        await call("consent-start", {
          notice_version: "v0",
          purposes: { core_learning: false },
          declaration: { is_adult: true },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("child-create", {
          consent_id: uuidFrom(1, 9),
          first_name: "Ada",
          avatar_key: "star",
          year: 5,
          pin,
        })
      ).body.error.code,
    ).toBe("CONSENT_REQUIRED");
  });
  it("enforces five concurrent PIN failures, lockout and expiry", async () => {
    const f = await family();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        call("child-session", {
          child_id: f.child_id,
          pin: ["a", "b", "c", "d"],
          device_id: device,
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([401, 401, 401, 401, 423]);
    expect(
      (await call("child-session", { child_id: f.child_id, pin, device_id: device })).status,
    ).toBe(423);
    await sql`update public.children set locked_until=now()-interval '1 second' where id=${f.child_id}`;
    expect(
      (await call("child-session", { child_id: f.child_id, pin, device_id: device })).status,
    ).toBe(200);
    const c = (
      await sql`select failed_pin_count,locked_until,pin_hash from public.children where id=${f.child_id}`
    )[0]!;
    expect(c.failed_pin_count).toBe(0);
    expect(c.locked_until).toBeNull();
    expect(c.pin_hash).toMatch(/^\$argon2id\$/);
  });
  it("rotates refresh credentials without extending lifetime and revokes replayed families", async () => {
    const f = await family();
    const refreshed = await call(
      "child-session-refresh",
      { refresh_token: f.refresh_token, device_id: device },
      "",
    );
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refresh_token).not.toBe(f.refresh_token);
    expect(refreshed.body.refresh_until).toBe(f.refresh_until);
    const rows = await sql`select token_hash from private.refresh_tokens`;
    expect(
      rows.every(
        (r) => r.token_hash !== f.refresh_token && r.token_hash !== refreshed.body.refresh_token,
      ),
    ).toBe(true);
    expect(
      (
        await call(
          "child-session-refresh",
          { refresh_token: f.refresh_token, device_id: device },
          "",
        )
      ).status,
    ).toBe(401);
    expect(
      (await call("set-start", { kind: "practice", topic_ids: [topic] }, refreshed.body.token))
        .status,
    ).toBe(401);
  });
  it("rejects wrong device, expired, forged, revoked and inactive sessions", async () => {
    const f = await family();
    expect(
      (
        await call(
          "child-session-refresh",
          { refresh_token: f.refresh_token, device_id: uuidFrom(9, 2) },
          "",
        )
      ).status,
    ).toBe(401);
    expect((await call("set-start", {}, f.token)).status).toBe(401);
    expect((await call("set-start", {}, "garbage")).status).toBe(401);
    const expired = await new SignJWT({
      role: "child",
      child_id: f.child_id,
      guardian_id: guardian,
      session_id: uuidFrom(9, 9),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("stellara-child")
      .setAudience("authenticated")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(env.jwtSecret));
    expect((await call("set-start", {}, expired)).status).toBe(401);
    const login = await call("child-session", { child_id: f.child_id, pin, device_id: device });
    await sql`update public.children set status='paused' where id=${f.child_id}`;
    expect((await call("set-start", {}, login.body.token)).status).toBe(401);
  });
  it("writes real attempts, mastery and rewards; concurrent retries are idempotent", async () => {
    const f = await family();
    await h.seedItems(topicItems(topic, 10, 3));
    const started = await call("set-start", { kind: "practice", topic_ids: [topic] }, f.token);
    expect(started.status).toBe(200);
    expect(started.body.items).toHaveLength(10);
    expect(JSON.stringify(started.body)).not.toMatch(/"answer"|"explanation"|"reviewer_id"/);
    const now = new Date().toISOString();
    const batch = {
      device_clock: now,
      responses: started.body.items.map((item: { id: string; version: number }, n: number) => ({
        client_id: uuidFrom(6, n + 1),
        set_id: started.body.set_id,
        item_id: item.id,
        item_version: item.version,
        response: { choice: "a" },
        hint_shown: false,
        response_ms: 5000,
        recorded_at: now,
        key_on_device: false,
      })),
    };
    const results = await Promise.all([
      call("responses-submit", batch, f.token),
      call("responses-submit", batch, f.token),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(
      results[0]!.body.results.every(
        (r: { is_correct: boolean; scored: boolean }) => r.is_correct && r.scored,
      ),
    ).toBe(true);
    expect(Number((await sql`select count(*) from public.attempts`)[0]!.count)).toBe(10);
    expect(
      (await sql`select level from public.mastery_states where child_id=${f.child_id}`)[0]!.level,
    ).toBeGreaterThan(0);
    expect(
      Number((await sql`select count(*) from public.stardust_ledger`)[0]!.count),
    ).toBeGreaterThan(0);
    const before = (
      await sql`select total from public.stardust_state where child_id=${f.child_id}`
    )[0]!.total;
    await call("responses-submit", batch, f.token);
    expect(
      (await sql`select total from public.stardust_state where child_id=${f.child_id}`)[0]!.total,
    ).toBe(before);
    await sql`update public.consents set withdrawn_at=now() where id=${f.consent_id}`;
    expect((await call("set-start", {}, f.token)).status).toBe(401);
  });
});
