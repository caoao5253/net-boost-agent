# Net Boost Agent

**Language / 语言**

- [中文文档](README.zh-CN.md)
- [English README](README.en.md)

Net Boost Agent is a network diagnostics, benchmarking, and safe optimization agent for Codex and Claude MCP.

Net Boost Agent 是一个面向 Codex 和 Claude MCP 的网络诊断、基准测试与安全优化 Agent。

## What It Is

Net Boost Agent helps users understand slow internet with evidence. It checks network health, runs before/after benchmarks, ranks likely causes, previews safe fixes, records audit entries, and generates a readable report with an SVG comparison chart.

它的定位是“网络优化 Agent”，不是网页 UI，也不是承诺一定提速的黑盒加速器。它的价值是把诊断、证据、建议、确认执行、复测和报告串成一个完整闭环。

## Agent Capabilities

- Dependency check for Node.js, ping, and optional Ookla Speedtest CLI.
- Speedtest recovery flow: if Speedtest is missing, diagnostics continue and download/upload are marked unavailable.
- Direct `speedtest.exe` path support for users who downloaded the official Ookla CLI package.
- DNS, packet loss, MTU, Wi-Fi, Windows network profile, bandwidth process, and mDNS checks.
- Before/after benchmark runs with multi-round median aggregation.
- Top issue assessment by impact, confidence, scenario, and risk.
- Safe fix preview, explicit confirmation before apply, and local audit logging.
- Human-readable optimization report.
- SVG before/after comparison chart.
- Codex plugin metadata, Agent skills, MCP tools, and CLI entry points.

## Closed Loop / 完整闭环

```text
User asks the Agent to optimize the network
-> check dependencies
-> run before benchmark when Speedtest is available
-> continue basic diagnostics when Speedtest is missing
-> diagnose DNS, loss, latency, Wi-Fi, MTU, config, background usage, mDNS
-> rank Top issues and safe actions
-> preview fixes
-> apply only after explicit confirmation
-> write audit log
-> run after benchmark
-> generate report and comparison chart
-> explain improved / unchanged / inconclusive
```

If Speedtest CLI is missing, Net Boost Agent does not stop. It shows the official download page, continues basic diagnostics, and waits for the user to provide the downloaded `speedtest.exe` path.

Official Speedtest CLI download: <https://www.speedtest.net/apps/cli>

## Quick Start

Use the Agent directly:

```text
@net-boost-agent help me optimize my network
@net-boost-agent 帮我优化网络
```

Codex and Claude MCP users should normally trigger the Agent with natural language. CLI commands are provided for automation and testing.

## Install

See [docs/INSTALL.md](docs/INSTALL.md) for GitHub clone, Codex, Claude MCP, Windows Speedtest CLI, and troubleshooting steps.

## Install Into Codex

For local Codex use before a public marketplace listing is approved, use the one-command installer after cloning:

```powershell
git clone https://github.com/caoao5253/net-boost-agent.git
cd net-boost-agent
powershell -ExecutionPolicy Bypass -File .\scripts\install-codex.ps1
```

The installer handles the boring parts:

- clones or reuses `%USERPROFILE%\plugins\net-boost-agent`
- creates or updates `%USERPROFILE%\.agents\plugins\marketplace.json`
- keeps an existing personal marketplace instead of overwriting it
- runs `codex plugin add net-boost-agent@net-boost-agent-local` for a new local marketplace

After installation, start a new Codex thread so Codex loads the plugin manifest, skills, and MCP tools. Test it with:

```text
@net-boost-agent help me optimize my network
```

## CLI Automation

```bash
net-boost doctor --json
net-boost doctor --speedtest-path "C:\path\to\speedtest.exe" --json
net-boost benchmark --label before --rounds 3 --json
net-boost benchmark --label before --speedtest-path "C:\path\to\speedtest.exe" --rounds 3 --json
net-boost benchmark --label after --rounds 3 --compare before --json
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
net-boost chart --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```

## What It Does Not Do

- It is not a web UI.
- It does not bundle Ookla Speedtest CLI.
- It does not promise faster internet.
- It does not silently modify system settings.
- It does not replace router, ISP, modem, or broadband plan troubleshooting.
- It does not apply risky actions without preview and explicit confirmation.

## Release Status

This repository includes Codex plugin manifest and skills, a Claude-compatible MCP server, CLI entry points, assets, privacy policy, terms, human report generation, SVG chart generation, and tests for missing Speedtest recovery and direct executable path continuation.

This package does not bundle Ookla Speedtest CLI. Users should download it from the official page: <https://www.speedtest.net/apps/cli>.

## Development Check

```bash
npm test
```
