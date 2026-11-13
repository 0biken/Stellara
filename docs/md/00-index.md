# Stellara for Kids: build documentation

*A personal tutor that knows your child, from kindergarten to Common Entrance.*

| | |
|---|---|
| **Version** | 1.0 draft · 12 November 2026 |
| **Status** | For review by the founder, academic lead, engineering and a data-protection lawyer |
| **Name** | "Stellara" is a working name and is not yet cleared |
| **Brand kit** | [Stellara Brand Kit](https://claude.ai/artifact/X6QxbuLuGakazbv4qT54ga) |

## What is being built

A progressive web app, sold to private primary schools, that helps children learn in short daily steps and shows parents real proof of progress. The first release (MVP) is **Common Entrance preparation** for Primary 5–6, with a weekly parent report and a teacher dashboard. The intermediate section (Primary 1–6) and the creche/KG section follow in later phases.

## Documents

| # | Document | For |
|---|---|---|
| 01 | [Product requirements](01-product-requirements.md) | Everyone |
| 02 | [Learning rules](02-learning-rules.md) | Product, engineering, QA, academic |
| 03 | [Curriculum and content](03-curriculum-and-content.md) | Academic, content, engineering |
| 04 | [Technical architecture](04-technical-architecture.md) | Engineering |
| 05 | [Data model](05-data-model.md) | Engineering |
| 06 | [API and events](06-api-and-events.md) | Engineering |
| 07 | [Privacy, security and compliance](07-privacy-security-compliance.md) | Founder, DPO, lawyer, engineering |
| 08 | [Design system](08-design-system.md) | Design, engineering |
| 09 | [Frontend guidelines](09-frontend-guidelines.md) | Engineering |
| 10 | [QA and testing](10-qa-and-testing.md) | QA, engineering |
| 11 | [DevOps and environments](11-devops-and-environments.md) | Engineering |
| 12 | [Analytics and metrics](12-analytics-and-metrics.md) | Founder, product |
| 13 | [School rollout and operations](13-school-rollout-and-operations.md) | Founder, school success |
| 14 | [Roadmap and release plan](14-roadmap-and-release-plan.md) | Everyone |
| 15 | [Glossary](15-glossary.md) | Everyone |
| 16 | [UX writing](16-ux-writing.md) | Design, product, content, engineering, school success |
| 17 | [Foundations and human gates](17-foundations-and-human-gates.md) | Engineering, founder, academic lead, product |

## Reading order by role

| Role | Read |
|---|---|
| Founder | 01, 12, 13, 14, 07 |
| Engineer | 01, 02, 04, 05, 06, 09, 10, 11 |
| Designer | 01, 08, 02 §3.5 and §7, brand kit |
| Academic lead and content team | 01, 02, 03, 08 §9 |
| DPO and lawyer | 07, 05 §3, 04 §8 |

## Decision log

| Date | Decision | By |
|---|---|---|
| Nov 2026 | Children's product first; sell through partner schools | Founder |
| Nov 2026 | Three sections: creche/KG, intermediate, Common Entrance | Founder |
| Nov 2026 | MVP = Common Entrance prep; the others are phased | Founder |
| Nov 2026 | Soft, calm visual direction (superseded 12 Nov); tutor named Auntie Stella | Founder |
| Nov 2026 | No "AI tutor" wording; no AI features for children in the MVP | Founder |
| Nov 2026 | Supabase-first stack with a Next.js PWA | Founder |
| Nov 2026 | Server is the only authority on scoring, time, mastery, Stardust and streaks | Product + engineering |
| 12 Nov 2026 | Rebrand to "Sweet garden": strawberry, honey and matcha on cream; Nunito headings; star-sprout logo; replaces the blue "soft and calm" palette | Founder |
| 12 Nov 2026 | Light and dark themes across the whole system, children's app included. Follows the device; parents can override per device in Settings | Founder |
| 12 Nov 2026 | Themes are named **Daytime** and **Starlight** (default: Match my phone). UX writing guide and email templates adopted: "sweet in moments, plain in facts" | Founder |

## Must be verified before the pilot

1. **2027 NCEE** papers, item counts, durations, mode and date (NECO brochure).
2. **Parental verification method** under NDPA s.31 (lawyer).
3. **Hosting region** and cross-border transfer basis (DPO).
4. **Trademark** clearance for the product name (agent).
5. **Pricing** and pilot terms with schools (founder).

## Assets

- Auntie Stella avatar (placeholder v2, sweet palette): `docs/assets/auntie-stella/` (smiling, listening, thinking, proud, round avatar).
- Build script for the static HTML version of these docs: `docs/tools/build.mjs`.
- Design tokens for both themes, with a contrast check that fails the build: `docs/tools/tokens.mjs` (`node tokens.mjs`).
- UX writing guide: [16](16-ux-writing.md). Email templates (9, Daytime and Starlight, HTML and plain text): `docs/emails/`, built by `docs/tools/emails.mjs`; gallery at `docs/emails/index.html`.
- Brand kit source and build: `brand-kit/src/stellara-brand-kit.src.html`, `docs/tools/brandkit.mjs`.
