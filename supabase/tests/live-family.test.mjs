import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, createHash, verify } from "node:crypto";
import { execFileSync } from "node:child_process";

const url = process.env.STELLARA_TEST_URL;
const publishable = process.env.STELLARA_TEST_PUBLISHABLE_KEY;
const admin = process.env.STELLARA_TEST_SERVICE_KEY;

async function call(path, { body, token, key = publishable, status = 200 } = {}) {
  const reply = await fetch(url + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      apikey: key,
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await reply.json();
  assert.equal(reply.status, status, path + " " + (data?.error?.code ?? data?.error_code ?? ""));
  return data;
}

const edge = (route, token, body = {}, status = 200) =>
  call("/functions/v1/" + route, { token, body, status });

function localSql(statement) {
  const container = process.env.STELLARA_TEST_DB_CONTAINER ?? "supabase_db_stellara";
  assert.match(container, /^supabase_db_stellara(?:_proof)?$/);
  return execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { stdio: "pipe" },
  );
}

async function session() {
  const email = `stellara-${randomUUID()}@example.test`;
  const link = await call("/auth/v1/admin/generate_link", {
    key: admin,
    token: admin,
    body: { type: "magiclink", email },
  });
  const auth = await call("/auth/v1/verify", {
    body: {
      type: link.verification_type ?? link.properties?.verification_type,
      token_hash: link.hashed_token ?? link.properties?.hashed_token,
    },
  });
  assert.ok(auth.access_token);
  return auth;
}

const pin = ["sun", "kite", "leaf", "cup"];
const purposes = { core_learning: true, progress_messages: false, product_research: false };
const createConsent = async (guardian) =>
  (
    await edge("consent-start", guardian, {
      notice_version: "2026-11-v1",
      method: "declaration_v0",
      adult_declaration: true,
      purposes,
    })
  ).consent_id;
const childBody = (consent_id) => ({
  consent_id,
  first_name: "Tolu",
  year: "P5",
  avatar_key: "kite",
  exam_date: null,
  pin,
});

test("staff endpoint rejects guardians and enforces private roles", async () => {
  assert.match(url ?? "", /^http:\/\/(localhost|127\.0\.0\.1):/);
  const owner = await session();
  const writer = await session();
  await edge("admin", owner.access_token, { action: "operations" }, 403);
  const container = process.env.STELLARA_TEST_DB_CONTAINER ?? "supabase_db_stellara";
  assert.match(container, /^supabase_db_stellara(?:_proof)?$/);
  for (const user of [owner.user, writer.user]) assert.match(user.id, /^[a-f0-9-]{36}$/i);
  execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `insert into stellara_private.staff_members (user_id,role) values ('${owner.user.id}','super_admin'),('${writer.user.id}','author')`,
    ],
    { stdio: "pipe" },
  );
  assert.equal(
    (await edge("admin", owner.access_token, { action: "session" })).role,
    "super_admin",
  );
  await edge(
    "admin",
    writer.access_token,
    { action: "support", child_id: randomUUID(), reason: "Support investigation" },
    403,
  );
  await edge(
    "admin",
    owner.access_token,
    { action: "staff-set", user_id: owner.user.id, role: "admin", active: false },
    403,
  );
  await edge("admin", owner.access_token, {
    action: "staff-set",
    user_id: writer.user.id,
    role: "admin",
    active: true,
  });
  assert.ok(
    Array.isArray((await edge("admin", writer.access_token, { action: "operations" })).requests),
  );
  await edge(
    "admin",
    writer.access_token,
    { action: "support", child_id: randomUUID(), reason: "" },
    400,
  );
  await edge("admin", owner.access_token, {
    action: "staff-set",
    user_id: writer.user.id,
    role: "admin",
    active: false,
  });
  await edge("admin", writer.access_token, { action: "operations" }, 403);
});

test("local Supabase persists an isolated family practice journey", async () => {
  assert.match(url ?? "", /^http:\/\/(localhost|127\.0\.0\.1):/);
  assert.ok(publishable && admin, "Local Supabase test credentials are required");
  const { access_token: guardian } = await session();
  const { access_token: other } = await session();
  const consent = await createConsent(guardian);
  await edge("child-create", guardian, childBody(consent), 403);
  await edge("consent-confirm", other, { consent_id: consent }, 403);
  await edge("consent-confirm", guardian, { consent_id: consent });
  const { child_id } = await edge("child-create", guardian, childBody(consent));
  const exportRequest = await edge("data-request-export", guardian, { child_id });
  assert.equal(exportRequest.kind, "export");
  assert.equal(exportRequest.status, "pending");
  assert.equal((await edge("data-request-export", guardian, { child_id })).id, exportRequest.id);
  await edge("data-request-export", other, { child_id }, 404);

  assert.match(exportRequest.id, /^[a-f0-9-]{36}$/i);
  localSql(`update public.data_requests set status='completed' where id='${exportRequest.id}'`);
  const freshExport = await edge("data-request-export", guardian, { child_id });
  assert.notEqual(
    freshExport.id,
    exportRequest.id,
    "completed exports do not block a fresh request",
  );
  assert.equal(freshExport.status, "pending");
  assert.match(freshExport.id, /^[a-f0-9-]{36}$/i);
  localSql(`update public.data_requests set status='ready', download_url='https://example.test/export',
    download_expires_at=now()+interval '1 hour' where id='${freshExport.id}'`);
  assert.equal((await edge("data-request-export", guardian, { child_id })).id, freshExport.id);
  localSql(`update public.data_requests set download_expires_at=now()-interval '1 second'
    where id='${freshExport.id}'`);
  const renewedExport = await edge("data-request-export", guardian, { child_id });
  assert.notEqual(
    renewedExport.id,
    freshExport.id,
    "expired ready downloads can be requested again",
  );
  assert.equal(renewedExport.status, "pending");

  const rows = "/rest/v1/children?select=id,first_name";
  assert.deepEqual(await call(rows, { token: guardian }), [{ id: child_id, first_name: "Tolu" }]);
  assert.deepEqual(await call(rows, { token: other }), []);
  const device_id = randomUUID();
  const login = { child_id, device_id, mode: "family", pin };
  await edge("child-session", other, login, 404);
  const wrong = await edge(
    "child-session",
    guardian,
    { ...login, pin: ["sun", "sun", "sun", "sun"] },
    403,
  );
  assert.equal(wrong.error.attempts_left, 4);
  const { token } = await edge("child-session", guardian, login);
  const largeBody = `{"text":"${"🌟".repeat(20_000)}"}`;
  const chunks = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(largeBody));
      controller.close();
    },
  });
  const tooLarge = await fetch(url + "/functions/v1/child-sky", {
    method: "POST",
    headers: {
      apikey: publishable,
      authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    duplex: "half",
    body: chunks,
  });
  assert.equal(tooLarge.status, 413);
  const sky = await edge("child-sky", token);
  assert.ok(sky.first_visit && sky.today?.topic_id);
  const topic_id = sky.today.topic_id;
  if (process.env.STELLARA_TEST_PACKS === "1") {
    const built = await edge("pack-build", token, { topic_id });
    const downloaded = await edge("pack-get", token, { pack_id: built.pack_id });
    const { signature, ...manifest } = downloaded.manifest;
    assert.equal(manifest.child_id, child_id);
    assert.equal(
      createHash("sha256").update(JSON.stringify(downloaded.payload)).digest("hex"),
      manifest.sha256,
    );
    assert.ok(
      verify(
        null,
        Buffer.from(JSON.stringify(manifest)),
        manifest.public_key,
        Buffer.from(signature, "base64"),
      ),
    );
    await edge("pack-get", other, { pack_id: built.pack_id }, 401);
  }
  const lesson = await edge("lesson-get", token, { topic_id });
  const check = lesson.cards.find((card) => card.kind === "check").item;
  assert.equal(Object.hasOwn(check, "answer"), false);
  const checked = await edge("lesson-check", token, {
    topic_id,
    item_id: check.id,
    item_version: check.version,
    response: { choice: check.options[0].id },
  });
  assert.equal(typeof checked.is_correct, "boolean");

  const { set_id, items } = await edge("set-start", token, {
    kind: "practice",
    topic_ids: [topic_id],
  });
  assert.ok(
    items.length > 0 &&
      items.every((item) => !Object.hasOwn(item, "answer") && !Object.hasOwn(item, "explanation")),
  );
  const instant = new Date().toISOString();
  const responses = items.map((item) => ({
    client_id: randomUUID(),
    set_id,
    item_id: item.id,
    item_version: item.version,
    response: { choice: item.options[0].id },
    hint_shown: false,
    response_ms: 8200,
    recorded_at: instant,
    key_on_device: false,
  }));
  const rejected = await edge(
    "responses-submit",
    token,
    {
      responses: [...responses.slice(0, 1), { ...responses[1], item_version: 9999 }],
      device_clock: instant,
    },
    400,
  );
  assert.equal(rejected.error.code, "ITEM_VERSION_MISMATCH");
  const send = () => edge("responses-submit", token, { responses, device_clock: instant });
  const [first, second] = await Promise.all([send(), send()]);
  assert.deepEqual(first.results, second.results);
  assert.equal(first.stardust_today, second.stardust_today);
  assert.equal(first.results.length, items.length);
  assert.equal((await edge("set-get", token, { set_id })).completed, true);
  assert.equal((await edge("child-sky", token)).first_visit, false);

  const wrongPin = () =>
    edge("child-session", guardian, { ...login, pin: ["sun", "sun", "sun", "sun"] }, 403);
  const failures = await Promise.all([wrongPin(), wrongPin(), wrongPin(), wrongPin()]);
  assert.deepEqual(failures.map((value) => value.error.attempts_left).sort(), [1, 2, 3, 4]);
  await edge("child-session", guardian, { ...login, pin: ["sun", "sun", "sun", "sun"] }, 423);
  await edge("child-session", guardian, login, 423);
  await edge("data-request-delete", guardian, { child_id, confirmation: "DELETE wrong" }, 400);
  const deletion = await edge("data-request-delete", guardian, {
    child_id,
    confirmation: "DELETE Tolu",
  });
  assert.equal(deletion.kind, "deletion");
  assert.equal(
    (
      await edge("data-request-delete", guardian, {
        child_id,
        confirmation: "DELETE Tolu",
      })
    ).id,
    deletion.id,
  );
  await edge("consent-withdraw", guardian, { child_id });
  await edge("child-sky", token, {}, 401);
});
