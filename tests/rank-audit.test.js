import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { applyFix, previewFix } from '../src/core/apply.js';
import { appendAuditEntry, readAuditLog } from '../src/core/audit.js';
import { rankActions } from '../src/core/rank.js';

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
    await applyFix(plan, 'safe', {
      confirmed: true,
      auditPath,
      executor: async () => ({ exitCode: 0 }),
    });
    const entries = await readAuditLog({ auditPath });

    assert.equal(entries.length, 3);
    assert.equal(entries[1].dryRun, true);
    assert.equal(entries[2].confirmed, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
