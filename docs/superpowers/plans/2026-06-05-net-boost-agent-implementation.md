# Net Boost Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working `net-boost-agent` release with a tested CLI, benchmark/report engine, MCP server, and Codex plugin scaffold.

**Architecture:** Use a shared dependency-free Node.js ESM core so the CLI, MCP server, and Codex plugin wrapper call the same behavior. Diagnostics default to safe read-only checks, benchmark artifacts are stored locally, and apply mode is dry-run gated in the first milestone.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `child_process`, built-in `dns`, built-in `fs`, JSON-RPC over stdio for MCP.

---

## File Structure

- `package.json`: package metadata, executable mappings, and test scripts.
- `bin/net-boost.js`: CLI entry point.
- `bin/net-boost-mcp.js`: MCP stdio entry point.
- `src/core/types.js`: shared result constructors and status constants.
- `src/core/report.js`: JSON and Markdown report rendering.
- `src/core/benchmark.js`: benchmark run creation, storage, and comparison.
- `src/core/recommend.js`: recommendation generation from diagnostics.
- `src/core/apply.js`: dry-run and confirmation-gated apply workflow.
- `src/core/diagnose.js`: orchestration for diagnostic checks.
- `src/platform/common.js`: DNS, ping, MTU, speedtest, and command helpers.
- `src/platform/windows.js`: Windows-specific Wi-Fi, profile, process, and mDNS checks.
- `src/mcp/server.js`: minimal MCP JSON-RPC stdio server exposing read-only and gated tools.
- `.codex-plugin/plugin.json`: Codex plugin manifest.
- `skills/diagnose-network/SKILL.md`: Codex skill for diagnostics.
- `skills/benchmark-network/SKILL.md`: Codex skill for benchmark runs.
- `skills/recommend-network-fixes/SKILL.md`: Codex skill for recommendations.
- `skills/apply-network-fix/SKILL.md`: Codex skill for dry-run and confirmed apply.
- `tests/*.test.js`: Node test files for core behavior and MCP schema.

## Task 1: Project Metadata

**Files:**
- Create: `package.json`
- Create: `bin/net-boost.js`
- Create: `bin/net-boost-mcp.js`
- Test: `tests/package.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes CLI and MCP binaries', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.bin['net-boost'], './bin/net-boost.js');
  assert.equal(pkg.bin['net-boost-mcp'], './bin/net-boost-mcp.js');
  assert.match(pkg.scripts.test, /node --test/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/package.test.js`
Expected: FAIL because `package.json` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create package metadata and two executable stubs that import later modules.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/package.test.js`
Expected: PASS.

## Task 2: Core Result Contracts

**Files:**
- Create: `src/core/types.js`
- Test: `tests/types.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { makeCheckResult, STATUS } from '../src/core/types.js';

test('makeCheckResult creates a normalized diagnostic result', () => {
  const result = makeCheckResult({
    id: 'dns',
    title: 'DNS resolution',
    status: STATUS.warning,
    evidence: { averageMs: 125 },
    summary: 'DNS is slower than expected',
  });

  assert.equal(result.id, 'dns');
  assert.equal(result.status, 'warning');
  assert.equal(result.remediation.length, 0);
  assert.ok(result.createdAt);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/types.test.js`
Expected: FAIL because `src/core/types.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Export `STATUS` and `makeCheckResult` with defaults for evidence, remediation, and timestamps.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/types.test.js`
Expected: PASS.

## Task 3: Reports And Redaction

**Files:**
- Create: `src/core/report.js`
- Test: `tests/report.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderJsonReport, renderMarkdownReport } from '../src/core/report.js';

test('renders JSON and Markdown reports with redacted sensitive values', () => {
  const run = {
    id: 'diag-1',
    kind: 'diagnostic',
    createdAt: '2026-06-05T00:00:00.000Z',
    checks: [{ id: 'wifi', title: 'Wi-Fi', status: 'warning', summary: 'SSID HomeNet is weak', evidence: { ssid: 'HomeNet', ip: '192.168.1.8' }, remediation: [] }],
  };

  const json = renderJsonReport(run);
  const markdown = renderMarkdownReport(run);

  assert.equal(JSON.parse(json).checks[0].evidence.ssid, '[redacted]');
  assert.match(markdown, /# Net Boost Agent diagnostic Report/);
  assert.doesNotMatch(markdown, /HomeNet/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/report.test.js`
Expected: FAIL because `src/core/report.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement recursive redaction for `ssid`, `ip`, `hostname`, and `processName`, plus JSON and Markdown renderers.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/report.test.js`
Expected: PASS.

## Task 4: Benchmark Storage And Comparison

**Files:**
- Create: `src/core/benchmark.js`
- Test: `tests/benchmark.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { compareBenchmarks, runBenchmark } from '../src/core/benchmark.js';

test('stores benchmark runs and compares before and after values', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-'));
  try {
    const before = await runBenchmark({ label: 'before', outputDir: dir, metricsProvider: async () => ({ downloadMbps: 50, uploadMbps: 10, latencyMs: 40, jitterMs: 8, packetLossPercent: 2, dnsAverageMs: 80 }) });
    const after = await runBenchmark({ label: 'after', outputDir: dir, metricsProvider: async () => ({ downloadMbps: 75, uploadMbps: 12, latencyMs: 25, jitterMs: 4, packetLossPercent: 0, dnsAverageMs: 45 }) });
    const saved = JSON.parse(await readFile(before.paths.json, 'utf8'));
    const comparison = compareBenchmarks(before.run, after.run);

    assert.equal(saved.label, 'before');
    assert.equal(comparison.downloadMbps.direction, 'improved');
    assert.equal(comparison.latencyMs.direction, 'improved');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/benchmark.test.js`
Expected: FAIL because `src/core/benchmark.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `runBenchmark` to create JSON/Markdown artifacts and `compareBenchmarks` to classify higher-is-better and lower-is-better metrics.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/benchmark.test.js`
Expected: PASS.

## Task 5: Diagnostics And Recommendations

**Files:**
- Create: `src/core/diagnose.js`
- Create: `src/core/recommend.js`
- Test: `tests/diagnose-recommend.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { runDiagnostics } from '../src/core/diagnose.js';
import { generateRecommendations } from '../src/core/recommend.js';

test('diagnostics run injected checks and recommendations rank warnings', async () => {
  const diagnostic = await runDiagnostics({
    checks: [
      async () => ({ id: 'dns', title: 'DNS', status: 'warning', summary: 'DNS slow', evidence: { averageMs: 140 }, remediation: [{ id: 'change-dns', description: 'Try faster DNS', risk: 'medium' }] }),
      async () => ({ id: 'packet-loss', title: 'Packet loss', status: 'ok', summary: 'No packet loss', evidence: {}, remediation: [] }),
    ],
  });
  const plan = generateRecommendations(diagnostic);

  assert.equal(diagnostic.checks.length, 2);
  assert.equal(plan.actions[0].sourceCheckId, 'dns');
  assert.equal(plan.actions[0].requiresConfirmation, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/diagnose-recommend.test.js`
Expected: FAIL because diagnostic modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement diagnostic orchestration and recommendation flattening from check remediation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/diagnose-recommend.test.js`
Expected: PASS.

## Task 6: Dry-Run Apply Gate

**Files:**
- Create: `src/core/apply.js`
- Test: `tests/apply.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyFix, previewFix } from '../src/core/apply.js';

test('apply requires explicit confirmation and supports dry-run preview', async () => {
  const plan = { id: 'plan-1', actions: [{ id: 'stop-process', description: 'Stop downloader', command: 'Stop-Process', risk: 'medium' }] };
  const preview = previewFix(plan, 'stop-process');

  assert.equal(preview.dryRun, true);
  await assert.rejects(() => applyFix(plan, 'stop-process', { confirmed: false }), /requires explicit confirmation/);

  const applied = await applyFix(plan, 'stop-process', { confirmed: true, executor: async action => ({ exitCode: 0, actionId: action.id }) });
  assert.equal(applied.status, 'applied');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/apply.test.js`
Expected: FAIL because `src/core/apply.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement action lookup, preview output, and confirmation-gated executor invocation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/apply.test.js`
Expected: PASS.

## Task 7: Platform Checks

**Files:**
- Create: `src/platform/common.js`
- Create: `src/platform/windows.js`
- Test: `tests/platform.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDnsResolution, checkSpeedtestAvailability } from '../src/platform/common.js';
import { checkWindowsNetworkProfiles } from '../src/platform/windows.js';

test('platform checks degrade to unknown when commands or DNS fail', async () => {
  const dns = await checkDnsResolution({ resolver: async () => { throw new Error('timeout'); } });
  const speed = await checkSpeedtestAvailability({ commandRunner: async () => ({ exitCode: 1, stdout: '', stderr: 'missing' }) });
  const profiles = await checkWindowsNetworkProfiles({ commandRunner: async () => ({ exitCode: 0, stdout: 'Name : Old WiFi\\nState : Disconnected', stderr: '' }) });

  assert.equal(dns.status, 'unknown');
  assert.equal(speed.status, 'unknown');
  assert.equal(profiles.status, 'warning');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/platform.test.js`
Expected: FAIL because platform modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement safe command wrappers and conservative checks that return normalized results without changing system state.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/platform.test.js`
Expected: PASS.

## Task 8: CLI

**Files:**
- Modify: `bin/net-boost.js`
- Create: `src/cli.js`
- Test: `tests/cli.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { runCli } from '../src/cli.js';

test('CLI can run diagnostics and return JSON', async () => {
  const output = [];
  const code = await runCli(['diagnose', '--json'], { stdout: text => output.push(text), checks: [async () => ({ id: 'dns', title: 'DNS', status: 'ok', summary: 'DNS ok', evidence: {}, remediation: [] })] });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'diagnostic');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cli.test.js`
Expected: FAIL because `src/cli.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement commands `diagnose`, `benchmark`, `recommend`, `apply`, and `help` with JSON output support.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cli.test.js`
Expected: PASS.

## Task 9: MCP Server

**Files:**
- Create: `src/mcp/server.js`
- Modify: `bin/net-boost-mcp.js`
- Test: `tests/mcp.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMcpServer } from '../src/mcp/server.js';

test('MCP server lists diagnostic, benchmark, recommendation, preview, and apply tools', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  assert.deepEqual(names, ['run_diagnostics', 'run_benchmark', 'compare_benchmarks', 'generate_recommendations', 'preview_fix', 'apply_fix']);
  assert.equal(response.result.tools.find(tool => tool.name === 'apply_fix').annotations.destructiveHint, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/mcp.test.js`
Expected: FAIL because `src/mcp/server.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `tools/list`, `tools/call`, and stdio JSON-RPC message handling.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/mcp.test.js`
Expected: PASS.

## Task 10: Codex Plugin And Agent Skills

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `skills/diagnose-network/SKILL.md`
- Create: `skills/benchmark-network/SKILL.md`
- Create: `skills/recommend-network-fixes/SKILL.md`
- Create: `skills/apply-network-fix/SKILL.md`
- Test: `tests/plugin.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Codex plugin manifest and agent skills are present', async () => {
  const manifest = JSON.parse(await readFile(new URL('../.codex-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'net-boost-agent');
  assert.ok(manifest.description.includes('network'));

  for (const skill of ['diagnose-network', 'benchmark-network', 'recommend-network-fixes', 'apply-network-fix']) {
    const body = await readFile(new URL(`../skills/${skill}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(body, new RegExp(`name: ${skill}`));
    assert.doesNotMatch(body, /TODO|TBD|\\[TODO:/);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/plugin.test.js`
Expected: FAIL because plugin files do not exist.

- [ ] **Step 3: Write minimal implementation**

Create a valid manifest and four clear skill files that invoke the local CLI workflows.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/plugin.test.js`
Expected: PASS.

## Task 11: Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add usage documentation**

Document CLI commands, MCP usage, Codex skill names, safety model, benchmark flow, and apply-mode confirmation.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 3: Run CLI smoke checks**

Run: `node bin/net-boost.js diagnose --json`
Expected: JSON diagnostic output with `kind: "diagnostic"`.

Run: `node bin/net-boost.js benchmark --label before --json`
Expected: JSON benchmark output with artifact paths.

Run: `node bin/net-boost.js help`
Expected: command list containing `diagnose`, `benchmark`, `recommend`, and `apply`.

## Self-Review

- Spec coverage: diagnostics, benchmarking, recommendations, dry-run apply mode, MCP tools, Codex skills, safety, error handling, packaging, and tests are each mapped to tasks.
- Placeholder scan: this plan contains no TBD, TODO, or unresolved implementation placeholders.
- Type consistency: shared names are fixed as `diagnostic`, `benchmark`, `runDiagnostics`, `runBenchmark`, `generateRecommendations`, `previewFix`, `applyFix`, and MCP tool names listed in Task 9.

