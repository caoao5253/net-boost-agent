# Net Boost Agent Design

Date: 2026-06-05

## Goal

Build `net-boost-agent`, a dual-compatible network diagnostics and optimization assistant that can be packaged for both Codex plugins and Claude/MCP usage. The first version helps users make their internet connection faster by diagnosing common bottlenecks, measuring before/after performance, and producing safe optimization plans.

The default behavior is read-only. Any operation that changes system network state, terminates processes, or edits service configuration must run only through an explicit `apply` flow with a dry-run preview and user confirmation.

## Target Users

The first version targets power users, developers, and support engineers on Windows-first workstations who want a structured way to diagnose slow internet. The design should not assume the user is a network expert. Reports should explain what was checked, what was found, and what can safely be changed.

## Product Shape

The project will use a shared core plus thin distribution wrappers:

- Core CLI: contains diagnostics, benchmark orchestration, report generation, and safe apply operations.
- MCP server: exposes the core workflows to Claude, Claude Code, and other MCP clients.
- Codex plugin wrapper: provides `.codex-plugin/plugin.json`, skills, and command entry points that call the same core CLI.

This avoids duplicating network logic across plugin formats and keeps the project easier to test and publish.

## Functional Scope

### Diagnostics

`diagnose` runs a read-only network health check and returns structured findings:

- Speed test availability and measured download, upload, latency, and jitter when a speed-test provider is configured.
- DNS resolution timing across configured resolvers and a small fixed domain set.
- MTU probing and fragmentation risk.
- Packet loss and latency to a configurable host set.
- Wi-Fi signal quality and basic interference indicators when wireless data is available.
- Local network profile inventory, including stale or disconnected profiles.
- High-bandwidth background processes where the platform exposes enough information.
- mDNS status and likely misconfiguration signals.

Each diagnostic check returns `ok`, `warning`, `critical`, or `unknown`, plus evidence and remediation options.

### Benchmarking

`benchmark` is a first-class feature. It captures before/after measurements so users can verify whether changes helped:

- Timestamped test runs.
- Download/upload speed, latency, jitter, packet loss, DNS timing, and selected route/MTU results.
- JSON output for machines.
- Markdown summary for humans.
- Comparison output that highlights improvements, regressions, and inconclusive results.

Benchmarking is required for marketplace readiness because it turns the tool from "claims to optimize" into measurable evidence.

### Recommendations

`recommend` converts diagnostics into an optimization plan:

- Groups findings by impact and confidence.
- Marks each action as read-only, safe local cleanup, process control, or system/network configuration change.
- Shows expected benefit, risk, required permissions, reversibility, and exact commands or API calls.
- Does not apply changes.

### Apply Mode

`apply` is opt-in and must never run implicitly. It supports a staged flow:

1. Generate a dry-run plan.
2. Ask the user to approve specific actions.
3. Execute only approved actions.
4. Record what changed and, where possible, how to revert it.
5. Run a post-change benchmark if the user requests it.

Initial apply candidates:

- Remove stale network profiles/configuration entries.
- Stop or limit user-approved bandwidth-heavy background processes.
- Apply conservative mDNS optimization steps.

Risky operations such as registry edits, driver changes, firewall rewrites, router configuration, VPN modification, or global DNS changes are out of scope for the first version unless implemented later behind stronger confirmation and platform-specific tests.

## Architecture

### Core Modules

- `core/checks`: individual diagnostic checks with a common result contract.
- `core/benchmark`: orchestration for repeated measurements and comparisons.
- `core/recommend`: rule engine that maps check results to suggested actions.
- `core/apply`: safe action executor with dry-run, confirmation metadata, and change logs.
- `core/report`: JSON and Markdown report rendering.
- `platform/windows`: Windows-specific adapters for PowerShell, network profile inspection, Wi-Fi data, process data, and mDNS status.
- `platform/common`: cross-platform helpers for DNS, ping, MTU probing, and command execution.

### Interfaces

The CLI exposes these commands:

- `net-boost diagnose`
- `net-boost benchmark --label before`
- `net-boost benchmark --label after --compare <before-run-id>`
- `net-boost recommend --from <diagnostic-run-id>`
- `net-boost apply --plan <plan-id> --dry-run`
- `net-boost apply --plan <plan-id> --confirm <action-id>`

The MCP server exposes equivalent tools:

- `run_diagnostics`
- `run_benchmark`
- `compare_benchmarks`
- `generate_recommendations`
- `preview_fix`
- `apply_fix`

The Codex plugin wrapper exposes skills and commands that call the CLI, keeping all business logic in the core.

## Data Flow

1. User starts a diagnostic or benchmark from Codex, Claude/MCP, or the CLI.
2. The wrapper calls the core workflow.
3. Checks collect evidence using platform adapters.
4. Results are stored as timestamped local artifacts.
5. Reports are rendered as JSON and Markdown.
6. Recommendations are generated from stored diagnostic evidence.
7. Apply mode references a recommendation plan and executes only explicitly approved action IDs.
8. Optional after-benchmark compares post-change results against the baseline.

## Safety And Permissions

Safety is a core requirement:

- Read-only is the default.
- All apply operations require explicit user approval.
- Dry-run output must show exactly what will be changed.
- Elevated/admin operations must be marked before execution.
- Actions must be idempotent where practical.
- The tool must avoid hidden background modification.
- Reports must distinguish measured evidence from inferred recommendations.
- Sensitive local data such as SSIDs, process names, hostnames, and IPs should be redacted in exported reports unless the user disables redaction.

## Error Handling

Checks should degrade gracefully:

- Missing tools produce `unknown` results with installation or permission guidance.
- Network timeouts produce partial reports instead of aborting the whole run.
- Platform-specific failures include the command, exit code, and safe summary, without dumping secrets.
- Apply failures stop the current action, preserve the change log, and continue only when later actions are independent.

## Packaging And Marketplace Readiness

### Codex Plugin

The Codex package includes:

- `.codex-plugin/plugin.json`
- Skills that describe diagnostic, benchmark, and safe apply workflows.
- A command or tool entry point that invokes the local CLI.
- Marketplace metadata: name, description, permissions, supported platforms, and safety notes.

### Claude/MCP

The Claude-compatible package includes:

- A local stdio MCP server for Claude Code and desktop-style usage.
- A documented path to expose the same server over HTTP/SSE for hosted connector environments.
- Tool schemas that clearly mark read-only tools versus apply tools.

## Testing Strategy

Testing should match risk:

- Unit tests for check result normalization, recommendation rules, report rendering, and benchmark comparison.
- Fake platform adapters for deterministic tests without changing the host network.
- Contract tests for CLI output and MCP tool schemas.
- Apply-mode tests that verify dry-run behavior and action gating.
- Snapshot tests for Markdown reports.
- Manual smoke tests on Windows for diagnostics that rely on OS commands.

No test should require changing the developer machine's network state unless it is clearly marked as an opt-in manual test.

## First Milestone

The first implementation milestone should produce:

- A working CLI with mocked or conservative real diagnostics.
- JSON and Markdown report output.
- Benchmark run storage and comparison.
- MCP server exposing read-only diagnostic and benchmark tools.
- Codex plugin scaffold that documents how to run the same workflows.
- A dry-run-only apply pipeline with sample actions.

Real destructive changes can be added only after the dry-run pipeline, tests, and confirmation model are working.

## Non-Goals For Version 1

- Router administration.
- VPN rewriting.
- Driver updates.
- Hidden automatic optimization.
- Global DNS changes without a stronger platform-specific design.
- Guaranteed speed improvement claims.

## Open Decisions

The design intentionally fixes these choices for the first version:

- Windows-first support.
- Read-only default behavior.
- Benchmarking included as a required feature.
- Dual wrapper approach with a shared CLI core.
- Apply mode exists, but first milestone keeps real changes behind dry-run and explicit action confirmation.

