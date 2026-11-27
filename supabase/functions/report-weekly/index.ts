import { handler } from "../_shared/backend.generated.js";

Deno.serve(handler("report-weekly"));
