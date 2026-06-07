# Net Boost Agent

**Language / 语言**

- [中文文档](README.zh-CN.md)
- [English README](README.en.md)

---

Net Boost Agent is a network diagnostics, benchmarking, and safe optimization agent for Codex and Claude MCP.

Net Boost Agent 是一个面向 Codex 和 Claude MCP 的网络诊断、基准测试与安全优化 Agent。

## Quick Start

Use the Agent directly:

```text
@net-boost-agent help me optimize my network
@net-boost-agent 帮我优化网络
```

If Speedtest CLI is missing, Net Boost Agent still runs basic diagnostics and marks download/upload as unavailable. After the user downloads Speedtest CLI, they can send the `speedtest.exe` path and the Agent resumes benchmarking.

## Install

See [docs/INSTALL.md](docs/INSTALL.md) for GitHub clone, Codex, Claude MCP, Windows Speedtest CLI, and troubleshooting steps.

## Automation Entry

```bash
net-boost doctor --json
net-boost doctor --speedtest-path "C:\path\to\speedtest.exe" --json
net-boost benchmark --label before --rounds 3 --json
net-boost benchmark --label before --speedtest-path "C:\path\to\speedtest.exe" --rounds 3 --json
net-boost benchmark --label after --rounds 3 --compare before --json
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
net-boost chart --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```

## Release Status

This repository includes:

- Codex plugin manifest and skills
- Claude-compatible MCP server
- CLI entry points
- Human report and SVG comparison chart generation
- Privacy policy and terms documents
- Test coverage for missing Speedtest recovery and direct executable path continuation

This package does not bundle Ookla Speedtest CLI. Users should download it from the official page: <https://www.speedtest.net/apps/cli>.

## Development Check

```bash
npm test
```
