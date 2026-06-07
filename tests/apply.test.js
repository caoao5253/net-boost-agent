import assert from 'node:assert/strict';
import test from 'node:test';
import { applyFix, previewFix } from '../src/core/apply.js';

test('apply requires explicit confirmation and supports dry-run preview', async () => {
  const plan = {
    id: 'plan-1',
    actions: [{ id: 'stop-process', description: 'Stop downloader', command: 'Stop-Process', risk: 'medium' }],
  };
  const preview = await previewFix(plan, 'stop-process');

  assert.equal(preview.dryRun, true);
  await assert.rejects(() => applyFix(plan, 'stop-process', { confirmed: false }), /requires explicit confirmation/);

  const applied = await applyFix(plan, 'stop-process', {
    confirmed: true,
    executor: async action => ({ exitCode: 0, actionId: action.id }),
  });
  assert.equal(applied.status, 'applied');
});
