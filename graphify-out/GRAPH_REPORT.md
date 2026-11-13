# Graph Report - Stellara  (2026-11-13)

## Corpus Check
- 134 files · ~66,483 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .css 1)

## Summary
- 1026 nodes · 1463 edges · 69 communities (55 shown, 14 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Learning rules engine
- Avatar Generator Script
- Learning rules engine
- Foundation and authoring preparation
- Web and shared catalogues
- Learning rules engine
- Edge Function API
- Avatar Generator Script
- Project documentation
- Content schemas and curriculum
- MVP Scope & Motivation
- Docs Hub & Decisions
- Design System & Compliance UI
- Edge Function API
- Design System & Compliance UI
- Child Runtime & Frontend
- Foundation and authoring preparation
- Project documentation
- Docs Hub & Decisions
- Foundation and authoring preparation
- Scoring Tables & RLS
- Voice, Motion & Rewards
- Sky & Star Drawing Code
- Docs Hub & Decisions
- Design System & Compliance UI
- Content schemas and curriculum
- Content schemas and curriculum
- Auntie Stella Brand Board
- Brand Kit Motion & 3D Code
- Auntie Stella Artwork
- Core Architecture ADRs
- Privacy, Security & Analytics
- Privacy, Security & Analytics
- Brand and avatar design
- Content schemas and curriculum
- Content schemas and curriculum
- Brand Foundation
- Core Architecture ADRs
- Offline Packs & Practice Tests
- Content schemas and curriculum
- Learning rules engine
- Foundation and authoring preparation
- Brand Kit Theme Engine
- Edge Function API
- Child Runtime & Frontend
- Privacy, Security & Analytics
- Web and shared catalogues
- MVP Scope & Motivation
- Privacy, Security & Analytics
- Brand Kit Theme Engine
- Design System & Compliance UI
- Logo & App Icon
- Brand and avatar design
- Design System & Compliance UI
- Project documentation
- Foundation and authoring preparation
- Foundation and authoring preparation
- Foundation and authoring preparation
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
7. `QA and Testing` - 16 edges
8. `Stellara for Kids build documentation` - 16 edges
9. `Technical architecture` - 16 edges
10. `compilerOptions` - 15 edges

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
- **Engineering foundation awaits product, academic, exam and rights acceptance** — docs_md_17_foundations_and_human_gates_engineering_deliverables, docs_md_17_foundations_and_human_gates_human_acceptance_record, docs_md_17_foundations_and_human_gates_m1_product_sign_off, docs_md_17_foundations_and_human_gates_curriculum_approval, docs_md_17_foundations_and_human_gates_exam_2027_verification, docs_md_17_foundations_and_human_gates_contributor_agreements, docs_md_17_foundations_and_human_gates_authoring_quotes [EXTRACTED 1.00]
- **Motivation uses server-earned Stardust, qualifying days and protected rests** — docs_md_02_learning_rules_stardust, docs_md_02_learning_rules_days_in_a_row_and_resting_clouds, docs_md_02_learning_rules_rest_mode [INFERRED 0.85]
- **Planned offline practice delivery and durable submission flow** — docs_md_06_api_and_events_pack_build, docs_md_09_frontend_guidelines_packs_module, docs_md_09_frontend_guidelines_outbox_module, docs_md_06_api_and_events_responses_submit, docs_md_06_api_and_events_sync_completed_event, docs_md_09_frontend_guidelines_dexie_indexeddb [INFERRED 0.85]
- **Consent-gated child profile creation** — docs_md_01_product_requirements_consent_before_child_profile, docs_md_05_data_model_children_consent_trigger, docs_md_05_data_model_consents_table, docs_md_05_data_model_children_table, docs_md_01_product_requirements_nigeria_data_protection_act [INFERRED 0.85]
- **Parental consent and NDPA compliance** — docs_md_07_privacy_security_compliance_nigeria_data_protection_act_2023, docs_md_07_privacy_security_compliance_parental_consent_flow, docs_md_06_api_and_events_consent_start, docs_md_06_api_and_events_consent_confirm, docs_md_06_api_and_events_child_create, docs_md_07_privacy_security_compliance_dpia, docs_md_07_privacy_security_compliance_data_protection_officer [INFERRED 0.85]
- **Stellara brand assets in the Sweet Garden palette** — docs_assets_logo_stellara_mark_star_mark, docs_assets_logo_stellara_app_icon_app_icon, docs_assets_auntie_stella_auntie_stella_character, docs_assets_auntie_stella_sweet_garden_palette [INFERRED 0.85]
- **Auntie Stella expression variants sharing one character rig** — docs_assets_auntie_stella_auntie_stella_avatar_round_auntie_stella_avatar_round, docs_assets_auntie_stella_auntie_stella_listening_auntie_stella_listening, docs_assets_auntie_stella_auntie_stella_proud_auntie_stella_proud, docs_assets_auntie_stella_auntie_stella_smiling_auntie_stella_smiling, docs_assets_auntie_stella_auntie_stella_thinking_auntie_stella_thinking, docs_assets_auntie_stella_expression_set [INFERRED 0.95]

## Communities (69 total, 14 thin omitted)

### Community 0 - "Learning rules engine"
Cohesion: 0.08
Nodes (43): rules_version, PlacementLabel, placementRecommendations(), PlacementStrand, placementStrandResult(), PlacementTopic, buildWeeklyReport(), byId() (+35 more)

### Community 1 - "Avatar Generator Script"
Cohesion: 0.06
Nodes (30): docs/assets/auntie-stella/, C, EXPR, figure(), files, icon, LOGO_DIR, motionCss() (+22 more)

### Community 2 - "Learning rules engine"
Cohesion: 0.04
Nodes (42): compilerOptions, declaration, incremental, jsx, module, moduleResolution, noEmit, plugins (+34 more)

### Community 4 - "Foundation and authoring preparation"
Cohesion: 0.06
Nodes (41): devDependencies, eslint@9.39.5, eslint-config-next@16.4.6, eslint-plugin-import-x@4.18.1, fast-check@4.10.2, prettier@3.10.1, turbo@2.11.11, @types/node@22.20.5 (+33 more)

### Community 5 - "Web and shared catalogues"
Cohesion: 0.06
Nodes (27): copy, metadata, Home(), config, dependencies, next@16.4.6, react@19.3.1, react-dom@19.3.1 (+19 more)

### Community 6 - "Learning rules engine"
Cohesion: 0.16
Nodes (26): initialMasteryState(), MasteryEvent, MasteryEvidence, MasteryLevel, MasteryState, MasteryTransitionReason, MasteryUpdate, practiceLevel() (+18 more)

### Community 7 - "Edge Function API"
Cohesion: 0.09
Nodes (30): Auntie Stella, Blueprint, Class Mode, Constellation / sky, Coverage, Daytime, Data Protection Officer, Edge Function (+22 more)

### Community 8 - "Avatar Generator Script"
Cohesion: 0.08
Nodes (25): AV, avatars, buildSite(), buildStatic(), docs, esc(), files, HTML (+17 more)

### Community 9 - "Project documentation"
Cohesion: 0.09
Nodes (14): avatar, D, icon, layout(), link(), N, OUT, ROOT (+6 more)

### Community 10 - "Content schemas and curriculum"
Cohesion: 0.08
Nodes (24): clozeAnswerSchema, commonShape, contentStatusSchema, draftCommon, DraftItem, ItemAnswer, itemAnswerSchema, itemSchema (+16 more)

### Community 11 - "MVP Scope & Motivation"
Cohesion: 0.13
Nodes (8): Placement check feature, Stardust and days in a row (KID-06), Learning rules, activity_days table, attempts table, mastery_states table, sets table, stardust_ledger table

### Community 12 - "Docs Hub & Decisions"
Cohesion: 0.09
Nodes (15): Auntie Stella avatar assets, Decision log, Design tokens script (tokens.mjs) with contrast check, Docs build script (build.mjs), Email templates, Light and dark themes, No AI tutor wording / no AI features for children in MVP, Must be verified before the pilot (+7 more)

### Community 13 - "Design System & Compliance UI"
Cohesion: 0.11
Nodes (22): Accessibility Requirements, Answer Tile, Auntie Stella, Colour Role Tokens, Component Library, Design Principles, Design System, Hint Card (+14 more)

### Community 14 - "Edge Function API"
Cohesion: 0.13
Nodes (3): API and Events, Parental Consent Flow, School Onboarding

### Community 15 - "Design System & Compliance UI"
Cohesion: 0.13
Nodes (20): Auntie Stella child voice, Children's app copy, Nine email templates, What happened, then what to do, ICU MessageFormat, Nigerian English writing mechanics, New string checklist, Writing for Nigerian families (+12 more)

### Community 16 - "Child Runtime & Frontend"
Cohesion: 0.11
Nodes (4): Motion Tokens, Tokens in Code (CSS and Tailwind), Frontend Guidelines, Next.js 15 App Router (historical baseline)

### Community 17 - "Foundation and authoring preparation"
Cohesion: 0.11
Nodes (18): dependsOn, outputs, cache, persistent, $schema, cache, outputs, outputs (+10 more)

### Community 18 - "Project documentation"
Cohesion: 0.11
Nodes (17): NEXT_TELEMETRY_DISABLED, jobs, quality, name, on, pull_request, push, permissions (+9 more)

### Community 19 - "Docs Hub & Decisions"
Cohesion: 0.15
Nodes (8): Common Entrance prep section (MVP), Content studio, NCEE (National Common Entrance Examination), Curriculum and content, curriculum_nodes table, item_versions publish trigger, item_versions table, NECO 2026 NCEE general information

### Community 20 - "Foundation and authoring preparation"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, lib, module, moduleResolution (+7 more)

### Community 21 - "Scoring Tables & RLS"
Cohesion: 0.21
Nodes (13): audit_log table, children insert consent trigger, children table, classes table, consents table, Data model, item_answers table, mastery_events table (+5 more)

### Community 22 - "Voice, Motion & Rewards"
Cohesion: 0.14
Nodes (14): Board 8: Voice and tone, Document 16 UX writing guide, Nine themed HTML and plain-text email templates, WhatsApp primary and GSM-7 SMS fallback, Resting cloud (missed day keeps run safe), Stardust (points), Voice: Stella to children, Stellara to parents, We say / we never say word list (+6 more)

### Community 23 - "Sky & Star Drawing Code"
Cohesion: 0.16
Nodes (13): chubby(), ico(), Icon set (rounded 1.75px line, one honey accent), ICONS, logoMark(), shape(), sky(), soft() (+5 more)

### Community 24 - "Docs Hub & Decisions"
Cohesion: 0.14
Nodes (7): Creche and kindergarten section (Phase 3), Intermediate section (Primary 1-6, Phase 2), Non-functional requirements, Open questions Q1-Q5, Out-of-MVP features with return conditions, Product requirements (PRD), events table

### Community 25 - "Design System & Compliance UI"
Cohesion: 0.18
Nodes (13): Device Lab, Edge Function Contract Tests, Forbidden-phrase Lint, Key Journeys, Lighthouse CI, Offline and Interruption Matrix, pgTAP RLS Tests, Playwright E2E Tests (+5 more)

### Community 26 - "Content schemas and curriculum"
Cohesion: 0.14
Nodes (12): curriculumEditionSchema, uuidSchema, Blueprint, Curriculum, curriculumNodeSchema, curriculumSchema, examPaperSchema, learningAreaSchema (+4 more)

### Community 27 - "Content schemas and curriculum"
Cohesion: 0.15
Nodes (11): projectItemForClient(), blueprintSchema, publishedBlueprintSchema, draftItemSchema, lessonSchema, publishedItemSchema, publishedStimulusSchema, stimulusSchema (+3 more)

### Community 28 - "Auntie Stella Brand Board"
Cohesion: 0.20
Nodes (11): Auntie Stella (tutor character), Board 9: Applications, Board 3: Auntie Stella, Board 5: Typography, Stellara Brand Kit page, Nigerian-language glyph test, Inter body and fallback typography, Nunito display typography (+3 more)

### Community 29 - "Brand Kit Motion & 3D Code"
Cohesion: 0.20
Nodes (7): Babylon.js sweet sky 3D scene, Board 7: Motion and 3D, build(), Micro-interaction previews (answer, days in a row, topic mastered), Motion tokens (ease-out, ease-in-out, 120/200/400ms), paint(), start()

### Community 30 - "Auntie Stella Artwork"
Cohesion: 0.29
Nodes (12): Auntie Stella Round Avatar (Smiling), Auntie Stella Character, Auntie Stella Listening, Auntie Stella Proud, Auntie Stella Smiling, Auntie Stella Thinking, Auntie Stella Expression Set, Auntie Stella Expression Preview Sheet (+4 more)

### Community 31 - "Core Architecture ADRs"
Cohesion: 0.20
Nodes (3): Auntie Stella, Weekly parent report (FAM-04), Style guide for writers

### Community 32 - "Privacy, Security & Analytics"
Cohesion: 0.20
Nodes (10): Breach Runbook, Claims and Marketing Rules, DPIA, GAID 2025, NDPC, Nigeria Data Protection Act 2023, Non-affiliation Statement, Privacy, Security and Compliance (+2 more)

### Community 33 - "Privacy, Security & Analytics"
Cohesion: 0.17
Nodes (3): Retention Policy, DevOps and Environments, Metabase Dashboards

### Community 34 - "Brand and avatar design"
Cohesion: 0.24
Nodes (12): Auntie Stella animated avatars implementation plan, Accessible animated SVG variants, Full asset verification, Generated comparison gallery, Six-second MP4 gallery, Static avatar hash preservation, Auntie Stella animated avatars, Expression-specific gestures with quiet holds (+4 more)

### Community 35 - "Content schemas and curriculum"
Cohesion: 0.18
Nodes (11): dependencies, zod@4.6.7, name, private, scripts, build, test, typecheck (+3 more)

### Community 36 - "Content schemas and curriculum"
Cohesion: 0.17
Nodes (11): clientBase, ClientItem, clientItemSchema, clientStimulusSchema, clozeSlotSchema, clozeSlotsSchema, itemTypeSchema, mediaSchema (+3 more)

### Community 37 - "Brand Foundation"
Cohesion: 0.22
Nodes (10): Audiences: ages 4-7, 8-12, parents, schools, Board 1: Brand foundation, Board 6: Icons and illustration, Brand idea: Learning grows (stars sprout), Positioning: playful daily habit vs credible mastery, Growing sky constellation motif, Mastery states: none, developing, proficient, mastered, Mission: real understanding, one step at a time (+2 more)

### Community 38 - "Core Architecture ADRs"
Cohesion: 0.24
Nodes (4): Child sign-in with 4-picture PIN, Node 22 pnpm/Turborepo monorepo, Technical architecture, child_pins table

### Community 39 - "Offline Packs & Practice Tests"
Cohesion: 0.22
Nodes (3): Offline practice packs, Timed practice tests (KID-04), test_blueprints table

### Community 40 - "Content schemas and curriculum"
Cohesion: 0.20
Nodes (10): import, types, import, types, exports, ./client, ./curriculum, ./server (+2 more)

### Community 41 - "Learning rules engine"
Cohesion: 0.20
Nodes (9): exports, name, private, scripts, build, test, typecheck, type (+1 more)

### Community 42 - "Foundation and authoring preparation"
Cohesion: 0.20
Nodes (9): exports, ./tokens.css, name, private, scripts, build, typecheck, type (+1 more)

### Community 43 - "Brand Kit Theme Engine"
Cohesion: 0.31
Nodes (8): Per-device Match my phone appearance setting, applyTheme(), Board 4: Colour, WCAG contrast checks (both themes), Warm cocoa dark theme, Daytime theme, Semantic colour tokens (:root CSS variables), Sweet garden palette (cream, strawberry, honey, matcha)

### Community 44 - "Edge Function API"
Cohesion: 0.22
Nodes (7): Data Protection Officer, Commercial Model, Paystack, School Rollout and Operations, Stellara Pilot Roles, Support Channels, Teacher Workflows

### Community 45 - "Child Runtime & Frontend"
Cohesion: 0.22
Nodes (5): Append-only Integrity Tables, argon2id PIN hashing, OWASP ASVS Level 2, Row Level Security, Security Controls

### Community 46 - "Privacy, Security & Analytics"
Cohesion: 0.28
Nodes (7): Pilot Gate, Milestones M0-M6, NCEE 2027, Phase 2 and Phase 3, Phases Gantt Plan, Risk Register, Roadmap and Release Plan

### Community 47 - "Web and shared catalogues"
Cohesion: 0.22
Nodes (8): exports, name, private, scripts, build, typecheck, type, version

### Community 48 - "MVP Scope & Motivation"
Cohesion: 0.25
Nodes (5): Data export and delete (FAM-05/06), MVP scope (Phase 1), Nigeria Data Protection Act (NDPA), Teacher dashboard, data_requests table

### Community 49 - "Privacy, Security & Analytics"
Cohesion: 0.29
Nodes (3): Analytics and Metrics, North Star Metric, Pilot KPIs

### Community 50 - "Brand Kit Theme Engine"
Cohesion: 0.33
Nodes (7): CORE / NEUTRAL swatch lists, inkFor(), lumOf(), PAIRS (contrast pairs), ratio(), sw(), T (light/dark colour table)

### Community 51 - "Design System & Compliance UI"
Cohesion: 0.33
Nodes (5): Contrast Table, Light and Dark Theme, tokens.mjs contrast checker, Release Checklist, Theme Check

### Community 53 - "Logo & App Icon"
Cohesion: 0.40
Nodes (5): App icon (star sprout on Strawberry Milk), Board 2: Logo, Clear space and minimum size, Four-point sparkle (misuse), Logo misuse rules

### Community 55 - "Brand and avatar design"
Cohesion: 0.50
Nodes (4): Syllabus coverage, never predicted score, Common Entrance coverage without predicted score or affiliation, Weekly parent progress report email, Evidence-based celebration and next practice recommendations

### Community 56 - "Design System & Compliance UI"
Cohesion: 0.50
Nodes (4): Appearance Setting, Email rendering checks, Daytime and Starlight appearance, Email rules

### Community 57 - "Project documentation"
Cohesion: 0.67
Nodes (3): Core learning, school sharing, messages and research choices, Parental consent receipt email, Consent withdrawal stops use immediately and deletes within 30 days

## Knowledge Gaps
- **106 isolated node(s):** `docs/assets/auntie-stella/`, `GAID 2025`, `Non-affiliation Statement`, `Processor Contracts`, `Roles and Access` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 462 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Learning rules engine` to `Content schemas and curriculum`, `Foundation and authoring preparation`, `Learning rules engine`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `docs/assets/auntie-stella/`, `GAID 2025`, `Non-affiliation Statement` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Learning rules engine` be split into smaller, more focused modules?**
  _Cohesion score 0.07680491551459294 - nodes in this community are weakly interconnected._
- **Why does `Auntie Stella (tutor character)` connect `Auntie Stella Brand Board` to `Avatar Generator Script`, `Brand Kit Theme Engine`, `Sky & Star Drawing Code`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `Avatar Generator Script` be split into smaller, more focused modules?**
  _Cohesion score 0.06359189378057302 - nodes in this community are weakly interconnected._
- **Why does `Stellara for Kids build documentation` connect `Docs Hub & Decisions` to `Design System & Compliance UI`, `Design System & Compliance UI`, `Edge Function API`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Learning rules engine` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._

Semantic extraction used host agents. Actual token metrics are unavailable; zero counters are placeholders, not a claim of free extraction. Aggregate tracked costs exclude these unreported runs.

Structural extraction reported ten code/configuration/test files with no extractable symbols. Their source remains authoritative; this graph does not certify complete symbol coverage for those files.

The health diagnostic reports one self-loop: scripts/check-boundaries.mjs sources() calls itself for recursive directory traversal. This is an explicit source-level call, not an unresolved endpoint.
