---
name: apply-network-fix
description: Preview and explicitly apply approved Net Boost Agent network fixes.
---

# Apply Network Fix

Use this skill only after the user selects a specific action ID from a recommendation plan.

Always preview first:

```bash
net-boost apply --plan .net-boost-runs/plan.json --action action-id --dry-run --audit-path .net-boost-runs/audit.jsonl
```

Only apply after explicit user confirmation:

```bash
net-boost apply --plan .net-boost-runs/plan.json --action action-id --confirm --audit-path .net-boost-runs/audit.jsonl
```

Never apply multiple actions implicitly. Report the audit log entry, what changed, and suggest an after benchmark.
