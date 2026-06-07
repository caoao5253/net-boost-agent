---
name: benchmark-network
description: Capture before and after network benchmark measurements with Net Boost Agent.
---

# Benchmark Network

Use this skill when the user asks for speed baselines, before/after comparisons, or proof that an optimization helped.

Before benchmarking, check whether optional benchmark providers are available:

```bash
net-boost doctor --json
```

Run a baseline:

```bash
net-boost benchmark --label before --json
```

Run a later benchmark with `--label after`. Preserve the JSON artifact paths so results can be compared.

Do not claim improvement unless a before benchmark and after benchmark were compared. If Ookla Speedtest CLI is not downloaded or speed-test metrics are unavailable, say which metrics were inconclusive and include the install hint plus download URL from `doctor`.

After before/after benchmarks are available, generate a human report:

```bash
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```
