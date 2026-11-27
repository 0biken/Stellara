// Deploys the backend to the hosted project in production mode: no sample content,
// and consent stays closed. Applies any pending migrations without asking.
// Needs `npx supabase@2.95.0 login` first. Never prints secret values.
// Usage: node supabase/scripts/deploy-hosted.mjs
import { execSync } from "node:child_process";
import { createHash, createHmac, generateKeyPairSync, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ref = "oshcdrfwkekbcgsffxho"; // the only project this script touches
process.chdir(fileURLToPath(new URL("../../", import.meta.url)));

// Commands are fixed strings with relative paths.
const run = (command, stdio = "inherit") => execSync(command, { stdio });
const cli = (args, stdio) => run(`npx --yes supabase@2.95.0 ${args}`, stdio);

cli("db query --help"); // fail before changing anything if this command is missing

// 1. Secrets, generated once and kept in a git-ignored file. The file keeps its
// first name: losing track of it would generate new secrets.
const file = "supabase/.env.staging.local";
const saved = existsSync(file)
  ? Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
    )
  : {};
const random = () => randomBytes(32).toString("hex");
const keys = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
// The backend turns the literal \n sequences back into newlines.
const oneLine = (pem) => pem.trim().replaceAll("\n", "\\n");
const dbPassword = saved.STELLARA_DB_LOGIN_PASSWORD ?? random();
const env = {
  STELLARA_ENV: "production",
  STELLARA_WEB_ORIGINS: saved.STELLARA_WEB_ORIGINS ?? "http://localhost:3000",
  STELLARA_PIN_PEPPER: saved.STELLARA_PIN_PEPPER ?? random(),
  STELLARA_CHILD_JWT_SECRET: saved.STELLARA_CHILD_JWT_SECRET ?? random(),
  STELLARA_JOB_SECRET: saved.STELLARA_JOB_SECRET ?? random(),
  STELLARA_PACK_PRIVATE_KEY: saved.STELLARA_PACK_PRIVATE_KEY ?? oneLine(keys.privateKey),
  STELLARA_PACK_PUBLIC_KEY: saved.STELLARA_PACK_PUBLIC_KEY ?? oneLine(keys.publicKey),
  STELLARA_DB_LOGIN_PASSWORD: dbPassword, // local record only; also inside the URL below
};
const save = (path, entries) =>
  writeFileSync(
    path,
    Object.entries(entries)
      .filter(([, value]) => value)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
save(file, env); // saved before any remote change, so a failed run keeps the same values

// 2. Link and migrate. The sample seed is never loaded here.
run("pnpm supabase:prepare");
cli(`link --project-ref ${ref}`);
cli("db push --linked --yes");

// 3. Runtime login (only its SCRAM verifier is sent) and Vault secrets.
const salt = randomBytes(16);
const iterations = 4096;
const salted = pbkdf2Sync(dbPassword, salt, iterations, 32, "sha256");
const hmac = (label) => createHmac("sha256", salted).update(label).digest();
const stored = createHash("sha256").update(hmac("Client Key")).digest("base64");
const verifier = `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${stored}:${hmac("Server Key").toString("base64")}`;
const quote = (v) => `'${v.replaceAll("'", "''")}'`;
const vault = (name, value) => `
  select vault.update_secret(id, ${quote(value)}) from vault.secrets where name = ${quote(name)};
  select vault.create_secret(${quote(value)}, ${quote(name)})
    where not exists (select from vault.secrets where name = ${quote(name)});`;

mkdirSync("supabase/.temp", { recursive: true });
const sql = "supabase/.temp/staging-bootstrap.sql"; // git-ignored
writeFileSync(
  sql,
  `do $do$ begin
    if not exists (select from pg_roles where rolname = 'stellara_login') then
      create role stellara_login login noinherit;
    end if;
  end $do$;
  alter role stellara_login with login noinherit password ${quote(verifier)};
  grant stellara_runtime to stellara_login with inherit false, set true;
  ${vault("stellara_project_url", `https://${ref}.supabase.co`)}
  ${vault("stellara_job_secret", env.STELLARA_JOB_SECRET)}`,
  { mode: 0o600 },
);
try {
  // Result rows are discarded; errors still reach the terminal.
  cli(`db query --linked -f ${sql}`, ["ignore", "ignore", "inherit"]);
} finally {
  writeFileSync(sql, ""); // do not leave the secret in a second file
}

// 4. Function secrets, then every function (verify_jwt comes from config.toml).
const pooler = new URL(readFileSync("supabase/.temp/pooler-url", "utf8").trim());
pooler.username = `stellara_login.${ref}`;
pooler.password = dbPassword;
pooler.port = "6543"; // transaction mode
pooler.search = "?sslmode=require";
const upload = "supabase/.temp/.env.staging.upload";
const functionEnv = { ...env, STELLARA_RUNTIME_DB_URL: pooler.toString() };
delete functionEnv.STELLARA_DB_LOGIN_PASSWORD;
save(upload, functionEnv);
try {
  cli(`secrets set --project-ref ${ref} --env-file ${upload}`);
} finally {
  writeFileSync(upload, "");
}
cli(`functions deploy --project-ref ${ref} --use-api`);
console.log("Production deployment finished. Consent stays closed in this mode.");
