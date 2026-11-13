# 12 · Analytics and metrics

## 1. North star

**Topics mastered per active pupil per month**, where mastered means Level 3 (`proficient`) or higher under the rules in [02](02-learning-rules.md). It is tied to real learning, not time spent.

## 2. KPIs and pilot targets

All targets are **v0 proposals** for the January–April 2027 pilot, to be reset with data.

| Area | Metric | Target |
|---|---|---|
| Activation | Children with consent who complete the placement check within 7 days | ≥ 60% |
| Engagement | Weekly active pupils / enrolled pupils | ≥ 50% |
| Habit | Pupils with ≥ 3 qualifying days per week | ≥ 35% |
| Learning | Topics reaching `proficient` per active pupil per month | ≥ 3 |
| Retention of learning | Retention checks passed at 4/5 or better | ≥ 70% |
| Parents | Weekly report opened within 7 days | ≥ 55% |
| Teachers | Teachers who assign at least one set per fortnight | ≥ 60% |
| Schools | Schools that say they intend to renew (end-of-pilot survey) | ≥ 70% |
| Quality | Published items with a confirmed error | < 1% |
| Performance | Field LCP p75 on child screens | ≤ 2.5 s |
| Offline | Responses synced within 24 h | ≥ 95% |

## 3. Pilot gate (go / no-go for Phase 2)

Proceed to Phase 2 if **all** are true after the 2027 NCEE:

1. Weekly active pupils ≥ 50% for at least 6 of the last 8 term weeks.
2. A measurable gain on delayed retention checks versus the placement baseline.
3. ≥ 70% of pilot schools intend to renew at the proposed price.
4. No unresolved privacy incident; DPIA up to date.
5. 100% of published items have verified answers.

Optional, with consent: collect actual NCEE outcomes from parents to compare with practice data. Publish findings honestly, including the error band, before using any outcome in marketing.

## 4. Dashboards (Metabase)

| Dashboard | Audience | Content |
|---|---|---|
| Pilot health | Founder, product | KPIs above, by school and week |
| Learning | Academic lead | Mastery distribution by topic, item statistics, hardest topics |
| Content | Content lead | Items by status, review throughput, error reports |
| Operations | Engineering | Sync delays, function latency, error rates, vitals |
| School view | Schools (in-app, not Metabase) | Their own classes only |

## 5. Privacy limits on analytics

- First-party events only ([06 §7](06-api-and-events.md#7-analytics-event-catalogue)); no third-party analytics or session recording on child or parent screens.
- Child identifiers hashed with a rotating salt per term in `events`.
- Minimum group size of 5 in any school-level breakdown shown outside Stellara.
- The product-research purpose (consent toggle) is required for using a child's data in research beyond service improvement.
