import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Canary scan supplements import boundaries; it is not a general secret scanner. */
export function checkClient(root) {
  const chunks = join(root, "apps/web/.next/static/chunks");
  if (!existsSync(chunks)) throw new Error("Build apps/web before auditing its production client.");
  const errors = [];
  const inspect = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (
        /\.[cm]?js$/.test(entry.name) &&
        /answer_verified_at|item_answers|v0\.1\.0|@stellara\/rules|@stellara\/content-schema\/server/.test(
          readFileSync(file, "utf8"),
        )
      )
        errors.push(`${file}: server-only content/rules canary in client bundle`);
    }
  };
  inspect(chunks);
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = checkClient(process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Production client audit passed: no answer-schema or rules canaries.");
}
