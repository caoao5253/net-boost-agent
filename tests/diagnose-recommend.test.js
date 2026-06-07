import assert from 'node:assert/strict';
import test from 'node:test';
import { runDiagnostics } from '../src/core/diagnose.js';
import { generateRecommendations } from '../src/core/recommend.js';

test('diagnostics run injected checks and recommendations rank warnings', async () => {
  const diagnostic = await runDiagnostics({
    checks: [
      async () => ({
        id: 'dns',
        title: 'DNS',
        status: 'warning',
        summary: 'DNS slow',
        evidence: { averageMs: 140 },
        remediation: [{ id: 'change-dns', description: 'Try faster DNS', risk: 'medium' }],
      }),
      async () => ({
        id: 'packet-loss',
        title: 'Packet loss',
        status: 'ok',
        summary: 'No packet loss',
        evidence: {},
        remediation: [],
      }),
    ],
  });
  const plan = generateRecommendations(diagnostic);

  assert.equal(diagnostic.checks.length, 2);
  assert.equal(plan.actions[0].sourceCheckId, 'dns');
  assert.equal(plan.actions[0].requiresConfirmation, true);
});
