import { z } from "zod";
import { argon2id, argon2Verify } from "hash-wasm";
import { startSet, submitResponses } from "@stellara/runtime";
import { PgStore } from "./pg-store.ts";
import { ApiError, cors, fail, json } from "./http.ts";
import { guardian, childClaims, validSession, signChild } from "./auth.ts";
import type { Environment } from "./auth.ts";
import type { Sql, TransactionSql } from "postgres";

const text = z.string().trim().min(1).max(100);
const pin = z.array(z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/)).length(4);
const declaration = z.object({ is_adult: z.literal(true) });
const consentStart = z.object({
  notice_version: text,
  purposes: z.object({ core_learning: z.literal(true) }).catchall(z.boolean()),
  declaration,
});
const consentConfirm = z.object({
  consent_id: z.uuid(),
  declaration: declaration.extend({ is_parent_or_guardian: z.literal(true) }),
});
const childCreate = z.object({
  consent_id: z.uuid(),
  first_name: text,
  avatar_key: text,
  year: z.number().int().min(1).max(6),
  exam_date: z.iso.date().optional(),
  timezone: z
    .string()
    .default("Africa/Lagos")
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
  pin,
});
const childSession = z.object({ child_id: z.uuid(), pin, device_id: z.uuid() });
const refresh = z.object({
  refresh_token: z.string().regex(/^[0-9a-f]{64}$/),
  device_id: z.uuid(),
});
const parse = <T extends z.ZodType>(schema: T, body: unknown): z.output<T> => {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new ApiError("INVALID_REQUEST", 400, "The request was not in the expected shape.");
  return result.data;
};
function developmentConsent(env: Environment) {
  // declaration_v0 is a placeholder pending legal review, never production consent.
  if (!["local", "development", "test"].includes(env.environment))
    throw new ApiError(
      "CONSENT_METHOD_UNAVAILABLE",
      403,
      "Declaration consent is unavailable in this environment.",
    );
}
const consentRequired = () =>
  new ApiError("CONSENT_REQUIRED", 403, "Verified parent consent is required.");
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("");
export const tokenHash = async (token: string) =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
async function issue(
  q: Sql | TransactionSql,
  env: Environment,
  session: { id: string; child_id: string; guardian_id: string; expires_at: Date },
) {
  const refreshToken = hex(crypto.getRandomValues(new Uint8Array(32)));
  await q`insert into private.refresh_tokens(token_hash,session_id) values(${await tokenHash(refreshToken)},${session.id})`;
  const expiry = Math.min(Date.now() + 2 * 60 * 60 * 1000, new Date(session.expires_at).getTime());
  return {
    token: await signChild(
      env,
      { child_id: session.child_id, guardian_id: session.guardian_id, session_id: session.id },
      expiry,
    ),
    expires_at: new Date(expiry).toISOString(),
    refresh_until: new Date(session.expires_at).toISOString(),
    refresh_token: refreshToken,
  };
}
export type FunctionName =
  | "consent-start"
  | "consent-confirm"
  | "child-create"
  | "child-session"
  | "child-session-refresh"
  | "set-start"
  | "responses-submit";
export function handler(name: FunctionName, sql: Sql, env: Environment) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return json(
        { error: { code: "METHOD_NOT_ALLOWED", message: "Use POST.", retryable: false } },
        405,
      );
    try {
      if (Number(req.headers.get("content-length") ?? 0) > 65536)
        throw new ApiError("INVALID_REQUEST", 413, "Request too large.");
      const raw = await req.text();
      if (raw.length > 65536) throw new ApiError("INVALID_REQUEST", 413, "Request too large.");
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new ApiError("INVALID_REQUEST", 400, "Expected JSON.");
      }
      if (name === "set-start" || name === "responses-submit") {
        const claims = await childClaims(req, env);
        // All requests for this child lock the same row before checking session/consent or reading state.
        let result: unknown;
        await sql.begin(async (tx) => {
          await tx`select id from public.children where id::text=${claims.child_id} for update`;
          await validSession(tx, claims);
          const store = new PgStore(tx);
          const deps = {
            store,
            clock: { now: Date.now },
            ids: { uuid: () => crypto.randomUUID() },
            rng: { next: Math.random },
          };
          result = await (name === "set-start" ? startSet : submitResponses)(
            deps,
            { child_id: claims.child_id },
            body,
          );
          await tx`update public.children set last_active_at=now() where id=${claims.child_id}`;
        });
        return json(result);
      }
      if (name === "child-session-refresh") {
        const b = parse(refresh, body),
          hash = await tokenHash(b.refresh_token);
        const found =
          await sql`select s.* from private.child_sessions s join private.refresh_tokens t on t.session_id=s.id where t.token_hash=${hash}`;
        if (!found[0]) throw new ApiError("UNAUTHORIZED", 401, "Sign in again.");
        const session = found[0];
        let result: unknown,
          invalid = false;
        await sql.begin(async (tx) => {
          await tx`select id from public.children where id=${session.child_id} for update`;
          const tokens =
            await tx`select t.*,s.device_id from private.refresh_tokens t join private.child_sessions s on s.id=t.session_id where token_hash=${hash} for update of t,s`;
          const token = tokens[0];
          if (!token || token.device_id !== b.device_id || token.consumed_at) {
            await tx`update private.child_sessions set revoked_at=now() where id=${session.id}`;
            invalid = true;
            return;
          }
          await validSession(tx, {
            child_id: session.child_id,
            guardian_id: session.guardian_id,
            session_id: session.id,
          });
          await tx`update private.refresh_tokens set consumed_at=now() where token_hash=${hash}`;
          result = await issue(
            tx,
            env,
            session as { id: string; child_id: string; guardian_id: string; expires_at: Date },
          );
        });
        if (invalid) throw new ApiError("UNAUTHORIZED", 401, "Sign in again.");
        return json(result);
      }
      const guardianId = await guardian(req, env);
      if (name === "consent-start") {
        developmentConsent(env);
        const b = parse(consentStart, body);
        const rows =
          await sql`insert into public.consents(guardian_id,notice_version,purposes,method,declared_adult) values(${guardianId},${b.notice_version},${sql.json(b.purposes)},'declaration_v0',true) returning id,created_at`;
        return json({
          consent_id: rows[0]!.id,
          verification: {
            method: "declaration_v0",
            expires_at: new Date(new Date(rows[0]!.created_at).getTime() + 86400000).toISOString(),
          },
        });
      }
      if (name === "consent-confirm") {
        developmentConsent(env);
        const b = parse(consentConfirm, body);
        const rows =
          await sql`update public.consents set verified_at=coalesce(verified_at,now()) where id=${b.consent_id} and guardian_id=${guardianId} and withdrawn_at is null and (verified_at is not null or created_at>now()-interval '1 day') returning verified_at`;
        if (!rows[0]) throw consentRequired();
        return json({
          consent_id: b.consent_id,
          status: "verified",
          method: "declaration_v0",
          verified_at: rows[0].verified_at,
        });
      }
      if (name === "child-create") {
        developmentConsent(env);
        const b = parse(childCreate, body);
        const pinHash = await argon2id({
          password: JSON.stringify(b.pin),
          salt: crypto.getRandomValues(new Uint8Array(16)),
          parallelism: 1,
          iterations: 3,
          memorySize: 19456,
          hashLength: 32,
          outputType: "encoded",
        });
        let id = "";
        await sql.begin(async (tx) => {
          const consents =
            await tx`select id from public.consents where id=${b.consent_id} and guardian_id=${guardianId} and verified_at is not null and withdrawn_at is null and child_id is null for update`;
          if (!consents[0]) throw consentRequired();
          const rows =
            await tx`insert into public.children(guardian_id,first_name,avatar_key,year,exam_date,timezone,pin_hash) values(${guardianId},${b.first_name},${b.avatar_key},${b.year},${b.exam_date ?? null},${b.timezone},${pinHash}) returning id`;
          id = rows[0]!.id;
          await tx`update public.consents set child_id=${id} where id=${b.consent_id}`;
        });
        return json({ child_id: id });
      }
      const b = parse(childSession, body);
      let result: unknown, failure: ApiError | undefined;
      await sql.begin(async (tx) => {
        const rows =
          await tx`select * from public.children where id=${b.child_id} and guardian_id=${guardianId} for update`;
        const c = rows[0];
        if (!c) throw new ApiError("CHILD_NOT_FOUND", 404, "This child profile was not found.");
        if (c.status !== "active")
          throw new ApiError("CHILD_INACTIVE", 403, "This profile is inactive.");
        if (
          !(
            await tx`select id from public.consents where child_id=${c.id} and guardian_id=${guardianId} and verified_at is not null and withdrawn_at is null`
          ).length
        )
          throw consentRequired();
        if (c.locked_until && new Date(c.locked_until).getTime() > Date.now())
          throw new ApiError("PROFILE_LOCKED", 423, "Try again later.", {
            locked_until: new Date(c.locked_until).toISOString(),
          });
        if (!(await argon2Verify({ password: JSON.stringify(b.pin), hash: c.pin_hash }))) {
          const count = c.failed_pin_count + 1;
          if (count >= 5) {
            const until = new Date(Date.now() + 300000);
            await tx`update public.children set failed_pin_count=0,locked_until=${until} where id=${c.id}`;
            failure = new ApiError("PROFILE_LOCKED", 423, "Try again later.", {
              locked_until: until.toISOString(),
            });
          } else {
            await tx`update public.children set failed_pin_count=${count},locked_until=null where id=${c.id}`;
            failure = new ApiError("PIN_INCORRECT", 401, "Try your picture key again.", {
              attempts_left: 5 - count,
            });
          }
          return;
        }
        await tx`update public.children set failed_pin_count=0,locked_until=null where id=${c.id}`;
        await tx`update private.child_sessions set revoked_at=now() where child_id=${c.id} and device_id=${b.device_id} and revoked_at is null`;
        const sessions =
          await tx`insert into private.child_sessions(child_id,guardian_id,device_id,expires_at) values(${c.id},${guardianId},${b.device_id},now()+interval '30 days') returning *`;
        result = await issue(
          tx,
          env,
          sessions[0] as { id: string; child_id: string; guardian_id: string; expires_at: Date },
        );
      });
      if (failure) throw failure;
      return json(result);
    } catch (e) {
      return fail(e);
    }
  };
}
