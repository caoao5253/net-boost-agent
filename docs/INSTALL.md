# Install Net Boost Agent

This guide covers a Clean Windows setup first, with notes for Codex and Claude MCP.

## Requirements

- Node.js 20 or newer
- Git
- Optional: Ookla Speedtest CLI from <https://www.speedtest.net/apps/cli>

Net Boost Agent can run basic diagnostics without Speedtest CLI. Download/upload benchmarks require either `speedtest` on `PATH` or a direct executable path.

## Clone From GitHub

```bash
git clone https://github.com/caoao5253/net-boost-agent.git
cd net-boost-agent
npm test
```

## Windows Speedtest CLI

1. Open <https://www.speedtest.net/apps/cli>.
2. Download the Windows build.
3. Extract it to a stable folder, for example:

```text
C:\Tools\speedtest\speedtest.exe
```

4. Either add `C:\Tools\speedtest` to `PATH`, or pass the executable path directly:

```bash
net-boost doctor --speedtest-path "C:\Tools\speedtest\speedtest.exe" --json
net-boost benchmark --label before --speedtest-path "C:\Tools\speedtest\speedtest.exe" --rounds 3 --json
```

## Codex

Use the Agent through its plugin entry:

```text
@net-boost-agent help me optimize my network
```

If Speedtest is missing, Net Boost Agent continues basic diagnostics and asks for the downloaded executable path.

## Claude MCP

Add the MCP server using an absolute path to your clone:

```json
{
  "mcpServers": {
    "net-boost-agent": {
      "command": "node",
      "args": ["C:/path/to/net-boost-agent/bin/net-boost-mcp.js"]
    }
  }
}
```

Then ask Claude to use Net Boost Agent for diagnostics, benchmark, recommendations, and reports.

## Basic Verification

No Speedtest path:

```bash
net-boost doctor --json
net-boost diagnose --json
```

With Speedtest path:

```bash
net-boost doctor --speedtest-path "C:\Tools\speedtest\speedtest.exe" --json
net-boost benchmark --label before --speedtest-path "C:\Tools\speedtest\speedtest.exe" --rounds 3 --json
```

Report and SVG chart:

```bash
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
net-boost chart --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```

## Troubleshooting

- If download/upload are unavailable, provide `--speedtest-path` or add Speedtest CLI to `PATH`.
- If Speedtest takes longer than expected, keep the terminal open. The Agent allows longer benchmark runs.
- If Wi-Fi is slow but signal is strong, check whether the PC is connected to 2.4 GHz instead of 5 GHz.
- If before data is unavailable, the report marks that metric as inconclusive instead of pretending improvement.
