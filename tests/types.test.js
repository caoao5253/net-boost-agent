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
