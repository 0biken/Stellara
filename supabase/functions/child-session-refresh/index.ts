import { handler } from "../_shared/handlers.ts";
import { sql, env } from "../_shared/db.ts";

Deno.serve(handler("child-session-refresh", sql, env));
