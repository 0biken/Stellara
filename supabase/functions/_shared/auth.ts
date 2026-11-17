import { jwtVerify, SignJWT } from "jose";
import { ApiError } from "./http.ts";
import type { Sql, TransactionSql } from "postgres";

export interface Environment {
  url: string;
  anonKey: string;
  jwtSecret: string;
  environment: string;
}
const unauthenticated = () => new ApiError("UNAUTHORIZED", 401, "Sign in again.");
export function bearer(req: Request) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!match) throw unauthenticated();
  return match[1]!;
}
export async function guardian(req: Request, env: Environment): Promise<string> {
  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearer(req)}`, apikey: env.anonKey },
  });
  if (!response.ok) throw unauthenticated();
  const user = await response.json();
  if (typeof user.id !== "string" || user.is_anonymous || user.role !== "authenticated")
    throw unauthenticated();
  return user.id;
}
export async function childClaims(req: Request, env: Environment) {
  try {
    const { payload: p } = await jwtVerify(bearer(req), new TextEncoder().encode(env.jwtSecret), {
      algorithms: ["HS256"],
      audience: "authenticated",
      issuer: "stellara-child",
    });
    if (
      p.role !== "child" ||
      typeof p.child_id !== "string" ||
      typeof p.guardian_id !== "string" ||
      typeof p.session_id !== "string" ||
      !p.exp
    )
      throw unauthenticated();
    return { child_id: p.child_id, guardian_id: p.guardian_id, session_id: p.session_id };
  } catch {
    throw unauthenticated();
  }
}
export async function validSession(
  q: Sql | TransactionSql,
  claims: { child_id: string; guardian_id: string; session_id: string },
) {
  const rows =
    await q`select s.id from private.child_sessions s join public.children c on c.id=s.child_id
    where s.id::text=${claims.session_id} and c.id::text=${claims.child_id} and c.guardian_id::text=${claims.guardian_id}
    and s.guardian_id=c.guardian_id and s.revoked_at is null and s.expires_at>now() and c.status='active'
    and exists(select 1 from public.consents co where co.child_id=c.id and co.guardian_id=c.guardian_id and co.verified_at is not null and co.withdrawn_at is null)`;
  if (!rows.length) throw unauthenticated();
}
export async function signChild(
  env: Environment,
  c: { child_id: string; guardian_id: string; session_id: string },
  expires: number,
) {
  return new SignJWT({ role: "child", ...c })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("stellara-child")
    .setAudience("authenticated")
    .setSubject(c.child_id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expires / 1000))
    .sign(new TextEncoder().encode(env.jwtSecret));
}
