# 06 · API and events

All Edge Functions are `POST https://<project>.supabase.co/functions/v1/<name>` with `Authorization: Bearer <jwt>` and JSON bodies. Errors use the shape:

```json
{ "error": { "code": "CONSENT_REQUIRED", "message": "A parent must give consent first.", "retryable": false } }
```

Reads that RLS can protect safely go through PostgREST (`/rest/v1/...`) using views. Anything that **scores, awards, issues tokens, or touches answer keys** goes through a function.

## 1. Consent and children

### `consent-start`
Guardian JWT.
```json
{ "notice_version": "2026-11-v1", "purposes": { "core_learning": true, "school_sharing": true, "progress_messages": true, "product_research": false } }
```
→ `{ "consent_id": "uuid", "verification": { "method": "otp_whatsapp", "expires_at": "..." } }`

### `consent-confirm`
→ `{ "consent_id": "uuid", "status": "verified" }`. The second verification step is whatever method the lawyer approves ([07 §3](07-privacy-security-compliance.md#3-parental-consent)).

### `child-create`
```json
{ "consent_id": "uuid", "first_name": "Tolu", "birth_year": 2016, "avatar_key": "kite", "join_code": "P5GLD7" }
```
→ `{ "child_id": "uuid", "class": { "id": "uuid", "name": "Primary 5 Gold" } }`

Errors: `CONSENT_REQUIRED`, `JOIN_CODE_INVALID`, `LICENCE_FULL`.

### `child-session`
```json
{ "child_id": "uuid", "pin": ["sun","kite","drum","star"], "device_id": "uuid", "mode": "family" }
```
→ `{ "token": "jwt", "expires_at": "...", "refresh_until": "..." }`

Errors: `PIN_INCORRECT` (with `attempts_left`), `PROFILE_LOCKED` (with `locked_until`).

### `class-join`
Teacher JWT for class mode: `{ "class_code": "P5GLD7" }` → `{ "class_id", "children": [{ "child_id", "first_name", "avatar_key" }] }`.

## 2. Learning

### `set-start`
Child JWT.
```json
{ "kind": "practice", "topic_ids": ["uuid"], "assignment_id": null }
```
→
```json
{
  "set_id": "uuid",
  "items": [{ "item_id": "uuid", "version": 3, "type": "single_choice", "stem_html": "...", "options": [...], "media": [...], "hint_available": true }],
  "rules_version": "v0.3"
}
```
No answers or explanations are returned here.

### `responses-submit`
Child JWT. Up to 20 responses per call, idempotent on `client_id`.
```json
{
  "responses": [{
    "client_id": "uuid", "set_id": "uuid", "item_id": "uuid", "item_version": 3,
    "response": { "choice": "B" }, "hint_shown": false, "response_ms": 8200,
    "recorded_at": "2027-01-20T16:02:11Z", "key_on_device": false
  }],
  "device_clock": "2027-01-20T16:02:40Z"
}
```
→
```json
{
  "results": [{ "client_id": "uuid", "is_correct": true, "scored": true, "explanation_html": "...", "stardust": 10 }],
  "mastery_changes": [{ "topic_id": "uuid", "from": "developing", "to": "proficient" }],
  "stardust_today": 120, "run_length": 6
}
```

### `pack-build`
Child JWT: `{ "topic_ids": ["uuid"], "max_items": 40 }` → a signed Storage URL for a JSON pack (≤ 120 KB with images) plus `pack_id`. The pack includes keys and explanations and is marked `key_on_device=true`.

### `test-start` / `test-resume` / `test-finish`
- `test-start { "blueprint_id": "uuid" }` → `{ "set_id", "server_now", "ends_at", "papers": [{ "paper", "items": [...] }] }`
- `test-resume { "set_id" }` → `{ "server_now", "ends_at", "answered": ["item_id"], "resume_count", "paused_ms" }`. Error `RESUME_LIMIT` after 2 resumes or 20 minutes paused.
- Responses go through `responses-submit` with `set_id`.
- `test-finish { "set_id" }` → `{ "score_by_paper": [{ "paper", "correct", "total" }], "review_url" }`. The server also finalises automatically after `ends_at` plus 15 minutes.

## 3. Reports and family

| Endpoint | Method | Purpose |
|---|---|---|
| `/rest/v1/v_child_sky?child_id=eq.<id>` | GET | Constellation data for one child |
| `/rest/v1/v_reports?child_id=eq.<id>&order=period_end.desc` | GET | Report list (guardian) |
| `report-weekly` | cron | Builds reports, queues messages |
| `data-export` | POST | `{ "child_id" }` → request id; fulfilled within 7 days |
| `data-delete` | POST | `{ "child_id", "confirm": "DELETE TOLU" }` → request id |
| `rest-mode` | POST | `{ "child_id", "days": 7 }` sets Rest Mode within the rules |

## 4. Teacher and school

| Endpoint | Purpose |
|---|---|
| `/rest/v1/v_class_grid?class_id=eq.<id>` | Pupil × topic mastery grid |
| `/rest/v1/v_class_needs_help?class_id=eq.<id>` | Pupils matching the needs-help rule |
| `assignment-create` | `{ class_id, kind, topic_ids, due_at }` |
| `/rest/v1/v_school_overview?school_id=eq.<id>` | Licence use, weekly active pupils, coverage by class |
| `teacher-invite` | `{ school_id, phone \| email }` |

## 5. Content studio

| Endpoint | Purpose |
|---|---|
| `/rest/v1/item_versions` (content roles) | Draft CRUD under RLS |
| `content-submit` | Moves a draft to review |
| `content-review` | `{ entity, id, version, decision, comment, answer_verified }` |
| `content-publish` | Runs the publish checks ([03 §6](03-curriculum-and-content.md#6-workflow)), renders maths, freezes the version |

## 6. Rate limits

| Endpoint | Limit |
|---|---|
| OTP send | 3 per phone per 15 min, 10 per IP per hour |
| `child-session` | 10 per device per 5 min |
| `responses-submit` | 120 calls per child per 10 min |
| `set-start` | 30 per child per hour |
| `data-export` | 2 per child per 30 days |

## 7. Analytics event catalogue

Events go to the first-party `events` table only. **No names, free text or contact details in `props`.** Child IDs are hashed with a rotating salt per term.

| Event | Fired when | Props |
|---|---|---|
| `app_opened` | Shell loaded | `surface`, `online`, `install_state` |
| `consent_given` | Consent verified | `notice_version`, `purposes` (booleans), `method` |
| `child_created` | Profile created | `level`, `school_id` |
| `placement_started` / `placement_finished` | Placement | `paper`, `items_answered` |
| `set_started` / `set_finished` | Any set | `kind`, `items`, `scored`, `correct`, `duration_s`, `offline` |
| `lesson_card_viewed` | Card shown | `card_kind`, `topic_id` |
| `hint_shown` | Hint opened | `topic_id` |
| `mastery_changed` | Level change | `topic_id`, `from`, `to` |
| `test_started` / `test_finished` | Practice test | `blueprint_id`, `resume_count`, `paused_ms`, `answered_pct` |
| `pack_downloaded` | Offline pack | `items`, `bytes` |
| `sync_completed` | Outbox flushed | `responses`, `max_delay_s` |
| `report_generated` / `report_opened` | Parent report | `channel`, `days_since_generated` |
| `assignment_created` / `assignment_completed` | Teacher flow | `kind`, `topics`, `completion_rate` |
| `rest_mode_set` | Rest Mode | `days` |
| `perf_vitals` | Field web vitals | `lcp_ms`, `inp_ms`, `cls`, `device_class` |
