# Net Boost Agent v2 Design

Date: 2026-06-05

## Goal

Net Boost Agent v2 upgrades the project from a safe network diagnostics tool into a decision-oriented network assistant. The agent should help users answer four practical questions:

1. What is likely slowing my network?
2. Does the evidence justify taking action?
3. Which action is worth trying first?
4. Did the action actually improve the network afterward?

The v2 design keeps the v1 safety model: read-only by default, dry-run before changes, explicit confirmation before apply, and benchmark evidence before claiming improvement.

## Product Positioning

The agent is not a generic "internet accelerator" and should not promise guaranteed speed improvements. It is a network triage and optimization advisor with a controlled execution path.

The core value is:

- Measured diagnostics.
- Goal-aware interpretation.
- Risk-ranked recommendations.
- Auditable apply decisions.
- Before/after benchmark evidence.

## Agent Model

v2 formalizes the agent loop:

1. Understand the user's network goal.
2. Run diagnostics and/or benchmark.
3. Assess evidence quality and issue impact.
4. Generate a ranked action plan.
5. Preview any selected fix.
6. Apply only confirmed actions.
7. Record the decision and result.
8. Recommend an after benchmark and compare it with the baseline.

This turns the project into a real agent workflow instead of a collection of commands.

## Network Goals

The agent supports explicit optimization goals:

- `general`: balanced default for normal browsing and mixed use.
- `gaming`: prioritize latency, jitter, and packet loss.
- `video_call`: prioritize latency, jitter, packet loss, and Wi-Fi stability.
- `download`: prioritize download throughput and bandwidth-heavy background process review.

If the user does not choose a goal, the agent uses `general` and states that assumption in reports.

## Evidence Model

Every diagnostic finding and recommendation carries an evidence level:

- `measured`: directly measured by a diagnostic, benchmark, or OS command.
- `inferred`: derived from partial evidence or known platform symptoms.
- `unavailable`: not measured because a tool, permission, platform signal, or network path was unavailable.

Reports must distinguish measured facts from inferred advice. This is important for trust and marketplace review.

## Assessment Stage

Add a new `assess` stage between diagnostics and recommendations. It converts raw checks into issue assessments:

- `issueId`: stable issue identifier.
- `sourceCheckIds`: diagnostics that support the issue.
- `goal`: selected optimization goal.
- `impact`: `low`, `medium`, or `high`.
- `confidence`: `low`, `medium`, or `high`.
- `risk`: expected risk of acting on the issue.
- `evidenceLevel`: `measured`, `inferred`, or `unavailable`.
- `summary`: user-facing explanation.

Example:

```json
{
  "issueId": "dns-latency",
  "sourceCheckIds": ["dns"],
  "goal": "gaming",
  "impact": "medium",
  "confidence": "high",
  "risk": "low",
  "evidenceLevel": "measured",
  "summary": "DNS resolution is slower than expected, but gaming traffic may be affected less after the game connection is established."
}
```

## Recommendation Scoring

Recommendations are ranked using three dimensions:

- `impact`: how much the issue affects the selected goal.
- `confidence`: how strong the evidence is.
- `risk`: how likely the action is to disrupt the system.

The default ordering is:

1. High impact, high confidence, low risk.
2. High impact, medium confidence, low risk.
3. Medium impact, high confidence, low risk.
4. Medium impact, medium confidence, medium risk.
5. Low confidence or high risk actions.

High-risk actions are not auto-applied and should remain outside v2's default apply path.

## Benchmark Policy

Benchmarking remains a required feature in v2. The agent should encourage this sequence:

1. Run `benchmark --label before`.
2. Run diagnostics.
3. Generate assessment and recommendations.
4. Preview and optionally apply one action.
5. Run `benchmark --label after`.
6. Compare before and after.

If a real speed-test provider is unavailable, benchmark output must degrade clearly and state which metrics were not measured.

## Apply Audit Log

v2 adds an append-only local audit log for preview and apply decisions:

- Timestamp.
- Plan ID.
- Action ID.
- Action description.
- Dry-run or applied mode.
- Confirmation status.
- Executor result.
- Suggested rollback note when available.

The audit log helps users understand what the agent did and supports future marketplace review.

## Skill Updates

The Codex skills become workflow-oriented:

- `diagnose-network`: ask or infer the user's goal, run diagnostics, and explain evidence levels.
- `benchmark-network`: create before/after baselines and remind users when comparison is inconclusive.
- `recommend-network-fixes`: use assessment results and rank actions by impact, confidence, and risk.
- `apply-network-fix`: require preview, explicit action ID, confirmation, audit log reference, and after-benchmark recommendation.

## MCP Tool Updates

v2 adds these MCP tools:

- `assess_network`: convert diagnostics into goal-aware issue assessments.
- `rank_fixes`: rank recommendation actions using impact, confidence, and risk.
- `read_audit_log`: inspect local preview/apply records.

Existing tools remain:

- `run_diagnostics`
- `run_benchmark`
- `compare_benchmarks`
- `generate_recommendations`
- `preview_fix`
- `apply_fix`

## Data Flow

1. User states a goal or the agent assumes `general`.
2. Agent runs benchmark and diagnostics.
3. Diagnostics produce structured checks.
4. Assessment maps checks to goal-aware issues.
5. Recommendation ranking turns issues into ordered actions.
6. Preview writes an audit entry with `dryRun: true`.
7. Confirmed apply writes an audit entry with `dryRun: false`.
8. Agent recommends after benchmark and comparison.

## Safety

v2 keeps these hard limits:

- No hidden automatic system modification.
- No destructive action without explicit confirmation.
- No global DNS changes by default.
- No registry, driver, router, VPN, firewall, or privileged service rewrites in the default v2 scope.
- No speed improvement claim without before/after evidence.
- No unredacted export of sensitive network identifiers by default.

## Testing Strategy

v2 requires tests for:

- Goal normalization.
- Evidence level assignment.
- Assessment generation.
- Recommendation ranking.
- Audit log append/read behavior.
- MCP tool schema for new tools.
- Skill files containing v2 workflow language.
- README and changelog references to v2 behavior.

## Version 2 Milestone

The v2 milestone is complete when:

- The CLI exposes `assess` or equivalent assessment flow.
- Recommendations include impact, confidence, risk, and evidence level.
- MCP exposes `assess_network`, `rank_fixes`, and `read_audit_log`.
- Apply preview and confirmed apply write audit entries.
- Agent skills describe the v2 workflow.
- README documents v2 positioning and benchmark policy.
- CHANGELOG records the v2 change set.
- Tests pass without requiring network state modification.

## Non-Goals

- Autonomous network optimization.
- Router management.
- Production telemetry service.
- Long-term vector memory.
- External RAG knowledge base.
- Paid marketplace submission assets such as screenshots, icons, and legal pages.

