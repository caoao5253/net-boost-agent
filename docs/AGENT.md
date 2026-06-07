# Net Boost Agent - Coding Agent Specification

This document describes Net Boost Agent as a coding-agent project: the intent, trigger model, tool orchestration, safety rules, state transitions, and verification contract. It is written for maintainers, reviewers, and marketplace evaluation.

## Agent Intent

Net Boost Agent helps a user optimize their local network environment through a measured, reversible, and auditable workflow.

The agent is not a one-click accelerator. It is an evidence-driven assistant that:

- Checks whether benchmark dependencies are available.
- Measures the network before optimization.
- Diagnoses likely bottlenecks.
- Assesses evidence against a user goal.
- Ranks low-risk fixes.
- Requires preview and explicit confirmation before changes.
- Measures the network after optimization.
- Produces a human-readable before/after report.

## User Trigger Model

Primary trigger:

```text
@net-boost-agent help me optimize my network
```

Natural language variants:

```text
Help me optimize my network.
Why is my internet slow?
Run a before/after network optimization report.
Check whether my network improved after the fix.
```

The recommended high-level skill is:

```text
optimize-network
```

The user should not be asked to run internal project scripts. If a command-line entry is needed for automation, use the installed CLI name:

```bash
net-boost doctor --json
```

## Agent Workflow

The full optimization workflow is:

1. `check_dependencies`
2. If Speedtest CLI is missing, continue basic diagnostics instead of stopping.
3. If Speedtest CLI is available, run `run_benchmark` with label `before`.
4. `run_diagnostics`
5. `assess_network`
6. `generate_recommendations`
7. `rank_fixes`
8. `preview_fix`
9. Ask for explicit user confirmation
10. `apply_fix`
11. If Speedtest CLI is available or the user provides `speedtestPath`, run `run_benchmark` with label `after`.
12. `compare_benchmarks`
13. `read_audit_log`
14. `generate_human_report`

The agent may stop early when a required condition is not met, but it must explain the reason and the next action.

## State Machine

```text
idle
  -> dependency_check
  -> missing_speedtest_continue_diagnostics | ready_for_baseline
  -> waiting_for_speedtest_path | baseline_complete
  -> baseline_complete
  -> diagnostics_complete
  -> recommendations_ready
  -> preview_ready
  -> awaiting_confirmation
  -> applied | skipped_apply
  -> after_benchmark_complete
  -> report_ready
```

### State Details

- `missing_speedtest_continue_diagnostics`: Ookla Speedtest CLI is unavailable, but Net Boost Agent still runs DNS, Wi-Fi, gateway latency, packet loss, network profile, bandwidth-process, and mDNS diagnostics.
- `waiting_for_speedtest_path`: download/upload benchmark is unavailable until the user downloads Speedtest CLI and sends the executable path.
- `ready_for_baseline`: dependencies are sufficient to collect meaningful metrics.
- `recommendations_ready`: actions are ranked by impact, confidence, and risk.
- `awaiting_confirmation`: no system-changing action may run until the user confirms.
- `report_ready`: the agent has produced a user-facing report with result, Top issues, changes, safety, and next steps.

## Tools

### Read-Only Tools

- `check_dependencies`
- `run_diagnostics`
- `run_benchmark`
- `compare_benchmarks`
- `assess_network`
- `generate_recommendations`
- `rank_fixes`
- `read_audit_log`
- `generate_human_report`

### Confirmation-Gated Tool

- `apply_fix`

`apply_fix` is destructive. It requires an action ID and explicit user confirmation.

## Evidence Model

Every user-facing claim should be tied to evidence:

- `measured`: directly measured by benchmark, diagnostic check, OS command, or Speedtest CLI.
- `inferred`: derived from partial evidence or known symptoms.
- `unavailable`: not measured because a dependency, permission, signal, or provider was unavailable.

If a metric is unavailable, the agent must not claim improvement for that metric.

## Benchmark Policy

The benchmark flow uses Ookla Speedtest CLI as the primary provider:

```text
speedtest --format=json --accept-license --accept-gdpr
```

Legacy fallback:

```text
speedtest-cli --json
```

Multi-round benchmarks use median aggregation to reduce noise. Before and after runs are tracked by label pointers such as:

```text
.net-boost-runs/latest-before.json
.net-boost-runs/latest-after.json
```

If the provider is missing, benchmark output must contain:

```json
{
  "provider": "speedtest",
  "providerStatus": "missing",
  "missingTools": ["speedtest"]
}
```

The final report must mark affected metrics as inconclusive.

## Missing Speedtest Recovery Flow

When Net Boost Agent cannot find Speedtest CLI, it must continue the Agent workflow instead of failing the whole task:

```text
Net Boost Agent detects Speedtest is unavailable
-> Net Boost Agent continues basic diagnostics
-> Net Boost Agent marks download/upload as unavailable
-> Net Boost Agent shows https://www.speedtest.net/apps/cli
-> User provides a downloaded speedtest executable path
-> Net Boost Agent resumes before/after benchmark with speedtestPath
```

The continuation inputs are:

```text
speedtestPath
--speedtest-path <path-to-speedtest>
NET_BOOST_SPEEDTEST_PATH
```

This is part of Net Boost Agent's execution logic. It is not a separate manual workflow for the user.

## User Report Contract

The human report must answer:

1. How is the network right now?
2. What are the Top 3 issues?
3. Did the network improve after optimization?
4. What changed, and was it safe?
5. What should the user do next?

Required sections:

- `Summary`
- `Current Network`
- `Top 3 Issues`
- `Before vs After`
- `What Changed`
- `Safety`
- `Next Steps`

Allowed results:

- `Improved`
- `Regressed`
- `Mixed`
- `Inconclusive`

## Safety Rules

- Default behavior is read-only.
- Dependency checks, diagnostics, benchmarks, assessment, ranking, and report generation must not modify the system.
- Recommendations are plans, not actions.
- Every apply operation must be preceded by preview.
- Every apply operation requires explicit confirmation.
- The agent must record preview/apply decisions in the audit log when an audit path is available.
- The agent must not promise guaranteed speed improvement.
- The agent must not hide missing data.
- Sensitive network identifiers should be redacted in exported reports by default.

## Error Handling

The agent should degrade gracefully:

- Missing Speedtest CLI: show official download page and mark benchmark metrics as inconclusive.
- Missing permission: return `unknown` or `unavailable` evidence rather than failing the full workflow.
- Timeout: preserve partial results and explain which metrics were not collected.
- Apply failure: stop the current action, preserve audit evidence, and do not continue with dependent actions.

## Package Layout

```text
.codex-plugin/plugin.json       Codex plugin manifest
.mcp.json                       MCP server config
bin/                            Installed CLI entry points
skills/                         Agent skill definitions
src/core/                       Agent business logic
src/platform/                   Platform adapters
src/mcp/                        MCP server
tests/                          Node test suite
docs/                           Design and implementation docs
```

## Key Modules

- `src/core/dependencies.js`: dependency and download guidance.
- `src/core/benchmark.js`: provider execution, median aggregation, before/after comparison.
- `src/core/diagnose.js`: diagnostic orchestration.
- `src/core/assess.js`: goal-aware issue assessment.
- `src/core/recommend.js`: recommendation plan generation.
- `src/core/rank.js`: action ranking.
- `src/core/apply.js`: preview and confirmation-gated apply.
- `src/core/audit.js`: audit log.
- `src/core/human-report.js`: user-facing report generation.
- `src/mcp/server.js`: MCP tool surface.

## Verification

Run:

```bash
npm test
```

Current expected result: all tests pass.

Important test coverage:

- Dependency metadata and missing Speedtest CLI handling.
- Missing Speedtest recovery flow and direct executable path continuation.
- Real Speedtest provider parsing and legacy fallback.
- Multi-round benchmark median aggregation.
- Before/after comparison.
- Human report generation.
- MCP tool listing.
- Agent skill presence.
- User-facing docs avoiding internal script paths.
- Apply confirmation gate and audit behavior.

## Marketplace Readiness Notes

The project has the core shape of a marketable Agent:

- High-level skill entry point.
- Codex plugin manifest.
- MCP server.
- Read-only default behavior.
- Explicit destructive-action gate.
- User-facing reports.
- Test coverage.

Remaining marketplace polish:

- Real icon and screenshots.
- Public repository URL.
- Privacy policy and terms URLs.
- Final plugin validator pass in an environment with required validator dependencies.
- End-to-end testing on a clean Windows machine with Ookla Speedtest CLI installed.
