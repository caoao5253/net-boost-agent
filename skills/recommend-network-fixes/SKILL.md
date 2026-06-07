---
name: recommend-network-fixes
description: Generate safe network optimization recommendations from Net Boost Agent diagnostics.
---

# Recommend Network Fixes

Use this skill after diagnostics and goal-aware assessment have produced JSON reports.

Run:

```bash
net-boost recommend --from .net-boost-runs/diagnostic.json --json
```

Rank actions by impact, confidence, risk, and evidence level. Treat all recommendations as a plan, not as applied changes. Prefer high-impact, high-confidence, low-risk actions first.
