import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { argon2id, argon2Verify } from "npm:hash-wasm@4.12.0";
import { jwtVerify, SignJWT } from "npm:jose@6.1.3";
import postgres from "npm:postgres@3.4.8";

import {
  answerKey,
  getLesson,
  getOwnedSet,
  getPlacementConfig,
  gradeResponse,
  RuntimeError,
  setStartRequestSchema,
  startSet,
  submitResponses,
} from "../../../packages/runtime/src/index.ts";
import { runtimeStore } from "./store.js";

const pictures = new Set(["sun", "moon", "leaf", "flower", "fish", "ball", "cup", "house", "kite"]);
const levels = ["not_assessed", "foundation", "developing", "proficient", "advanced", "mastered"];
const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const notice = "2026-11-v1";
const declaration = "declaration_v0";
const issuer = "stellara-child";
const audience = "stellara-learning";
const maxBodyBytes = 65_536;
const guardianRoutes = new Set([
  "consent-start",
  "consent-confirm",
  "child-create",
  "child-session",
  "child-update",
  "child-status",
  "child-pin-reset",
  "consent-withdraw",
]);

function required(name) {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Missing backend configuration");
  return value;
}

let connection;
function database() {
  const url =
    Deno.env.get("STELLARA_ENV") === "local"
      ? (Deno.env.get("STELLARA_RUNTIME_DB_URL") ?? required("SUPABASE_DB_URL"))
      : required("STELLARA_RUNTIME_DB_URL");
  return (connection ??= postgres(url, {
    prepare: false,
    max: 2,
    idle_timeout: 15,
    connect_timeout: 10,
  }));
}

class ApiError extends Error {
  constructor(status, code, details = {}) {
    super(code);
    this.status = status;
    this.details = details;
  }
  body() {
    return {
      error: {
        code: this.message,
        message: this.message,
        retryable: this.status === 429,
        ...this.details,
      },
    };
  }
}

function uuid(value) {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new ApiError(400, "INVALID_REQUEST");
  return value.toLowerCase();
}

function pin(value) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((p) => pictures.has(p))) {
    throw new ApiError(400, "PIN_INVALID");
  }
  return value;
}

function secret(name) {
  const value = required(name);
  if (new TextEncoder().encode(value).length < 32) throw new Error("Backend secret is too short");
  return new TextEncoder().encode(value);
}

async function pinMaterial(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret("STELLARA_PIN_PEPPER"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pin(value).join(":"))),
  );
}

async function hashPin(value) {
  return argon2id({
    password: await pinMaterial(value),
    salt: crypto.getRandomValues(new Uint8Array(16)),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });
}

const invalid = () => new ApiError(400, "INVALID_REQUEST");
const unauthorized = () => new ApiError(401, "UNAUTHORIZED");
const noSession = () => new ApiError(401, "NO_CHILD_SESSION");
const consentRequired = () => new ApiError(403, "CONSENT_REQUIRED");

function profileInput(body, current) {
  const first = "first_name" in body ? body.first_name : current?.first_name;
  const year = "year" in body ? body.year : current?.year;
  const avatar = "avatar_key" in body ? body.avatar_key : current?.avatar_key;
  const exam = "exam_date" in body ? body.exam_date : (current?.exam_date ?? null);
  const zone = "timezone" in body ? body.timezone : (current?.timezone ?? "Africa/Lagos");
  if (
    typeof first !== "string" ||
    !/^[\p{L}][\p{L}\p{M}' -]{0,29}$/u.test(first.trim()) ||
    !["P4", "P5", "P6"].includes(year) ||
    !pictures.has(avatar) ||
    (exam !== null &&
      (typeof exam !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(exam) ||
        !Number.isFinite(Date.parse(exam)) ||
        new Date(exam).toISOString().slice(0, 10) !== exam)) ||
    typeof zone !== "string" ||
    zone.length > 80
  )
    throw invalid();
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    throw invalid();
  }
  return { first: first.trim(), year, avatar, exam, zone };
}

function allowDeclaration(user) {
  const environment = Deno.env.get("STELLARA_ENV");
  const allowed = (Deno.env.get("STELLARA_STAGING_TEST_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const host = new URL(required("SUPABASE_URL")).hostname;
  const local =
    ["kong", "127.0.0.1", "localhost", "host.docker.internal"].includes(host) ||
    /^supabase_kong_[a-z0-9_-]+$/i.test(host);
  return (
    (environment === "local" && local) ||
    (environment === "staging" &&
      user.email_confirmed_at &&
      user.email &&
      allowed.includes(user.email.toLowerCase()))
  );
}

async function guardianUser(token) {
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? required("SUPABASE_ANON_KEY");
  const client = createClient(required("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) throw unauthorized();
  return data.user;
}

async function rate(sql, scope, subject, limit, windowMs, now) {
  const bucket = Math.floor(now / windowMs) * (windowMs / 1000);
  const [row] =
    await sql`insert into stellara_private.rate_limits as r values (${scope},${subject},${bucket},1)
    on conflict (scope,subject,bucket) do update set hits=r.hits+1 where r.hits<${limit}
    returning hits`;
  return Boolean(row);
}

async function ownedChild(sql, guardian, child) {
  const [row] =
    await sql`select c.id,c.first_name,c.year,c.avatar_key,c.exam_date::text,c.timezone,c.status
    from public.children c join public.guardianships g on g.child_id=c.id
    where c.id=${child} and g.guardian_id=${guardian} and g.is_primary for update of c`;
  if (!row) throw new ApiError(404, "CHILD_NOT_FOUND");
  return row;
}

async function activeConsent(sql, guardian, child) {
  return (
    (
      await sql`select 1 from public.consents where guardian_id=${guardian} and child_id=${child}
    and verified_at is not null and withdrawn_at is null`
    ).length > 0
  );
}

async function revoke(sql, child) {
  await sql`delete from stellara_private.child_sessions where child_id=${child}`;
}

async function guardianAction(sql, route, user, body) {
  const guardian = user.id;
  const now = Date.now();
  if (route === "consent-start") {
    if (!allowDeclaration(user)) throw new ApiError(403, "VERIFICATION_UNAVAILABLE");
    const purposes = body.purposes;
    if (
      body.notice_version !== notice ||
      body.method !== declaration ||
      body.adult_declaration !== true ||
      purposes?.core_learning !== true ||
      typeof purposes.progress_messages !== "boolean" ||
      typeof purposes.product_research !== "boolean"
    )
      throw invalid();
    const savedPurposes = {
      core_learning: true,
      progress_messages: purposes.progress_messages,
      product_research: purposes.product_research,
    };
    await sql`insert into public.profiles (id) values (${guardian}) on conflict do nothing`;
    const expires = new Date(now + 15 * 60_000).toISOString();
    const [row] =
      await sql`insert into public.consents (guardian_id,notice_version,purposes,method,expires_at)
      values (${guardian},${notice},${sql.json(savedPurposes)},${declaration},${expires}) returning id`;
    return { consent_id: row.id, verification: { method: declaration, expires_at: expires } };
  }
  if (route === "consent-confirm") {
    if (!allowDeclaration(user)) throw new ApiError(403, "VERIFICATION_UNAVAILABLE");
    const id = uuid(body.consent_id);
    const [row] = await sql`update public.consents set verified_at=coalesce(verified_at,now())
      where id=${id} and guardian_id=${guardian} and child_id is null and method=${declaration}
      and notice_version=${notice} and expires_at>now() and withdrawn_at is null returning id`;
    if (!row) throw consentRequired();
    return { consent_id: id, status: "verified" };
  }
  if (route === "child-create") {
    if (!allowDeclaration(user)) throw new ApiError(403, "VERIFICATION_UNAVAILABLE");
    const consent = uuid(body.consent_id);
    const profile = profileInput(body);
    const birth = body.birth_year ?? null;
    if (
      birth !== null &&
      (!Number.isInteger(birth) || birth < 1900 || birth > new Date().getUTCFullYear())
    )
      throw invalid();
    const [receipt] = await sql`select purposes,verified_at from public.consents
      where id=${consent} and guardian_id=${guardian} and child_id is null and method=${declaration}
      and notice_version=${notice} and verified_at is not null and withdrawn_at is null for update`;
    if (!receipt) throw consentRequired();
    const hashed = await hashPin(body.pin);
    const child = crypto.randomUUID();
    await sql`insert into public.children (id,created_by,consent_id,first_name,year,avatar_key,exam_date,timezone,birth_year)
      values (${child},${guardian},${consent},${profile.first},${profile.year},${profile.avatar},${profile.exam},${profile.zone},${birth})`;
    await sql`insert into public.guardianships (guardian_id,child_id) values (${guardian},${child})`;
    await sql`insert into public.consents (guardian_id,child_id,source_id,notice_version,purposes,method,expires_at,verified_at)
      values (${guardian},${child},${consent},${notice},${sql.json(receipt.purposes)},${declaration},'infinity',${receipt.verified_at})`;
    await sql`insert into stellara_private.child_pins (child_id,pin_hash) values (${child},${hashed})`;
    return { child_id: child };
  }

  const child = uuid(body.child_id);
  const current = await ownedChild(sql, guardian, child);
  if (route === "child-session") {
    const device = uuid(body.device_id);
    if (body.mode !== "family") throw invalid();
    pin(body.pin);
    if (!(await activeConsent(sql, guardian, child)) || current.status !== "active")
      throw consentRequired();
    const allowed = await rate(sql, "pin-device", guardian + ":" + device, 10, 300_000, now);
    const allowedGuardian = await rate(sql, "pin-guardian", guardian, 30, 300_000, now);
    const allowedChild = await rate(sql, "pin-child", child, 10, 300_000, now);
    if (!allowed || !allowedGuardian || !allowedChild) return new ApiError(429, "RATE_LIMITED");
    const [row] =
      await sql`select pin_hash,failed_count,locked_until from stellara_private.child_pins where child_id=${child}`;
    if (!row) throw new ApiError(404, "CHILD_NOT_FOUND");
    if (row.locked_until && +row.locked_until > now) {
      return new ApiError(423, "PROFILE_LOCKED", { locked_until: row.locked_until.toISOString() });
    }
    const correct = await argon2Verify({
      password: await pinMaterial(body.pin),
      hash: row.pin_hash,
    });
    if (!correct) {
      const failures = row.failed_count + 1;
      const locked = failures >= 5 ? new Date(now + 300_000).toISOString() : null;
      await sql`update stellara_private.child_pins set failed_count=${locked ? 0 : failures},
        locked_until=${locked} where child_id=${child}`;
      return locked
        ? new ApiError(423, "PROFILE_LOCKED", { locked_until: locked })
        : new ApiError(403, "PIN_INCORRECT", { attempts_left: 5 - failures });
    }
    await sql`update stellara_private.child_pins set failed_count=0,locked_until=null where child_id=${child}`;
    await sql`delete from stellara_private.child_sessions where child_id=${child} and (expires_at<=now() or device_id=${device})`;
    await sql`insert into stellara_private.devices (guardian_id,id) values (${guardian},${device})
      on conflict (guardian_id,id) do update set last_seen_at=now()`;
    const exp = Math.floor(now / 1000) + 7200;
    const expires = new Date(exp * 1000).toISOString();
    const [session] =
      await sql`insert into stellara_private.child_sessions (guardian_id,child_id,device_id,expires_at)
      values (${guardian},${child},${device},${expires}) returning id`;
    const token = await new SignJWT({ guardian_id: guardian, role: "child" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(child)
      .setJti(session.id)
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(secret("STELLARA_CHILD_JWT_SECRET"));
    return { token, expires_at: expires };
  }
  if (route === "child-pin-reset") {
    if (!(await activeConsent(sql, guardian, child))) throw consentRequired();
    const hashed = await hashPin(body.pin);
    await sql`update stellara_private.child_pins set pin_hash=${hashed},failed_count=0,locked_until=null where child_id=${child}`;
    await revoke(sql, child);
    return { ok: true };
  }
  if (route === "consent-withdraw") {
    await sql`update public.consents set withdrawn_at=now() where child_id=${child}
      and guardian_id=${guardian} and withdrawn_at is null`;
    await sql`update public.children set status='paused' where id=${child} and status='active'`;
    await revoke(sql, child);
    return { ok: true };
  }
  if (current.status === "deletion_pending" || !(await activeConsent(sql, guardian, child)))
    throw consentRequired();
  if (route === "child-update") {
    const profile = profileInput(body, current);
    const [updated] =
      await sql`update public.children set first_name=${profile.first},year=${profile.year},
      avatar_key=${profile.avatar},exam_date=${profile.exam},timezone=${profile.zone} where id=${child}
      returning id,first_name,year,avatar_key,exam_date::text,timezone,status`;
    return updated;
  }
  if (route === "child-status") {
    if (body.status !== "active" && body.status !== "paused") throw invalid();
    const [updated] = await sql`update public.children set status=${body.status} where id=${child}
      returning id,first_name,year,avatar_key,exam_date::text,timezone,status`;
    if (body.status === "paused") await revoke(sql, child);
    return updated;
  }
  throw invalid();
}

async function childClaims(token) {
  try {
    const verified = await jwtVerify(token, secret("STELLARA_CHILD_JWT_SECRET"), {
      issuer,
      audience,
      algorithms: ["HS256"],
      requiredClaims: ["exp", "sub", "jti", "iat"],
    });
    if (verified.payload.role !== "child") throw noSession();
    return {
      child: uuid(verified.payload.sub),
      guardian: uuid(verified.payload.guardian_id),
      session: uuid(verified.payload.jti),
    };
  } catch {
    throw noSession();
  }
}

async function childAction(sql, route, claims, body, now) {
  const { child, guardian, session } = claims;
  const current = await ownedChild(sql, guardian, child);
  const [valid] = await sql`select 1 from stellara_private.child_sessions where id=${session}
    and child_id=${child} and guardian_id=${guardian} and expires_at > now()`;
  if (!valid || current.status !== "active" || !(await activeConsent(sql, guardian, child)))
    throw noSession();

  const store = runtimeStore(sql);
  const ctx = { child_id: child };
  const deps = {
    store,
    clock: { now: () => now },
    ids: { uuid: () => crypto.randomUUID() },
    rng: { next: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 },
  };

  if (route === "set-start") {
    if (!(await rate(sql, route, child, 30, 3_600_000, now)))
      return new ApiError(429, "RATE_LIMITED");
    const parsed = setStartRequestSchema.safeParse(body);
    if (!parsed.success || parsed.data.assignment_id !== null) return invalid();
    if (parsed.data.kind === "placement") {
      const config = await getPlacementConfig(deps, ctx);
      if (config.active_set_id) {
        const set = await getOwnedSet(deps, ctx, config.active_set_id);
        const stored = await store.getSet(set.set_id);
        return {
          set_id: set.set_id,
          items: set.items,
          kind: set.kind,
          rules_version: stored.rules_version,
        };
      }
      if (config.completed) return new ApiError(409, "SET_CLOSED");
      parsed.data.topic_ids = [];
    }
    const set = await startSet(deps, ctx, parsed.data).catch((error) => {
      if (error instanceof RuntimeError) return error;
      throw error;
    });
    if (set instanceof RuntimeError) return set;
    return { ...set, kind: parsed.data.kind };
  }
  if (route === "responses-submit") {
    if (!(await rate(sql, route, child, 120, 600_000, now)))
      return new ApiError(429, "RATE_LIMITED");
    // Roll back a rejected batch while retaining the rate-limit charge.
    try {
      return await sql.savepoint(async (batch) => {
        const result = await submitResponses({ ...deps, store: runtimeStore(batch) }, ctx, body);
        await batch`update public.children set last_active_at=now() where id=${child}`;
        return result;
      });
    } catch (error) {
      if (error instanceof RuntimeError) return error;
      throw error;
    }
  }
  if (route === "placement-config") return getPlacementConfig(deps, ctx);
  if (route === "set-get") return getOwnedSet(deps, ctx, uuid(body.set_id));
  if (route === "lesson-get") return getLesson(deps, ctx, uuid(body.topic_id));
  if (route === "lesson-check") {
    const topic = uuid(body.topic_id);
    const itemId = uuid(body.item_id);
    if (
      !Number.isInteger(body.item_version) ||
      !body.response ||
      typeof body.response !== "object" ||
      Array.isArray(body.response)
    )
      throw invalid();
    const lesson = await getLesson(deps, ctx, topic);
    const permitted = lesson.cards.flatMap((card) =>
      card.kind === "check" ? [card.item] : card.kind === "try_it" ? card.items : [],
    );
    if (!permitted.some((item) => item.id === itemId && item.version === body.item_version))
      throw invalid();
    const item = await store.getItem(itemId, body.item_version);
    const correct = gradeResponse(answerKey(item), body.response) === true;
    // Try-it cards can share a practice pool. Record exposure before releasing their explanation.
    if (item.purpose !== "lesson_check") {
      await sql`insert into stellara_private.key_exposures (child_id,item_id) values (${child},${itemId}) on conflict do nothing`;
    }
    return { is_correct: correct, explanation_html: item.explanation };
  }
  if (route === "child-sky") {
    const rows = await sql`select n.id,n.title,coalesce((m.document->>'level')::int,0) as level,
      exists (select from stellara_private.lessons l where l.topic_id=n.id and l.published_at is not null) as has_lesson
      from stellara_private.curriculum_nodes n left join stellara_private.mastery_states m on m.topic_id=n.id and m.child_id=${child}
      where n.kind='topic' and n.year=${current.year} order by n.sort,n.id`;
    const topics = rows.map((row, i) => ({
      ...row,
      level: levels[row.level],
      x: 50 + 32 * Math.cos(i * 2.4),
      y: 50 + 32 * Math.sin(i * 2.4),
    }));
    const next = rows.find((row) => row.level < 5);
    const [seen] =
      await sql`select exists (select from stellara_private.sets where child_id=${child}) as any`;
    const placement = await getPlacementConfig(deps, ctx);
    return {
      topics,
      links: topics.slice(1).map((topic, i) => ({ from: topics[i].id, to: topic.id })),
      today: next ? { topic_id: next.id, topic_title: next.title, questions: 8, minutes: 5 } : null,
      first_visit: !seen.any,
      placement_done: placement.completed,
    };
  }
  throw new ApiError(404, "NOT_AVAILABLE");
}

async function requestBody(request) {
  if (Number(request.headers.get("content-length")) > maxBodyBytes) {
    throw new ApiError(413, "REQUEST_TOO_LARGE");
  }
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) throw new ApiError(413, "REQUEST_TOO_LARGE");
      raw += decoder.decode(value, { stream: true });
    }
    const body = JSON.parse(raw + decoder.decode());
    if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid();
    return body;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error instanceof ApiError ? error : invalid();
  } finally {
    reader.releaseLock();
  }
}

export function handler(route) {
  return async (request) => {
    const origin = request.headers.get("origin");
    const origins = (Deno.env.get("STELLARA_WEB_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim());
    const cors = {
      vary: "Origin",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers":
        "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
      ...(origin && origins.includes(origin) ? { "access-control-allow-origin": origin } : {}),
    };
    const json = (body, status = 200) =>
      Response.json(body, { status, headers: { ...cors, "cache-control": "no-store" } });
    try {
      if (origin && !origins.includes(origin)) throw new ApiError(403, "ORIGIN_DENIED");
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "POST") throw new ApiError(405, "METHOD_NOT_ALLOWED");
      const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
      if (!token) throw unauthorized();
      const body = await requestBody(request);
      const actor = guardianRoutes.has(route)
        ? await guardianUser(token)
        : await childClaims(token);
      const result = await database().begin(async (sql) => {
        await sql`set local role stellara_runtime`;
        return guardianRoutes.has(route)
          ? guardianAction(sql, route, actor, body)
          : childAction(sql, route, actor, body, Date.now());
      });
      if (result instanceof ApiError) return json(result.body(), result.status);
      if (result instanceof RuntimeError) return json(result.toEnvelope(), 400);
      return json(result);
    } catch (error) {
      if (error instanceof ApiError) return json(error.body(), error.status);
      if (error instanceof RuntimeError) return json(error.toEnvelope(), 400);
      if (
        route === "responses-submit" &&
        error?.code === "23505" &&
        error.constraint_name === "attempt_clients_pkey"
      ) {
        return json(
          {
            error: {
              code: "SUBMISSION_CONFLICT",
              message: "Retry the submission.",
              retryable: true,
            },
          },
          409,
        );
      }
      console.error("Stellara function failed", route, error?.name, error?.code ?? "");
      return json({ error: { code: "SERVER", message: "Request failed.", retryable: true } }, 500);
    }
  };
}
