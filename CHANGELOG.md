# Changelog

## 0.5.0 - Implemented

### Added

- Added marketplace-ready interface metadata for icon, logo, screenshots, privacy policy, terms of service, and default Agent prompts.
- Added local Codex marketplace index metadata under `.agents/plugins/marketplace.json`.
- Added legal documents for privacy and terms.
- Added marketplace readiness tests covering manifest metadata, asset references, install policy, and legal docs.
- Added direct Speedtest executable path support for users who downloaded `speedtest.exe` but did not add it to `PATH`.
- Added Agent flow state for the missing-Speedtest flow: continue basic diagnostics, mark download/upload unavailable, show official download link, and resume benchmark with `speedtestPath`.
- Added repeatable SVG comparison chart generation through the `chart` CLI command.
- Added `docs/INSTALL.md` for clean Windows, Codex, and Claude MCP setup.

### Changed

- Updated package and MCP server version to `0.5.0`.
- Reworked README into a clean bilingual Agent-first guide for marketplace users.
- Split README content into GitHub-style language files: `README.md`, `README.zh-CN.md`, and `README.en.md`.
- Clarified that the Agent can run partial diagnostics without Speedtest CLI and only marks download/upload benchmarks as inconclusive.
- Updated MCP `check_dependencies` and `run_benchmark` tools to accept `speedtestPath` for downloaded-but-not-installed CLI scenarios.
- Replaced placeholder public links with the GitHub repository and in-repository legal document URLs.

## 0.4.2 - Implemented

### Added

- Added `docs/AGENT.md` with the coding-agent specification, workflow state machine, tool contract, safety rules, and verification policy.

### Changed

- README now links to the full coding-agent design document.

## 0.4.1 - Implemented

### Changed

- Reframed user-facing docs around Agent triggers instead of internal script execution.
- Added `optimize-network` as the recommended high-level Agent skill.
- Replaced user-facing internal script examples with `@net-boost-agent` and installed `net-boost` CLI examples.

## 0.4.0 - Implemented

### Added

- Human Report layer for user-facing network optimization summaries.
- CLI `report --before <before-json> --after <after-json>` command.
- MCP `generate_human_report` tool.
- Report sections for current network, Top 3 issues, before/after comparison, changed actions, safety, and next steps.
- Inconclusive report handling with missing tool guidance.

## 0.3.1 - Implemented

### Changed

- Switched the primary benchmark provider from the Python `speedtest-cli` package to Ookla's official Speedtest CLI.
- Dependency download metadata now points to https://www.speedtest.net/apps/cli.
- Benchmark still supports `speedtest-cli` as a legacy fallback when the official `speedtest` command is unavailable.

## 0.3.0 - Implemented

### Added

- Real Ookla `speedtest --format=json` benchmark provider for download and upload metrics.
- Real ping-based latency, jitter, and packet loss collection.
- Multi-round benchmark support with median aggregation.
- Latest label pointer files such as `.net-boost-runs/latest-before.json`.
- CLI `benchmark --rounds <n>` option.
- CLI `benchmark --compare <label-or-json>` option for direct before/after comparison.
- Dependency metadata now includes download and documentation URLs for installable tools.

### Changed

- Default benchmark now attempts the real provider first and gracefully falls back to missing-provider metadata when unavailable.
- Benchmark runs now include per-round metrics under `rounds`.

## 0.2.1 - Implemented

### Added

- Dependency check flow for missing optional tools such as `speedtest-cli`.
- CLI `doctor --json` command for checking local runtime/tool availability.
- MCP `check_dependencies` tool.
- Benchmark missing-provider metadata with `providerStatus` and `missingTools`.

### Changed

- Benchmark documentation now explains the "not downloaded/not installed" scenario.
- Agent skills now recommend checking dependencies before benchmarking.

## 0.2.0 - Implemented

Net Boost Agent v2 reframes the project as a decision-oriented network assistant rather than a simple diagnostics wrapper.

### Added

- Goal-aware agent workflow for `general`, `gaming`, `video_call`, and `download` use cases.
- Evidence model with `measured`, `inferred`, and `unavailable` levels.
- `assess` stage between diagnostics and recommendations.
- Recommendation ranking based on impact, confidence, and risk.
- Local audit log for preview and apply decisions.
- MCP tools: `assess_network`, `rank_fixes`, and `read_audit_log`.
- Stronger benchmark policy requiring before/after evidence before improvement claims.

### Changed

- Agent positioning changed from "network diagnostics and optimization planning" to "network triage, evidence assessment, and safe optimization decision support."
- Codex skills will become workflow-oriented instead of command-only descriptions.
- Recommendations will explain whether action is justified, not only what can be changed.

### Safety

- v2 keeps read-only diagnostics as the default.
- Apply remains gated by dry-run preview and explicit user confirmation.
- High-risk system changes remain outside the default v2 scope.
- Reports continue to redact sensitive network identifiers by default.

## 0.1.0 - Initial

### Added

- Dependency-free Node.js CLI.
- Read-only diagnostics for speed-test availability, DNS, MTU readiness, packet loss, Wi-Fi signal, network profiles, bandwidth-heavy processes, and mDNS status.
- Benchmark JSON and Markdown artifact generation.
- Recommendation plan generation.
- Dry-run and confirmation-gated apply flow.
- Minimal Claude-compatible MCP stdio server.
- Codex plugin manifest and four agent skills.
- Node test suite covering core behavior, CLI, MCP, platform checks, and plugin files.
