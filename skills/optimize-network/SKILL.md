---
name: optimize-network
description: Orchestrate the full Net Boost Agent workflow from dependency check through before/after report.
---

# Optimize Network

Use this skill when the user asks Net Boost Agent to optimize, speed up, fix, diagnose, or improve their network.

The user can trigger this skill with natural language:

```text
帮我优化网络
```

or:

```text
@net-boost-agent help me optimize my network
```

## Agent Workflow

1. Net Boost Agent checks whether Speedtest CLI is available.
2. If Speedtest CLI is missing, Net Boost Agent does not stop:
   - It continues DNS, Wi-Fi, gateway latency, packet loss, network profile, bandwidth-process, and mDNS diagnostics.
   - It marks download/upload benchmark as temporarily unavailable.
   - It shows the official download page: `https://www.speedtest.net/apps/cli`.
   - It asks the user to send the downloaded `speedtest.exe` path after download.
3. If the user provides a Speedtest executable path, Net Boost Agent passes it as `speedtestPath` and resumes benchmark collection.
4. Net Boost Agent runs a before benchmark when benchmark capability is available.
5. Net Boost Agent assesses the selected goal with the diagnostic evidence.
6. Net Boost Agent generates and ranks recommendations.
7. Net Boost Agent previews one low-risk fix before applying anything.
8. Net Boost Agent asks for explicit confirmation before any apply action.
9. Net Boost Agent runs an after benchmark when benchmark capability is available.
10. Net Boost Agent generates the final user-facing report and comparison chart.

Never ask the user to run internal project scripts. Prefer Agent actions and natural-language progress updates.

## Missing Speedtest Recovery

When Speedtest is missing, Net Boost Agent should say:

- "I can still check DNS, Wi-Fi, gateway latency, packet loss, network profiles, and mDNS."
- "Download and upload speed will be unavailable until Speedtest CLI is connected."
- "Download Speedtest CLI from https://www.speedtest.net/apps/cli."
- "After download, send me the full `speedtest.exe` path and I will continue the benchmark."

This is part of Net Boost Agent's execution logic. It is not a separate manual workflow for the user.
