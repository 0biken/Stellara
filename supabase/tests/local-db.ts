import postgres from "postgres";
export function localDatabase(max = 1) {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const target = new URL(url);
  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.port !== "54322" ||
    target.pathname !== "/postgres"
  )
    throw new Error("Tests require the disposable local Stellara database on port 54322");
  return postgres(url, { max });
}
