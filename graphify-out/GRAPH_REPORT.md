# Graph Report - Stellara  (2026-11-13)

## Corpus Check
- Corpus is ~42,322 words - fits in a single context window. You may not need a graph.

## Summary
- 581 nodes · 791 edges · 51 communities (43 shown, 8 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Avatar Generator Script
- Privacy, Security & Analytics
- Edge Function API
- Avatar Generator Script
- Design System & Compliance UI
- Scoring Tables & RLS
- Project documentation
- Brand Kit Theme Engine
- MVP Scope & Motivation
- Design System & Compliance UI
- Project documentation
- Docs Hub & Decisions
- Docs Hub & Decisions
- Voice, Motion & Rewards
- Sky & Star Drawing Code
- Docs Hub & Decisions
- Core Architecture ADRs
- Auntie Stella Artwork
- Design System & Compliance UI
- Brand and avatar design
- Brand Foundation
- Brand Kit Motion & 3D Code
- MVP Scope & Motivation
- Edge Function API
- Child Runtime & Frontend
- Child Runtime & Frontend
- Child Runtime & Frontend
- Offline Packs & Practice Tests
- Edge Function API
- Auntie Stella Brand Board
- Project documentation
- Edge Function API
- Design System & Compliance UI
- Logo & App Icon
- Project documentation
- Brand Kit Theme Engine
- Brand and avatar design
- Typography
- Project documentation
- Design System & Compliance UI
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation
- Project documentation

## God Nodes (most connected - your core abstractions)
1. `Glossary` - 30 edges
2. `Design System` - 26 edges
3. `Data model` - 25 edges
4. `UX writing` - 24 edges
5. `API and Events` - 22 edges
6. `Product requirements (PRD)` - 19 edges
7. `Technical architecture` - 16 edges
8. `QA and Testing` - 16 edges
9. `Curriculum and content` - 15 edges
10. `Stellara for Kids build documentation` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Common Entrance coverage without predicted score or affiliation` --semantically_similar_to--> `Syllabus coverage, never predicted score`  [INFERRED] [semantically similar]
  docs/emails/templates/weekly-report.txt → brand-kit/src/stellara-brand-kit.src.html
- `Auntie Stella Expression Preview Sheet` --references--> `Auntie Stella Listening`  [INFERRED]
  docs/assets/auntie-stella/preview.html → docs/assets/auntie-stella/auntie-stella-listening.svg
- `Auntie Stella Expression Preview Sheet` --references--> `Auntie Stella Proud`  [INFERRED]
  docs/assets/auntie-stella/preview.html → docs/assets/auntie-stella/auntie-stella-proud.svg
- `Auntie Stella Expression Preview Sheet` --references--> `Auntie Stella Thinking`  [INFERRED]
  docs/assets/auntie-stella/preview.html → docs/assets/auntie-stella/auntie-stella-thinking.svg
- `Incident facts, involved data, actions and parent guidance` --implements--> `Sweet in moments, plain in facts writing`  [INFERRED]
  docs/emails/templates/security-notice.txt → brand-kit/src/stellara-brand-kit.src.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Consent-gated child profile creation** — docs_md_01_product_requirements_consent_before_child_profile, docs_md_05_data_model_children_consent_trigger, docs_md_05_data_model_consents_table, docs_md_05_data_model_children_table, docs_md_01_product_requirements_nigeria_data_protection_act [INFERRED 0.85]
- **Motivation system: Stardust, days in a row, resting clouds** — docs_md_02_learning_rules_stardust, docs_md_02_learning_rules_days_in_a_row_and_resting_clouds, docs_md_02_learning_rules_rest_mode, docs_md_05_data_model_stardust_ledger_table, docs_md_05_data_model_streak_state_table, docs_md_05_data_model_activity_days_table, docs_md_01_product_requirements_principle_no_loss_framing [INFERRED 0.85]
- **Offline practice and sync flow** — docs_md_06_api_and_events_pack_build, docs_md_09_frontend_guidelines_packs_module, docs_md_09_frontend_guidelines_outbox_module, docs_md_06_api_and_events_responses_submit, docs_md_06_api_and_events_sync_completed_event, docs_md_09_frontend_guidelines_dexie_indexeddb [INFERRED 0.85]
- **Parental consent and NDPA compliance** — docs_md_07_privacy_security_compliance_nigeria_data_protection_act_2023, docs_md_07_privacy_security_compliance_parental_consent_flow, docs_md_06_api_and_events_consent_start, docs_md_06_api_and_events_consent_confirm, docs_md_06_api_and_events_child_create, docs_md_07_privacy_security_compliance_dpia, docs_md_07_privacy_security_compliance_data_protection_officer [INFERRED 0.85]
- **Stellara brand assets in the Sweet Garden palette** — docs_assets_logo_stellara_mark_star_mark, docs_assets_logo_stellara_app_icon_app_icon, docs_assets_auntie_stella_auntie_stella_character, docs_assets_auntie_stella_sweet_garden_palette [INFERRED 0.85]
- **Auntie Stella expression variants sharing one character rig** — docs_assets_auntie_stella_auntie_stella_avatar_round_auntie_stella_avatar_round, docs_assets_auntie_stella_auntie_stella_listening_auntie_stella_listening, docs_assets_auntie_stella_auntie_stella_proud_auntie_stella_proud, docs_assets_auntie_stella_auntie_stella_smiling_auntie_stella_smiling, docs_assets_auntie_stella_auntie_stella_thinking_auntie_stella_thinking, docs_assets_auntie_stella_expression_set [INFERRED 0.95]
- **Server-authoritative scoring flow for a practice response** — docs_md_04_technical_architecture_responses_submit_function, docs_md_02_learning_rules_packages_rules, docs_md_05_data_model_attempts_table, docs_md_05_data_model_mastery_states_table, docs_md_05_data_model_stardust_ledger_table, docs_md_05_data_model_activity_days_table, docs_md_04_technical_architecture_adr_003_server_authority [INFERRED 0.95]

## Communities (51 total, 8 thin omitted)

### Community 0 - "Avatar Generator Script"
Cohesion: 0.07
Nodes (23): docs/assets/auntie-stella/, C, EXPR, figure(), files, icon, LOGO_DIR, motionCss() (+15 more)

### Community 1 - "Privacy, Security & Analytics"
Cohesion: 0.06
Nodes (36): Analytics Event Catalogue, perf_vitals event, sync_completed event, Breach Runbook, Claims and Marketing Rules, DPIA, GAID 2025, NDPC (+28 more)

### Community 2 - "Edge Function API"
Cohesion: 0.09
Nodes (30): Auntie Stella, Blueprint, Class Mode, Constellation / sky, Coverage, Daytime, Data Protection Officer, Edge Function (+22 more)

### Community 3 - "Avatar Generator Script"
Cohesion: 0.08
Nodes (25): AV, avatars, buildSite(), buildStatic(), docs, esc(), files, HTML (+17 more)

### Community 4 - "Design System & Compliance UI"
Cohesion: 0.09
Nodes (27): Appearance Setting, Interface Voice and Word List, Email rendering checks, Forbidden-phrase Lint, Auntie Stella child voice, Children's app copy, Daytime and Starlight appearance, Email rules (+19 more)

### Community 5 - "Scoring Tables & RLS"
Cohesion: 0.13
Nodes (26): Weekly parent report (FAM-04), Mastery levels (not_assessed to mastered), rules_version, responses-submit Edge Function, Security model, Supabase backend, activity_days table, attempts table (+18 more)

### Community 6 - "Project documentation"
Cohesion: 0.09
Nodes (14): avatar, D, icon, layout(), link(), N, OUT, ROOT (+6 more)

### Community 7 - "Brand Kit Theme Engine"
Cohesion: 0.13
Nodes (17): Per-device Match my phone appearance setting, applyTheme(), CORE / NEUTRAL swatch lists, Warm cocoa dark theme, Daytime theme, inkFor(), lumOf(), paint() (+9 more)

### Community 8 - "MVP Scope & Motivation"
Cohesion: 0.16
Nodes (15): Stardust and days in a row (KID-06), Days in a row and resting clouds, Learning day (03:00 boundary), Learning rules, Mastery rule v0, Moving down rule (retention check 2/5), packages/rules TypeScript rules package, Rest Mode (+7 more)

### Community 9 - "Design System & Compliance UI"
Cohesion: 0.14
Nodes (17): Accessibility Requirements, Answer Tile, Auntie Stella, Design Principles, Design System, Hint Card, Layout Rules, Picture PIN (+9 more)

### Community 10 - "Project documentation"
Cohesion: 0.12
Nodes (16): runs-on, steps, jobs, generated-docs, name, on, pull_request, push (+8 more)

### Community 11 - "Docs Hub & Decisions"
Cohesion: 0.16
Nodes (13): Auntie Stella, Intermediate section (Primary 1-6, Phase 2), Common Entrance coverage (5 papers, ~74 topics), Content workflow (draft to published), Curriculum and content, Curriculum graph (pathway, subject, strand, topic), Item content schema, Lesson card (+5 more)

### Community 12 - "Docs Hub & Decisions"
Cohesion: 0.14
Nodes (10): Common Entrance prep section (MVP), Creche and kindergarten section (Phase 3), NCEE (National Common Entrance Examination), Non-functional requirements, Open questions Q1-Q5, Out-of-MVP features with return conditions, Product requirements (PRD), National ECCDE curriculum (+2 more)

### Community 13 - "Voice, Motion & Rewards"
Cohesion: 0.14
Nodes (14): Board 8: Voice and tone, Document 16 UX writing guide, Nine themed HTML and plain-text email templates, WhatsApp primary and GSM-7 SMS fallback, Resting cloud (missed day keeps run safe), Stardust (points), Voice: Stella to children, Stellara to parents, We say / we never say word list (+6 more)

### Community 14 - "Sky & Star Drawing Code"
Cohesion: 0.18
Nodes (12): chubby(), ico(), Icon set (rounded 1.75px line, one honey accent), ICONS, logoMark(), sky(), soft(), sproutAt() (+4 more)

### Community 15 - "Docs Hub & Decisions"
Cohesion: 0.15
Nodes (13): Auntie Stella avatar assets, Decision log, Design tokens script (tokens.mjs) with contrast check, Docs build script (build.mjs), Email templates, Light and dark themes, No AI tutor wording / no AI features for children in MVP, Must be verified before the pilot (+5 more)

### Community 16 - "Core Architecture ADRs"
Cohesion: 0.21
Nodes (10): Child sign-in with 4-picture PIN, Parent report rules, Child session JWT, Edge Functions, Paystack payments, pg_cron scheduled jobs, App route groups, Technical architecture (+2 more)

### Community 17 - "Auntie Stella Artwork"
Cohesion: 0.29
Nodes (12): Auntie Stella Round Avatar (Smiling), Auntie Stella Character, Auntie Stella Listening, Auntie Stella Proud, Auntie Stella Smiling, Auntie Stella Thinking, Auntie Stella Expression Set, Auntie Stella Expression Preview Sheet (+4 more)

### Community 18 - "Design System & Compliance UI"
Cohesion: 0.21
Nodes (12): Device Lab, Edge Function Contract Tests, Key Journeys, Lighthouse CI, Offline and Interruption Matrix, pgTAP RLS Tests, Playwright E2E Tests, QA and Testing (+4 more)

### Community 19 - "Brand and avatar design"
Cohesion: 0.24
Nodes (12): Auntie Stella animated avatars implementation plan, Accessible animated SVG variants, Full asset verification, Generated comparison gallery, Six-second MP4 gallery, Static avatar hash preservation, Auntie Stella animated avatars, Expression-specific gestures with quiet holds (+4 more)

### Community 20 - "Brand Foundation"
Cohesion: 0.22
Nodes (10): Audiences: ages 4-7, 8-12, parents, schools, Board 1: Brand foundation, Board 6: Icons and illustration, Brand idea: Learning grows (stars sprout), Positioning: playful daily habit vs credible mastery, Growing sky constellation motif, Mastery states: none, developing, proficient, mastered, Mission: real understanding, one step at a time (+2 more)

### Community 21 - "Brand Kit Motion & 3D Code"
Cohesion: 0.22
Nodes (7): Babylon.js sweet sky 3D scene, Board 7: Motion and 3D, build(), Micro-interaction previews (answer, days in a row, topic mastered), Motion tokens (ease-out, ease-in-out, 120/200/400ms), shape(), start()

### Community 22 - "MVP Scope & Motivation"
Cohesion: 0.18
Nodes (9): Content studio, Data export and delete (FAM-05/06), MVP scope (Phase 1), Nigeria Data Protection Act (NDPA), Placement check feature, Teacher dashboard, Mastery star display, Placement check rules (+1 more)

### Community 23 - "Edge Function API"
Cohesion: 0.22
Nodes (10): API and Events, class-join, content-publish, content-review, content-submit, data-delete, Edge Function Error Shape, Rate Limits (+2 more)

### Community 24 - "Child Runtime & Frontend"
Cohesion: 0.18
Nodes (11): child-session, Motion Tokens, Basic Mode for Opera Mini, Browser Support Matrix, Code Standards, Feature Flags, Frontend Guidelines, Internationalisation (+3 more)

### Community 25 - "Child Runtime & Frontend"
Cohesion: 0.18
Nodes (9): pack-build, set-start, Append-only Integrity Tables, argon2id PIN hashing, OWASP ASVS Level 2, Row Level Security, Security Controls, Packs Module (+1 more)

### Community 26 - "Child Runtime & Frontend"
Cohesion: 0.20
Nodes (10): responses-submit, test-start / test-resume / test-finish, Tokens in Code (CSS and Tailwind), Dexie IndexedDB, Frontend Stack, Next.js 15 App Router, Outbox Module, Server-owned Practice Test Timer (+2 more)

### Community 27 - "Offline Packs & Practice Tests"
Cohesion: 0.25
Nodes (8): Offline practice packs, Timed practice tests (KID-04), Practice test blueprint, Set types, Timer and interruption rules, Next.js 15 PWA client, Offline and sync (Serwist, Dexie IndexedDB outbox), test_blueprints table

### Community 28 - "Edge Function API"
Cohesion: 0.22
Nodes (9): assignment-create, data-export, teacher-invite, Data Protection Officer, School Onboarding, School Rollout and Operations, Stellara Pilot Roles, Support Channels (+1 more)

### Community 29 - "Auntie Stella Brand Board"
Cohesion: 0.32
Nodes (8): Auntie Stella (tutor character), Board 9: Applications, Board 3: Auntie Stella, Board 5: Typography, Stellara Brand Kit page, Parent progress report mockup, Stella expressions: smiling, listening, thinking, proud, Nunito display + Inter body

### Community 30 - "Project documentation"
Cohesion: 0.25
Nodes (8): Graphify incremental refresh with generated-output exclusions, Stellara, Sweet Garden avatar preview regeneration, Generated docs freshness CI check, Generated documentation rebuild, Incremental knowledge graph refresh, Phase 0 housekeeping, Version control and GitHub CI repository

### Community 31 - "Edge Function API"
Cohesion: 0.33
Nodes (7): child-create, consent-confirm, consent-start, Parental Consent Flow, Commercial Model, Paystack, Open Questions Register

### Community 32 - "Design System & Compliance UI"
Cohesion: 0.33
Nodes (6): Contrast Table, Light and Dark Theme, tokens.mjs contrast checker, Theme Implementation, Release Checklist, Theme Check

### Community 33 - "Logo & App Icon"
Cohesion: 0.40
Nodes (5): App icon (star sprout on Strawberry Milk), Board 2: Logo, Clear space and minimum size, Four-point sparkle (misuse), Logo misuse rules

### Community 34 - "Project documentation"
Cohesion: 0.40
Nodes (5): Consent functions and child sessions, Reviewed item pool authoring, Signed data protection impact assessment, Lawyer-approved parental verification, M4 pilot readiness, 29 January

### Community 35 - "Brand Kit Theme Engine"
Cohesion: 0.83
Nodes (3): Board 4: Colour, WCAG contrast checks (both themes), Sweet garden palette (cream, strawberry, honey, matcha)

### Community 36 - "Brand and avatar design"
Cohesion: 0.50
Nodes (4): Syllabus coverage, never predicted score, Common Entrance coverage without predicted score or affiliation, Weekly parent progress report email, Evidence-based celebration and next practice recommendations

### Community 37 - "Typography"
Cohesion: 0.50
Nodes (3): Nigerian-language glyph test, Inter body and fallback typography, Nunito display typography

### Community 38 - "Project documentation"
Cohesion: 0.67
Nodes (3): Core learning, school sharing, messages and research choices, Parental consent receipt email, Consent withdrawal stops use immediately and deletes within 30 days

### Community 39 - "Design System & Compliance UI"
Cohesion: 0.67
Nodes (3): Colour Role Tokens, Component Library, Storybook and axe Component Tests

### Community 40 - "Project documentation"
Cohesion: 0.67
Nodes (3): Verified NCEE practice-test blueprints, NECO NCEE details confirmation, Practice-test runtime

### Community 41 - "Project documentation"
Cohesion: 0.67
Nodes (3): Curriculum content schema and authorship, Foundations and legal decisions, Pure TypeScript learning rules and fixtures

### Community 42 - "Project documentation"
Cohesion: 0.67
Nodes (3): Gated Intermediate and Early Years follow-ons, Pilot in 5–10 schools, M6 MVP pilot gate

## Knowledge Gaps
- **144 isolated node(s):** `Non-affiliation Statement`, `Row Level Security`, `Reference Device`, `North Star Metric`, `class-join` (+139 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 229 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Auntie Stella (tutor character)` connect `Auntie Stella Brand Board` to `Avatar Generator Script`, `Brand Kit Theme Engine`, `Sky & Star Drawing Code`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `Non-affiliation Statement`, `Row Level Security`, `Reference Device` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Avatar Generator Script` be split into smaller, more focused modules?**
  _Cohesion score 0.07435897435897436 - nodes in this community are weakly interconnected._
- **Why does `Design System` connect `Design System & Compliance UI` to `Design System & Compliance UI`, `Design System & Compliance UI`, `Design System & Compliance UI`, `Docs Hub & Decisions`, `Child Runtime & Frontend`, `Child Runtime & Frontend`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Privacy, Security & Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.06282051282051282 - nodes in this community are weakly interconnected._
- **Why does `Stellara for Kids build documentation` connect `Docs Hub & Decisions` to `Design System & Compliance UI`, `Design System & Compliance UI`, `Edge Function API`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Edge Function API` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._

Semantic extraction ran in the host agents. Actual token usage is unavailable from this host; zero token counters are placeholders, not a claim of free extraction.
