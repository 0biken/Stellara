import postgres from "postgres";
import type { Environment } from "./auth.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
export const sql = postgres(required("SUPABASE_DB_URL"), {
  max: 3,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const env: Environment = {
  url: required("SUPABASE_URL"),
  anonKey: required("SUPABASE_ANON_KEY"),
  jwtSecret: Deno.env.get("STELLARA_JWT_SECRET") ?? required("SUPABASE_JWT_SECRET"),
  environment: Deno.env.get("ENVIRONMENT") ?? "production",
};
