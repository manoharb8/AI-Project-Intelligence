# Evidence health model — evidence-health-v1

The milestone requires an overall health score and scope clarity, timeline risk and blocker dimensions, but supplies no formula. The implementation uses the following explicit project-specific heuristic. It is not an industry standard, delivery probability, percent complete or calibrated predictive model.

## Inputs and scoring

Inputs are validated findings from the existing Scope & Deliverables, Risk & Delivery and Blockers & Actions agents, plus retrieved explicit zero-concern statements. Identical quoted wording is deduplicated case-insensitively. Source quotations are always retained.

| Dimension | Input and calculation | Weight in overall health |
| --- | --- | --- |
| Scope clarity | Goals, deliverables, milestones, timelines, responsibilities: each 20 points when established, 10 when unclear, 0 when not retrieved. Sum is 0–100. If no category has evidence, score is unavailable. | 40% |
| Timeline risk | Unique schedule-risk/delivery-challenge statements: critical 45, high 30, medium 20, low 10, unstated severity 25. Sum capped at 100. Higher means more risk. Health contribution = 100 − risk. | 35% |
| Blocker health | `max(0, 100 − 20 × number of unique unresolved-issue/blocked-task statements)`. Higher is better. Count is retrieved statements, not verified incidents. | 25% |

An unclear field is not fabricated to improve a score. Stated severity is preserved; the default 25-point penalty for unspecified severity is an explicit model coefficient, not a claim that the source called the risk “medium.” Likelihood is never inferred.

Only `schedule_risks` and `delivery_challenges` contribute timeline penalties. Dependency gaps and stated delivery forecasts remain visible in M2/documentation and are not silently treated as additional timeline incidents. Blocker health uses `unresolved_issues`; an unowned action is not automatically a blocker. Explicitly resolved/closed concerns and negated concerns are excluded by the documented extraction rules.

## Unknown, zero and contradictory evidence

- No retrieved blockers is **unknown**, not zero blockers. No retrieved risks is **unknown**, not zero risk.
- Explicit statements such as “No current blockers.” and “No current schedule risks.” permit zero concerns.
- “No blockers were reported/assessed/documented” describes missing reporting, not confirmed absence, and does not establish zero. Conditional or hedged zero statements do not establish zero either.
- A zero statement and a positive concern for the same dimension conflict. That dimension is unavailable and both quotations are shown; the service does not guess which source wins.
- If any dimension is unavailable, the overall score is `null`, even when other dimensions have numeric scores. Weights are never redistributed to hide missing evidence.
- Dates are not compared with the system clock to infer lateness. The service neither invents revised dates nor forecasts delivery.

## Overall calculation and interpretation

`overall = round_half_up(0.40 × scope_clarity + 0.35 × (100 − timeline_risk) + 0.25 × blocker_health)`

| Score | UI interpretation |
| --- | --- |
| 75–100 | Fewer documented concerns |
| 45–74 | Review needed |
| 0–44 | Needs attention |
| unavailable | Insufficient evidence for an overall score |

The bands are display thresholds for this heuristic. “Fewer documented concerns” does not certify a healthy real-world project or promise on-time delivery.

## Independently tested examples

For five established scope categories, one explicitly high timeline concern, and one unresolved blocker: scope=100, timeline risk=30, timeline health=70, blocker health=80. Overall=`40 + 24.5 + 20 = 84.5`, rounded half up to **85**.

For established scope plus explicit zero schedule risks and explicit zero blockers, the result is **100**. Removing the explicit blocker assessment makes blocker health and the overall score unavailable. Five or more unique blocker statements floor blocker health at zero. Duplicate wording does not double-count; different wording about the same incident can still count separately.

## Observed original sample result

The actual M3 live verification uploaded the unchanged four files in `samples/`: 4 indexed documents and 17 passages. For the broad default focus, the returned dimension scores were scope clarity **100**, timeline risk **100** (5 risk indicators), and blocker health **20** (4 issue statements). Overall=`40 + 0 + 5 = 45`, **Review needed**. The result was marked partial because retrieval was bounded. These are recorded fixture results, not hard-coded application values or claims about a user's real project.

## What users can inspect

The API exposes the methodology version, weights, score direction, counts, per-dimension calculations, scope category points, evidence IDs, exact quotations, status, timestamp and caveats. The frontend displays “Why this score?” with these details. The assistant's health answers call this same service; conversation history cannot supply a score.

Adding source documents and explicitly rerunning changes the inputs and can change the result. Existing frontend results are marked potentially out of date after uploads. Retrieval limits, conservative English classification, contradictory records and multiple descriptions of one incident remain material limitations. The model is deterministic for a fixed set of validated findings; an optional nondeterministic external provider can select different findings across runs.
