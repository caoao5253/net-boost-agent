---
name: diagnose-network
description: Run goal-aware, read-only network diagnostics with Net Boost Agent.
---

# Diagnose Network

Use this skill when the user asks why the internet is slow, requests network diagnosis, or wants evidence before optimization.

Ask for or infer the user's network goal: `general`, `gaming`, `video_call`, or `download`.

If the user is starting fresh, first check whether optional tools are downloaded:

```bash
net-boost doctor --json
```

Run:

```bash
net-boost diagnose --json
```

Then assess the diagnostic evidence for the selected goal:

```bash
net-boost assess --from .net-boost-runs/diagnostic.json --goal general --json
```

Summarize each check by status, evidence level, impact, confidence, risk, and recommendation. Do not modify network settings from this skill.
