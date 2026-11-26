# Security baseline runbook

Implements [07 §6](../md/07-privacy-security-compliance.md#6-security-controls), [11 §3–4](../md/11-devops-and-environments.md#3-database-operations) and TASKLIST 2.40.

## 1. Content Security Policy

**One source of truth:** `apps/web/scripts/security-headers.mjs`. Tests: `apps/web/tests/csp.test.ts`.

### GitHub Pages (static export), live now

GitHub Pages cannot send response headers. So `apps/web/scripts/apply-csp.mjs` runs after `next build` when `GITHUB_PAGES=true`. It adds this to every exported page, straight after `<meta charset>` and before any script:

```
default-src 'self';
script-src 'self' 'sha256-…' (one hash per inline script on that page);
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self';
connect-src 'self' <Supabase origin> <Supabase wss origin> <Sentry ingest origin>;
media-src 'self'; worker-src 'self'; manifest-src 'self';
frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self';
upgrade-insecure-requests
```

- **Scripts:** only same-origin files plus the exact inline scripts Next.js wrote (theme bootstrap, RSC payload). There is no `'unsafe-inline'` and no `'unsafe-eval'`, and there are no third-party hosts. A new inline script gets a hash automatically at build time. A script injected at runtime is blocked.
- **Styles** allow `'unsafe-inline'` because React writes `style` attributes. Styles cannot run code. Revisit this if we ever render user-written HTML.
- **`frame-ancestors 'none'` cannot be set in `<meta>`** (browsers ignore it there). So the export also gets a hashed frame guard script: it hides the page and breaks out if it is loaded in a frame. This is a fallback; the real control is the header below.
- Supabase and Sentry origins come from the same `NEXT_PUBLIC_*` variables as the build. If you change either, rebuild.

### Vercel or any host that can send headers (from 2A)

`next.config.ts` sends these headers on every route whenever it is **not** a static export (`next start`, Vercel):

| Header | Value |
|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

The header CSP cannot carry per-page script hashes, so it covers framing only. On Vercel, also keep the script policy in one of these ways:

1. **Static pages:** run the same hashing step over `.next/server/app/**/*.html` after the build, so each prerendered page carries its `<meta>` CSP as on Pages. Browsers apply both the header and the meta policy.
2. **Dynamic pages** (anything that reads cookies or headers): use the nonce approach in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`. A `proxy.ts` sets `script-src 'self' 'nonce-…' 'strict-dynamic'` per request.

If you need a header-only setup without Next config (for example a CDN in front), use this `vercel.json` form:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
      ]
    }
  ]
}
```

**Check after every deploy:** open the site, then DevTools → Console. There must be no `Refused to execute` or `Refused to connect` messages. Lighthouse CI fails the build on any console error.

## 2. Dependencies

- **Lockfile required:** CI installs with `pnpm install --frozen-lockfile`.
- **`pnpm audit --audit-level high`** runs in CI on every push and pull request, and weekly on Monday at 06:00 Lagos (`.github/workflows/ci.yml`, `audit` job). High and critical advisories fail the build. Moderate ones show in the log; fix them in the next Renovate batch.
- **Renovate** (`renovate.json`) is set up but needs the Renovate GitHub App installed on the repository by an owner. It pins exact versions and GitHub Action digests, waits 3 days after a release (security fixes go straight through), groups packages that must move together, and opens PRs only after 16:00 Lagos on weekdays or at weekends. Majors need approval on the Dependency Dashboard. Nothing auto-merges.
- **When an advisory has no fix:** add a dated ignore entry to pnpm's `auditConfig` in `pnpm-workspace.yaml`, with a reason and an owner, and create a TASKLIST item to remove it. Never ignore one silently.

## 3. Secrets rotation (quarterly, and immediately after staff changes)

Secrets live only in GitHub Actions environments and Supabase function secrets (11 §4). `NEXT_PUBLIC_*` values are public by design and are not secrets.

| Secret | Where it lives | How to rotate |
|---|---|---|
| Supabase service role key | Supabase function secrets | Supabase → Project settings → API → roll the JWT secret / create a new secret key, update function secrets, redeploy functions, then revoke the old key |
| Supabase publishable key | GitHub env vars | Create a new publishable key, deploy the web app, revoke the old one after 24 h (cached shells) |
| Child-session JWT signing key | Supabase function secrets | Add the new key, sign with it, accept both for one child-session lifetime, then remove the old one |
| WhatsApp / SMS provider keys | Supabase function secrets | Create a new key in the provider console, update the secret, send a test message, revoke the old key |
| Webhook signing secrets | Supabase function secrets + provider | Set the new secret on both sides in one change window; verify one delivery |
| Sentry auth token (source maps, when added) | GitHub environment secret | Create a new org token with `project:releases` only, update the secret, delete the old one |
| Vercel token (from 2A) | GitHub environment secret | Create a new token scoped to the team, update the secret, delete the old one |

### Rotation checklist

- [ ] Schedule it outside peak learning hours (after 21:00 Lagos).
- [ ] List every secret above that exists today; note which ones don't exist yet.
- [ ] Rotate each one using the table. Revoke the old value only after a successful deploy and a smoke test.
- [ ] Smoke test: sign in as a parent on staging, open `/family/`, check that the functions health check is green.
- [ ] Check the Sentry and function logs for auth errors for 30 minutes.
- [ ] Record the date, who did it and which secrets were rotated in the log below.
- [ ] Staff leaving: rotate everything they could read **the same day**, and remove their GitHub, Supabase, Vercel, Sentry and provider access.

| Date | By | Secrets rotated | Notes |
|---|---|---|---|
| — | — | — | First rotation due when the first production secret is created |

## 4. Backup restore drill (quarterly)

Point-in-time recovery is on for `stellara-prod` (11 §3). A backup we have never restored is not a backup.

**Waits for 2A:** `stellara-prod` and its PITR add-on. The first drill is due before the pilot (Phase 3).

### Drill checklist

- [ ] Create a scratch Supabase project in the same region: `stellara-restore-drill-<yyyymmdd>`. Restrict access to the two people running the drill. **Real children's data is in it: treat it as production** (07 §5).
- [ ] Restore production to a point about 24 hours ago into the scratch project (Dashboard → Database → Backups → PITR → restore to new project, or `supabase` CLI equivalent).
- [ ] Time it. Record the recovery time and the recovery point actually achieved. The specs set no recovery-time target yet: agree one with the DPO before the first drill (4 hours is a reasonable starting point).
- [ ] Verify the restore:
  - [ ] Row counts for `children`, `attempts` (the latest partition), `stardust_ledger` and `audit_log` are within the expected range of production at that time.
  - [ ] `supabase test db` (the pgTAP suite) passes against the restored schema.
  - [ ] RLS is on for every table: `select relname from pg_class where relkind = 'r' and relnamespace = 'public'::regnamespace and not relrowsecurity;` returns no rows.
  - [ ] Append-only tables still reject `update` and `delete`.
- [ ] **Delete the scratch project the same day.** Confirm the deletion in the dashboard.
- [ ] Record the drill below. If recovery took longer than the recovery-time target or anything failed, open an incident review (11 §6).

| Date | By | Restore point | Time to restore | Checks passed | Scratch project deleted |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
