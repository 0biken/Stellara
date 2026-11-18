# Local M2 Edge Functions

Family-only home tutoring: parent consent, child picture key, practice and progress. Children never chat with AI. No deployment is configured.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm exec supabase status -o env
cp supabase/.env.example supabase/.env.local
# Set STELLARA_JWT_SECRET to the local JWT_SECRET printed above.
pnpm functions:serve
# In another terminal (Git Bash on Windows), with curl, jq, Node, pnpm and Docker:
bash scripts/m2-smoke.sh
```

## Integrated web check

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in ignored
`apps/web/.env.local` to the local API URL and anon/publishable key. Start the web
app with `pnpm --filter @stellara/web dev --port 3001`, then run:

```sh
node --env-file=apps/web/.env.local scripts/m2-web-smoke.mjs
```

The browser smoke test creates a disposable local parent account, completes consent
and child creation, signs in with the picture key, rotates the child session, and
answers the ten sample questions. It checks 90 Stardust, persisted Growing mastery,
new consent for another child, and credential removal on logout. Install Playwright
Chromium if needed (`pnpm exec playwright install chromium`). `WEB_BASE_URL` can
override the web origin; this test accepts localhost services only. Parent authentication
is bootstrapped through the local Auth API; delivery of Google/email sign-in is not tested.

The current live bank supports practice only. Lesson and placement screens remain
preview-only until their content and read contracts are available. Live incorrect
answers show the worked explanation directly, matching the backend's single-response
completion rule. Completed offline drafts retain pending answers, and submissions
queue behind an active sync while preserving client IDs.

Staging has not been provisioned. Staging deployment and verification remain pending;
the local result is not a staging or production approval.

`functions:bundle` builds the workspace runtime and bundles it, including Zod, into ignored `_shared/runtime.bundle.js`. Rebuild after changing runtime dependencies. The CLI supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_DB_URL` inside the function container. `STELLARA_JWT_SECRET` signs and verifies child tokens; `SUPABASE_JWT_SECRET` is its fallback. Never expose these secrets or the service-role key to the browser. Set `ENVIRONMENT=local` locally; missing/unknown environments fail closed for declaration consent.

All endpoints use `POST /functions/v1/<name>`, JSON bodies, and an `apikey` header containing the local anon key. Parent endpoints require `Authorization: Bearer <parent access token>`. Learning endpoints require a child access token. Refresh requires the opaque refresh credential in the body; a parent token is not required. OPTIONS returns 204. Gateway JWT verification is disabled because each handler verifies its own caller, including the custom child role.

**declaration_v0 is a placeholder pending legal review and must never be used in production.** Consent creation, confirmation and child creation refuse it outside local/development/test environments.

## Parent endpoints

### consent-start

Request: `{"notice_version":"m2-v0","purposes":{"core_learning":true},"declaration":{"is_adult":true}}`

200: `{"consent_id":"uuid","verification":{"method":"declaration_v0","expires_at":"ISO instant"}}`

The unverified declaration expires after 24 hours. Additional purpose values must be booleans.

### consent-confirm

Request: `{"consent_id":"uuid","declaration":{"is_adult":true,"is_parent_or_guardian":true}}`

200: `{"consent_id":"uuid","status":"verified","method":"declaration_v0","verified_at":"ISO instant"}`

Confirmation is idempotent for a verified, unwithdrawn declaration. Foreign, expired or withdrawn declarations return 403 CONSENT_REQUIRED.

### child-create

Request: `{"consent_id":"uuid","first_name":"Ada","avatar_key":"star","year":5,"pin":["sun","kite","drum","star"]}`

Optional `exam_date` is YYYY-MM-DD; `timezone` defaults to Africa/Lagos and must be a valid IANA zone. `year` is an integer 1–6. Each picture ID is 1–32 lowercase ASCII letters/digits/underscore/hyphen, starting with a letter; exactly four IDs are required and repetitions are permitted. A verified consent can be linked to one child only.

200: `{"child_id":"uuid"}`. Invalid/missing/used consent: 403 CONSENT_REQUIRED. PINs use Argon2id, a random 16-byte salt, 19 MiB memory, three iterations and one lane.

### child-session

Request: `{"child_id":"uuid","pin":["sun","kite","drum","star"],"device_id":"uuid"}`

200: `{"token":"child JWT","expires_at":"ISO instant","refresh_until":"ISO instant","refresh_token":"opaque credential"}`

JWTs expire after two hours and carry role=child, child_id, guardian_id, session_id, sub, issuer=stellara-child and audience=authenticated. Wrong keys return 401 PIN_INCORRECT with `error.attempts_left`. The fifth failure locks for five minutes and returns 423 PROFILE_LOCKED with `error.locked_until`; failures commit even though the HTTP response is an error. Other errors: 404 CHILD_NOT_FOUND, 403 CHILD_INACTIVE or CONSENT_REQUIRED. A new successful login revokes older sessions for the same child/device.

## Refresh endpoint

### child-session-refresh

Request: `{"refresh_token":"opaque credential","device_id":"uuid"}`

200: same shape as child-session. Store the replacement credential atomically and discard the old one. Each refresh rotates the credential; the original 30-day deadline never extends. Replaying a consumed credential or presenting it with a different device ID revokes that session family and returns 401 UNAUTHORIZED. Expired, inactive, revoked or consent-withdrawn sessions cannot refresh. Device ID binds the credential to a device identifier, not hardware attestation. Clients must serialize refresh calls to avoid treating a concurrent retry as replay. A lost refresh response requires picture-key login again.

Credentials are random 256-bit values; only SHA-256 hashes are stored. Child RLS and learning requests check session validity against current database state, so revocation also blocks existing access JWTs.

## Learning endpoints

### set-start

Request: `{"kind":"practice","topic_ids":["f0000000-0000-4000-8000-000000000001"]}`

Supported kinds: practice, review, topic_assessment, placement. `topic_ids` defaults to []; optional `assignment_id` defaults to null and is retained only for runtime compatibility, not school features.

200: `{"set_id":"uuid","items":[{"id":"uuid","version":1,"topic_id":"uuid","type":"single_choice","stem":"...","options":[{"id":"a","text":"..."}],"stimulus_id":null,"difficulty":"standard","tags":["sample"],"curriculum_edition":"revised_2025","media":[],"hint_available":true}],"rules_version":"..."}`

Items use the recursive client allowlist. Answer keys, explanations, reviewer identities and PIN hashes are never included. Explanations are returned only after submission.

### responses-submit

Request:

```json
{
  "device_clock": "2026-11-17T10:00:00Z",
  "responses": [
    {
      "client_id": "fresh uuid",
      "set_id": "uuid",
      "item_id": "uuid",
      "item_version": 1,
      "response": { "choice": "a" },
      "hint_shown": false,
      "response_ms": 5000,
      "recorded_at": "2026-11-17T10:00:00Z",
      "key_on_device": false
    }
  ]
}
```

Send 1–20 responses; preserve client_id on retry. The clock, timing and hint/key flags are required. Other response types follow the existing runtime contracts.

200: `{"results":[{"client_id":"uuid","is_correct":true,"scored":true,"explanation_html":"...","stardust":10}],"mastery_changes":[{"topic_id":"uuid","from":"not_assessed","to":"foundation"}],"stardust_today":100,"run_length":0}`. Completed placement may add `placement:[{strand_id,label}]`.

Submission is atomic and idempotent by globally unique client_id. Requests lock the child's database row before reading/writing learning state. No browser writes to learning tables are granted.

## Errors and curl examples

Errors use `{"error":{"code":"...","message":"...","retryable":false}}`. Shared statuses: 400 INVALID_REQUEST; 401 UNAUTHORIZED; 403 CONSENT_METHOD_UNAVAILABLE; 405 METHOD_NOT_ALLOWED; 413 INVALID_REQUEST for oversized bodies; 500 INTERNAL (`retryable:true`). Runtime errors: 404 CHILD_NOT_FOUND/SET_NOT_FOUND; 403 SET_NOT_OWNED; 409 SET_CLOSED; 400 CHILD_INACTIVE, KIND_NOT_SUPPORTED, NO_ITEMS_AVAILABLE, NO_REVIEWS_DUE, ITEM_NOT_IN_SET, ITEM_VERSION_MISMATCH and INVALID_REQUEST.

```sh
BASE=http://127.0.0.1:54321/functions/v1
# Set ANON, PARENT, CHILD_TOKEN, CONSENT, CHILD_ID, DEVICE and REFRESH locally.
post() { curl --fail-with-body -sS "$BASE/$1" -H "apikey: $ANON" -H "Authorization: Bearer $2" -H 'Content-Type: application/json' --data "$3"; }
post consent-start "$PARENT" '{"notice_version":"m2-v0","purposes":{"core_learning":true},"declaration":{"is_adult":true}}'
post consent-confirm "$PARENT" "{\"consent_id\":\"$CONSENT\",\"declaration\":{\"is_adult\":true,\"is_parent_or_guardian\":true}}"
post child-create "$PARENT" "{\"consent_id\":\"$CONSENT\",\"first_name\":\"Ada\",\"avatar_key\":\"star\",\"year\":5,\"pin\":[\"sun\",\"kite\",\"drum\",\"star\"]}"
post child-session "$PARENT" "{\"child_id\":\"$CHILD_ID\",\"device_id\":\"$DEVICE\",\"pin\":[\"sun\",\"kite\",\"drum\",\"star\"]}"
post child-session-refresh '' "{\"refresh_token\":\"$REFRESH\",\"device_id\":\"$DEVICE\"}"
post set-start "$CHILD_TOKEN" '{"kind":"practice","topic_ids":["f0000000-0000-4000-8000-000000000001"]}'
# Save the complete responses-submit request above, with real returned IDs, to responses.json.
curl --fail-with-body -sS "$BASE/responses-submit" -H "apikey: $ANON" -H "Authorization: Bearer $CHILD_TOKEN" -H 'Content-Type: application/json' --data-binary @responses.json
```

`PgStore` also implements the existing runtime job ports. Cron scheduling, retention execution, consent withdrawal UI, content authoring, and production consent verification are outside M2. Monthly partitions currently cover November 2026–December 2027 with a default partition; provision future partitions through migrations. The same connection must not be shared between concurrent PgStore request instances while a transaction is active.
