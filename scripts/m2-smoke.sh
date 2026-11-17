#!/usr/bin/env bash
set -euo pipefail
# Disposable local stack only. Requires bash, curl, jq, Node, pnpm and Docker.
cd "$(dirname "$0")/.."
command -v jq >/dev/null
status=$(pnpm exec supabase status -o json)
base=$(jq -er '.API_URL' <<<"$status")
anon=$(jq -er '.ANON_KEY' <<<"$status")
case "$base" in http://127.0.0.1:*|http://localhost:*) ;; *) echo 'Smoke test requires local Supabase' >&2; exit 1;; esac
uuid() { node -e 'console.log(crypto.randomUUID())'; }
request() {
  local endpoint=$1 token=$2 body=$3
  curl --silent --show-error --fail-with-body "$base/functions/v1/$endpoint" \
    -H "apikey: $anon" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data "$body"
}
email="m2-$(uuid)@example.test"
parent=$(curl --silent --show-error --fail-with-body "$base/auth/v1/signup" -H "apikey: $anon" -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg email "$email" --arg password "M2-$(uuid)!" '{email:$email,password:$password}')" | jq -er '.access_token')
consent=$(request consent-start "$parent" '{"notice_version":"m2-v0","purposes":{"core_learning":true},"declaration":{"is_adult":true}}' | jq -er '.consent_id')
request consent-confirm "$parent" "$(jq -nc --arg id "$consent" '{consent_id:$id,declaration:{is_adult:true,is_parent_or_guardian:true}}')" | jq -e '.status=="verified"' >/dev/null
child=$(request child-create "$parent" "$(jq -nc --arg id "$consent" '{consent_id:$id,first_name:"Ada",avatar_key:"star",year:5,pin:["sun","kite","drum","star"]}')" | jq -er '.child_id')
device=$(uuid)
session=$(request child-session "$parent" "$(jq -nc --arg id "$child" --arg device "$device" '{child_id:$id,device_id:$device,pin:["sun","kite","drum","star"]}')")
token=$(jq -er '.token' <<<"$session")
curl --silent --show-error --fail-with-body "$base/rest/v1/children?select=id" -H "apikey: $anon" -H "Authorization: Bearer $token" | jq -e --arg child "$child" 'length==1 and .[0].id==$child' >/dev/null
set_json=$(request set-start "$token" '{"kind":"practice","topic_ids":["f0000000-0000-4000-8000-000000000001"]}')
jq -e '.items|length>=8' <<<"$set_json" >/dev/null
jq -e '[.items[]|has("answer") or has("explanation")]|any|not' <<<"$set_json" >/dev/null
now=$(node -e 'console.log(new Date().toISOString())')
ids=$(node -e 'console.log(JSON.stringify(Array.from({length:10},()=>crypto.randomUUID())))')
batch=$(jq -nc --argjson set "$set_json" --argjson ids "$ids" --arg now "$now" '{device_clock:$now,responses:[$set.items|to_entries[]|{client_id:$ids[.key],set_id:$set.set_id,item_id:.value.id,item_version:.value.version,response:{choice:"a"},hint_shown:false,response_ms:5000,recorded_at:$now,key_on_device:false}]}')
result=$(request responses-submit "$token" "$batch")
jq -e '.results|length>=8' <<<"$result" >/dev/null
request responses-submit "$token" "$batch" | jq -e '.results|length>=8' >/dev/null
refreshed=$(request child-session-refresh '' "$(jq -nc --arg token "$(jq -r '.refresh_token' <<<"$session")" --arg device "$device" '{refresh_token:$token,device_id:$device}')")
jq -e '.token and .refresh_token and .refresh_until' <<<"$refreshed" >/dev/null
# child is a server-generated UUID, never arbitrary SQL input.
counts=$(docker exec supabase_db_stellara psql -U postgres -d postgres -Atc "select (select count(*) from public.attempts where child_id='$child') || '|' || (select max(level) from public.mastery_states where child_id='$child') || '|' || (select count(*) from public.stardust_ledger where child_id='$child');")
IFS='|' read -r attempts level ledger <<<"$counts"
[[ "$attempts" -ge 8 && "$level" -gt 0 && "$ledger" -gt 0 ]]
printf 'M2 smoke passed: %s attempts, mastery level %s, %s ledger rows. Refresh succeeded.\n' "$attempts" "$level" "$ledger"
