# Net Boost Agent

[中文](README.zh-CN.md) | [Back to Home](README.md)

Net Boost Agent is a network optimization agent for Codex and Claude MCP. It helps users diagnose slow internet, collect before/after evidence, apply only confirmed low-risk actions, and generate a human-readable report.

## What It Answers

- How is my network right now?
- What are my download, upload, latency, jitter, packet loss, DNS, Wi-Fi, and configuration signals?
- What are the Top 3 issues?
- Did the network improve after optimization?
- What actions were taken, and were they safe?
- What should I do next?

## Codex Usage

Trigger the Agent with natural language:

```text
@net-boost-agent help me optimize my network
@net-boost-agent run a before benchmark
@net-boost-agent generate a before/after report chart
```

Net Boost Agent chooses the workflow from the request. Regular users do not need to run internal scripts.

## Claude MCP Usage

Use the MCP server from this repository:

```json
{
  "mcpServers": {
    "net-boost-agent": {
      "command": "node",
      "args": ["G:/project/ai-tools/net-boost-agent/bin/net-boost-mcp.js"]
    }
  }
}
```

When installing elsewhere, replace the path with the absolute path to `bin/net-boost-mcp.js` in your clone.

## Speedtest CLI Recovery Flow

Net Boost Agent does not bundle Ookla Speedtest CLI. If Speedtest is missing:

```text
Net Boost Agent detects Speedtest is unavailable
-> Net Boost Agent continues basic diagnostics
-> download/upload are marked unavailable
-> Net Boost Agent shows https://www.speedtest.net/apps/cli
-> user sends the downloaded speedtest executable path
-> Net Boost Agent resumes before/after benchmark
```

Windows downloads may only contain `speedtest.exe`. That is fine:

```bash
net-boost doctor --speedtest-path "C:\Users\You\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe" --json
net-boost benchmark --label before --speedtest-path "C:\Users\You\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe" --rounds 3 --json
```

Agent-facing environments can also set:

```text
NET_BOOST_SPEEDTEST_PATH=C:\Users\You\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe
```

## CLI Automation

```bash
net-boost doctor --json
net-boost benchmark --label before --rounds 3 --json
net-boost benchmark --label after --rounds 3 --compare before --json
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
net-boost chart --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```

The `chart` command outputs an SVG report chart. It distinguishes measured metrics, missing metrics, and values that cannot be compared because before data was unavailable.

## Safety Boundaries

- Read-only by default.
- Diagnostics and benchmarks do not modify the system.
- Recommendations are not automatically applied.
- Any apply action requires preview and explicit confirmation.
- Net Boost Agent does not guarantee faster internet; it reports improvement only from evidence.

## Install

See [docs/INSTALL.md](docs/INSTALL.md) for clone, Codex, Claude MCP, Windows Speedtest CLI, and troubleshooting steps.

## Marketplace Readiness

The repository includes `.codex-plugin/plugin.json`, skills, `.mcp.json`, assets, privacy policy, terms, and release-oriented tests. Public links point to <https://github.com/caoao5253/net-boost-agent>.
