// Publishes the web app to Vercel as a static, preview-mode site: no Supabase
// connection, accounts or emails. Needs `vercel login` first.
// Usage: node apps/web/scripts/deploy-vercel.mjs
import { execSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const run = (command, options) => execSync(command, { stdio: "inherit", cwd: root, ...options });

// Empty values override apps/web/.env.local, which may point at production.
// --force stops Turbo reusing a build made with other values.
run("pnpm turbo run build --filter=@stellara/web --force", {
  env: {
    ...process.env,
    GITHUB_PAGES: "true", // selects the static export
    NEXT_PUBLIC_BASE_PATH: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    NEXT_PUBLIC_PACK_PUBLIC_KEY: "",
    NEXT_PUBLIC_ADMIN_DEMO: "false",
  },
});
run("pnpm check:client");

// Only the built files are uploaded, from a new directory.
const site = mkdtempSync(join(tmpdir(), "stellara-site-"));
cpSync(join(root, "apps/web/out"), site, { recursive: true });

const files = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });

for (const file of files(site)) {
  if (/[a-z0-9]{20}\.supabase\.co/.test(readFileSync(file, "utf8")))
    throw new Error(`A Supabase project address is in the build: ${relative(site, file)}`);
  // Next.js on Windows writes prefetch files as __next.a/b.txt, but the browser
  // asks for __next.a.b.txt. Add the expected name. Linux builds need nothing.
  const parts = relative(site, file).split(sep);
  const start = parts.findIndex((part) => part.startsWith("__next."));
  if (start >= 0 && start < parts.length - 1)
    copyFileSync(file, join(site, ...parts.slice(0, start), parts.slice(start).join(".")));
}

writeFileSync(
  join(site, "vercel.json"),
  JSON.stringify({
    trailingSlash: true,
    headers: [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }],
  }),
);
run("vercel deploy --prod --yes --project stellara --create-if-missing", { cwd: site });
