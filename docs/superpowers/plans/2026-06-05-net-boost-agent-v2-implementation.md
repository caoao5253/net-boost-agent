# Net Boost Agent v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement v2's goal-aware network assessment, ranked recommendations, audit logging, updated MCP tools, and workflow-oriented Agent skills.

**Architecture:** Keep the existing dependency-free Node.js ESM structure. Add focused core modules for goals, assessment, ranking, and audit logging, then wire them into CLI, MCP, skills, README, and tests without changing the v1 read-only default.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `fs`, JSON-RPC over stdio for MCP.

---

## File Structure

- Create `src/core/goals.js`: normalizes `general`, `gaming`, `video_call`, and `download` goals.
- Create `src/core/assess.js`: converts diagnostics into goal-aware issue assessments.
- Create `src/core/rank.js`: ranks actions using impact, confidence, and risk.
- Create `src/core/audit.js`: appends and reads preview/apply audit entries.
- Modify `src/core/recommend.js`: include impact, confidence, risk, and evidence fields.
- Modify `src/core/apply.js`: optionally write audit entries from preview/apply.
- Modify `src/cli.js`: add `assess`, goal flags, and audit reading.
- Modify `src/mcp/server.js`: add `assess_network`, `rank_fixes`, and `read_audit_log`.
- Modify `skills/*/SKILL.md`: make skills v2 workflow-oriented.
- Modify `README.md`: document v2 positioning and commands.
- Modify `CHANGELOG.md`: mark 0.2.0 implemented.
- Add tests: `tests/goals-assess.test.js`, `tests/rank-audit.test.js`, update `tests/mcp.test.js`, `tests/cli.test.js`, `tests/plugin.test.js`.

## Task 1: Goals And Assessment

**Files:**
- Create: `src/core/goals.js`
- Create: `src/core/assess.js`
- Test: `tests/goals-assess.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGoal } from '../src/core/goals.js';
import { assessNetwork } from '../src/core/assess.js';

test('normalizes network goals and assesses diagnostic evidence for gaming', () => {
  assert.equal(normalizeGoal('video-call'), 'video_call');
  assert.equal(normalizeGoal(undefined), 'general');

  const assessment = assessNetwork({
    diagnostic: {
      id: 'diag-1',
      checks: [
        { id: 'dns', status: 'warning', evidence: { averageMs: 180 }, summary: 'DNS slow' },
        { id: 'packet-loss', status: 'warning', evidence: { packetLossPercent: 2 }, summary: 'Loss detected' },
      ],
    },
    goal: 'gaming',
  });

  assert.equal(assessment.goal, 'gaming');
  assert.equal(assessment.issues[0].issueId, 'packet-loss');
  assert.equal(assessment.issues[0].impact, 'high');
  assert.equal(assessment.issues[0].evidenceLevel, 'measured');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/goals-assess.test.js`
Expected: FAIL because `src/core/goals.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement goal normalization and deterministic assessments for DNS latency, packet loss, Wi-Fi signal, speedtest availability, stale profiles, bandwidth processes, mDNS, and unknown checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/goals-assess.test.js`
Expected: PASS.

## Task 2: Ranking And Audit Log

**Files:**
- Create: `src/core/rank.js`
- Create: `src/core/audit.js`
- Modify: `src/core/apply.js`
- Test: `tests/rank-audit.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { appendAuditEntry, readAuditLog } from '../src/core/audit.js';
import { rankActions } from '../src/core/rank.js';
import { applyFix, previewFix } from '../src/core/apply.js';

test('ranks actions and records preview/apply audit entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-audit-'));
  try {
    const auditPath = join(dir, 'audit.jsonl');
    const ranked = rankActions([
      { id: 'risky', impact: 'high', confidence: 'low', risk: 'high' },
      { id: 'safe', impact: 'high', confidence: 'high', risk: 'low' },
    ]);
    assert.equal(ranked[0].id, 'safe');

    await appendAuditEntry({ auditPath, entry: { actionId: 'manual', mode: 'preview' } });
    const plan = { id: 'plan-1', actions: [{ id: 'safe', description: 'Safe fix', risk: 'low' }] };
    await previewFix(plan, 'safe', { auditPath });
    await applyFix(plan, 'safe', { confirmed: true, auditPath, executor: async () => ({ exitCode: 0 }) });
    const entries = await readAuditLog({ auditPath });

    assert.equal(entries.length, 3);
    assert.equal(entries[1].dryRun, true);
    assert.equal(entries[2].confirmed, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rank-audit.test.js`
Expected: FAIL because `src/core/audit.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement score-based action ranking and JSONL audit append/read. Extend `previewFix` and `applyFix` with optional `auditPath`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rank-audit.test.js`
Expected: PASS.

## Task 3: Recommendation Metadata And CLI

**Files:**
- Modify: `src/core/recommend.js`
- Modify: `src/cli.js`
- Test: `tests/cli.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('CLI can assess diagnostics for a selected goal', async () => {
  const output = [];
  const diagnostic = { id: 'diag-1', checks: [{ id: 'packet-loss', status: 'warning', evidence: { packetLossPercent: 2 }, summary: 'Loss' }] };
  const readFile = async () => JSON.stringify(diagnostic);
  const code = await runCli(['assess', '--from', 'diag.json', '--goal', 'gaming', '--json'], {
    stdout: text => output.push(text),
    readFile,
  });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'assessment');
  assert.equal(parsed.goal, 'gaming');
  assert.equal(parsed.issues[0].impact, 'high');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cli.test.js`
Expected: FAIL because `assess` command is unknown.

- [ ] **Step 3: Write minimal implementation**

Add `assess --from <diagnostic-json> --goal <goal> [--json]`, `audit --json`, and use injected `readFile` in tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cli.test.js`
Expected: PASS.

## Task 4: MCP v2 Tools

**Files:**
- Modify: `src/mcp/server.js`
- Test: `tests/mcp.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('MCP server lists v2 assessment and audit tools', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  assert.ok(names.includes('assess_network'));
  assert.ok(names.includes('rank_fixes'));
  assert.ok(names.includes('read_audit_log'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/mcp.test.js`
Expected: FAIL because v2 tools are not listed.

- [ ] **Step 3: Write minimal implementation**

Add tool schemas and `callTool` handlers for `assess_network`, `rank_fixes`, and `read_audit_log`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/mcp.test.js`
Expected: PASS.

## Task 5: Skills And Docs

**Files:**
- Modify: `skills/diagnose-network/SKILL.md`
- Modify: `skills/benchmark-network/SKILL.md`
- Modify: `skills/recommend-network-fixes/SKILL.md`
- Modify: `skills/apply-network-fix/SKILL.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Test: `tests/plugin.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('v2 skills describe goal-aware workflow and audit safety', async () => {
  const diagnose = await readFile(new URL('../skills/diagnose-network/SKILL.md', import.meta.url), 'utf8');
  const apply = await readFile(new URL('../skills/apply-network-fix/SKILL.md', import.meta.url), 'utf8');
  const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

  assert.match(diagnose, /goal/i);
  assert.match(diagnose, /evidence/i);
  assert.match(apply, /audit/i);
  assert.match(changelog, /0\.2\.0 - Implemented/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/plugin.test.js`
Expected: FAIL because skills and changelog still use planned v2 language.

- [ ] **Step 3: Write minimal implementation**

Update skill and README language to describe v2 workflow. Change changelog heading from planned to implemented after code is done.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/plugin.test.js`
Expected: PASS.

## Task 6: Full Verification

**Files:**
- No code files.

- [ ] **Step 1: Run full tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Run CLI smoke checks**

Run: `node bin/net-boost.js help`
Expected: command list includes `assess` and `audit`.

Run: `node bin/net-boost.js diagnose --json`
Expected: JSON diagnostic output.

Run: `node --input-type=module -e "import { createMcpServer } from './src/mcp/server.js'; const r = await createMcpServer().handle({jsonrpc:'2.0', id:1, method:'tools/list', params:{}}); console.log(r.result.tools.map(t => t.name).join(','));"`
Expected: output includes `assess_network`, `rank_fixes`, and `read_audit_log`.

## Self-Review

- Spec coverage: goals, evidence levels, assessment, ranking, audit log, MCP tools, skills, README, changelog, and safety gates are mapped to tasks.
- Placeholder scan: this plan contains no unresolved placeholders.
- Type consistency: v2 names are fixed as `normalizeGoal`, `assessNetwork`, `rankActions`, `appendAuditEntry`, `readAuditLog`, `assess_network`, `rank_fixes`, and `read_audit_log`.

