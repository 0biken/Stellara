# Admin and Content Studio Frontend Implementation Plan

> **For agentic workers:** Use executing-plans to implement task by task. Steps use checkbox syntax for tracking. Preserve the existing working-tree changes.

**Goal:** Deliver a usable, role-aware staff frontend for content production and administration, beginning with demonstrable author-to-publisher workflows.

**Architecture:** Keep the existing Next.js web application and static-export-compatible routes. Put staff screens under `/admin`, with a shared staff layout and typed adapters. Existing operations use the live admin function; content work initially uses an explicitly labelled demo adapter until the corresponding backend contracts exist. Demo state never masquerades as live publication.

**Tech stack:** Next.js App Router, React, TypeScript, existing `@stellara/ui` components and Sweet Garden tokens, Vitest, Testing Library and Playwright. Use existing dependencies; add no dashboard template or editor framework in this phase.

**Spec:** Accepted family-MVP plan in this chat; `docs/mvp-implementation.md`; `docs/md/03-curriculum-and-content.md`; existing permission matrix in `supabase/functions/_shared/permissions.js`.

## Global constraints and decisions

**Delivery record, 19 November:** Shared staff workspace, typed live/demo adapters,
MFA screens, content lists/previews, team/support/audit screens and URL filters are
implemented. Verified with 29 focused tests, four boundary tests, production build,
typecheck, focused lint and a Chromium journey with Daylight/Starlight axe checks
and a 390px layout check. Editor forms, decisions, publication, import, curriculum,
WebKit and live staff MFA browser acceptance remain pending; the tasks below are
not all complete. Existing administration endpoint behavior was preserved.

- Frontend first: no production content writes, migration changes, billing controls or jobs in this phase.
- Desktop-first authoring workspace, usable on a tablet. Mobile supports navigation, lists and previews; explicitly explain when a full editor requires a wider screen.
- Use existing light/dark themes, typography, form controls, buttons and dialogs. Adult staff interface: clear tables and restrained status colour, with no child rewards or decorative dashboard charts.
- Preserve fixed roles: Super Admin, Admin, Author, Reviewer and Content Lead. Admin handles operations, not publishing. Independent review remains required even for Super Admin.
- Browser role checks guide navigation; the backend remains authoritative. Hide forbidden actions, protect direct links, clear staff data on sign-out, and handle revoked roles/403 responses without leaving cached content visible.
- Production pages never expose a role switcher. Demo mode is selected by explicit development configuration and shows a persistent banner; its data stays in memory and resets on reload. It is never enabled by silently falling back after a live request fails.
- Use static route files with query parameters for selected content IDs; avoid runtime dynamic paths that conflict with the existing export deployment.
- Author and reviewer IDs, verification timestamps and publication status are system-managed fields, not editable text inputs.
- Staff content models may contain answer keys, but parent/child modules must not import staff modules or fixtures. Do not import the server content-schema entrypoint into a client component; define client-safe staff DTOs separately and leave authoritative publication validation on the server.

## Routes and code ownership

Replace the current monolithic `apps/web/app/(ops)/admin/page.tsx` with an overview and add a nested staff layout. Use `apps/web/components/admin/` for staff components and `apps/web/lib/admin/` for contracts, permission checks, adapters and demo fixtures. Route pages orchestrate components; editors, review forms and table behaviour live in focused modules.

| Route | Screen | Access |
|---|---|---|
| `/admin/` | Role-specific work overview | All staff |
| `/admin/content/` | Items and lessons library | Author, Reviewer, Content Lead, Super Admin |
| `/admin/content/item/?id=...` | New/existing item workspace | Same roles, actions restricted |
| `/admin/content/lesson/?id=...` | Lesson-card workspace | Same roles, actions restricted |
| `/admin/reviews/` | Review queue and decisions | Reviewer, Content Lead, Super Admin |
| `/admin/publishing/` | Approved versions, publish checks and retirement | Content Lead, Super Admin |
| `/admin/curriculum/` | Topic hierarchy, coverage and blueprint verification | Content roles; approval limited to Content Lead/Super Admin |
| `/admin/import/` | JSON import validation and preview | Author, Content Lead, Super Admin |
| `/admin/team/` | Staff assignments and deactivation | Super Admin |
| `/admin/support/` | Reason-gated limited child lookup and request status | Admin, Super Admin |
| `/admin/audit/` | Read-only audit history | Admin, Super Admin |
| `/admin/security/` | Staff sign-in/MFA status and challenge | All staff |

The old studio shell has no content pages to migrate. Do not mount both StudioShell and AdultShell around the new staff workspace.

## Interfaces and state

- `StaffSession`: user ID, role, active flag and authentication assurance state. Treat role changes as server responses, never editable user metadata.
- `AdminApi`: `getSession()`, `listStaff()`, `setStaffRole(input)`, `getOperations()`, `getAudit()`, `lookupChild({ childId, reason })`. Map existing admin action names in one live adapter; preserve error codes including MFA_REQUIRED, FORBIDDEN, NETWORK and SERVER.
- `ContentStudioApi`: `listContent(filters)`, `getVersion(id, version)`, `saveDraft(draft, expectedRevision)`, `submitForReview(id, version)`, `decideReview(input)`, `publishVersion(input)`, `retireVersion(input)`, `createRevision(id, version)`, `validateImport(records)`, `commitImport(batch)` and curriculum reads. Implement a deterministic demo adapter first. Do not invent live endpoints or send these operations to the existing admin function.
- Library filters: text, content kind, year, subject, topic, item type, purpose, status and owner; preserve filters/page in URL. Page size 25. Search is submit/debounced at 300 ms, with stale-response cancellation.
- Workflow: draft → in_review → changes_requested or approved → published → retired. Resubmission after changes_requested returns to in_review. Published versions are read-only; editing creates a new draft revision. Each decision records actor, timestamp and reason; reviewers cannot approve their own work.
- Lesson DTO uses the same editorial workflow envelope while retaining the existing lesson document status shape. The backend phase must map this explicitly rather than extending lesson status strings casually.
- Draft edits are explicit-save initially: show unsaved, saving, saved and save-error states. A failed save preserves edits. Warn before navigation with unsaved changes. On revision conflict, retain the local draft and show a comparison/reload choice; never silently overwrite.
- Every action returns updated server/demo state; keep selections by stable IDs, not array indices. Clear prior support results immediately on a new lookup or access failure.

## Implementation tasks in order

### 1. Shared staff shell, access and adapters

- [ ] Write `admin-access.test.tsx` covering each role's navigation, forbidden direct routes, no session, inactive account, MFA challenge and role revocation. Run it and confirm missing behaviour fails.
- [ ] Create client-safe contracts and `canStaff(role, capability)` with tests matching the existing backend matrix. Implement live admin and demo studio adapters with explicit modes.
- [ ] Build persistent sidebar, compact header, breadcrumbs, appearance control, account/sign-out menu, skip link and page title. Keep overview content role-specific: assigned drafts for authors, waiting reviews for reviewers, approved queue for publishers, request counts for operations.
- [ ] Add loading skeletons, empty states, inline errors with retry and forbidden screens. Build MFA enrollment/challenge UI through the existing Auth client; distinguish MFA_REQUIRED from generic request failure. Never infer a staff role from a successful parent sign-in.
- [ ] Verify focused tests, typecheck and lint, then commit this independently testable shell.

### 2. Content library and reusable tables

- [ ] Write `content-library.test.tsx` for combined filters, stable selection, pagination, empty searches, slow requests and errors.
- [ ] Implement Items/Lessons tabs with title, subject/topic, year, type, purpose, status, version, assignee and last update columns. Add searchable filters, clear-all, pagination and role-appropriate New Item/New Lesson actions.
- [ ] Add semantic table, status badge, filter bar, pagination and detail-panel components only where the existing UI package lacks them. Long titles wrap; status is conveyed in text as well as colour.
- [ ] Verify filter URL restoration, keyboard traversal and 25-row pagination, then commit.

### 3. Item editor and child preview

- [ ] Write `item-editor.test.tsx` for saving incomplete drafts, all six item formats, answer-reference validation, unsaved navigation, failed save and revision conflict.
- [ ] Build a two-column workspace: structured editor on the left; interactive child-style preview on the right. Provide tabs for Question, Answer & Explanation, Metadata and History.
- [ ] Support single choice, multi-choice, numeric, ordering, matching and cloze using the existing schema's field shapes. Preserve option IDs when reordering. Changing format warns before discarding incompatible fields.
- [ ] Include stem, stimulus reference, options/slots/pairs, answer, hint, explanation, topic, year/subject mapping, difficulty, purpose, tags, curriculum edition, provenance, licence reference and media alt text.
- [ ] Use plain text inputs and a dedicated formula preview rather than unrestricted HTML authoring. Keep any author-entered markup escaped until a sanitised rendering pipeline is available. Demo media uses bundled fixtures; actual upload is an explicit backend dependency.
- [ ] Provide Save Draft, Preview and Submit for Review. Draft saves allow missing editorial fields; submission shows a linked list of required-field errors. Published versions offer Create New Revision.
- [ ] Verify all formats and disabled/forbidden actions, then commit.

### 4. Lesson editor

- [ ] Write `lesson-editor.test.tsx` for card ordering, references to missing/retired items, draft saving and preview progression.
- [ ] Add explain, worked_example, check, try_it and summary cards. Use move-up/down controls as the accessible default; drag and drop is deferred.
- [ ] Provide item selection from the library, one item for a check and two or three distinct items for try_it. Preview the lesson with the existing lesson UI.
- [ ] Show reference and publication blockers beside the affected card, preserve edits on failure and reuse the draft/revision workflow. Verify and commit.

### 5. Review and publication

- [ ] Write `content-workflow.test.tsx` covering author/reviewer separation, required change-request reason, immutable published versions, stale approvals and unverified blueprints.
- [ ] Review screen shows content preview, proposed answers, explanations, provenance, version changes and comments. Reviewer explicitly confirms answer verification before approval; changes_requested requires a reason.
- [ ] Publishing screen lists approved versions and their checks: complete metadata, independent reviewer, verified answer, required licence, alt text, formula rendering and readability check/override reason. Where the backend has not actually performed a check, label it pending and block live publication.
- [ ] Require confirmation for Publish and Retire. Retirement requires a reason; published history remains visible. Editing after approval invalidates that approval in demo state as required by the eventual backend contract.
- [ ] Verify the complete create → review → publish → new revision flow in the demo adapter and commit.

### 6. Curriculum and bulk import

- [ ] Write `content-import.test.tsx` for valid JSON, malformed input, unsupported formats, duplicate item/version pairs, missing topic references and partial validation failures.
- [ ] Show curriculum hierarchy and topic-level counts of draft, approved and published items/lessons, split by practice, placement and reserved test purpose. Display verified versus unverified exam mapping; do not imply that a draft mapping is approved.
- [ ] Accept JSON files up to 2 MiB and 500 records per batch, with a downloadable template. Parse locally, display row-level errors and a preview, then require explicit import confirmation. Import drafts only; a whole invalid batch cannot be committed in demo mode. Existing item/version collisions are errors, not silent replacements.
- [ ] Keep source URL, academic approver and approval date as visible verification evidence. Actual academic verification remains a human gate.
- [ ] Verify bounds and failure behaviour, then commit.

### 7. Team, support and audit screens

- [ ] Write `admin-operations.test.tsx` for role assignments, self-demotion refusal, support reasons, restricted fields, failed lookup cleanup and audit rendering.
- [ ] Replace raw JSON results with staff tables, labelled summaries, confirmation dialogs and readable audit entries. Team uses the existing Auth UUID assignment contract; invitation-by-email is deferred until an invitation API exists.
- [ ] Support preserves exact child-ID lookup and the 10–500 character reason constraint. Show only first name, year, status and request metadata. No family browsing, answer keys, PINs or detailed learning history.
- [ ] Operations shows request counts only where provided. Do not fabricate job health, request fulfillment controls or commercial metrics. Audit shows the current latest-100 boundary honestly; backend pagination is a later addition.
- [ ] Verify live admin adapter actions with synthetic accounts and commit.

### 8. Frontend acceptance and backend handoff

- [ ] Playwright: author creates and submits an item; another reviewer requests changes and approves resubmission; Content Lead publishes; published edit creates a revision; lesson references validate; import errors block commit.
- [ ] Playwright: Super Admin assigns/deactivates a synthetic staff account; Admin performs a reason-gated lookup; unauthorized role cannot access the same screen directly; MFA challenge resumes the intended route.
- [ ] Run Chromium and WebKit, light/dark, keyboard and axe. Check 1440px desktop, 1024px tablet and 390px narrow screens with long titles and empty/full tables.
- [ ] Run focused Vitest suites, `pnpm lint`, `pnpm typecheck`, production build and `pnpm check:client`. Extend the client audit to prove staff fixtures/answer-bearing modules are absent from parent and child route chunks; server validators remain absent from every browser chunk.
- [ ] Record which actions are live versus demo and produce an endpoint/schema checklist for backend implementation. Do not mark the content studio production-ready until live persistence, authorization and publication checks pass.

## Review focus

1. Role revocation after loading an editor: access error clears sensitive state and prevents saving (tasks 1 and 8).
2. Self-review or approved content modified before publication: approval is invalidated and publication blocked (task 5).
3. Dropped connection or competing edits: text remains available and no silent overwrite occurs (tasks 3 and 4).
4. Staff-only answer keys accidentally bundled into family/child screens: import boundary and production chunk audit fail (task 8).
5. Demo publication or pending academic checks mistaken for live approval: persistent mode labels and blockers remain visible (tasks 5, 6 and 8).

## Acceptance definition

Frontend completion means every listed screen is navigable and its permitted workflow is functional in labelled demo mode, existing admin operations work through their live adapter, and accessibility, role and failure-state tests pass. Backend completion is a separate gate: durable authoring, review enforcement, publication validation, media handling and audited content mutations must replace demo implementations before real authors use the system.
