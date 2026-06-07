import { makeRunId } from './types.js';
import { rankActions } from './rank.js';

const RANK = { critical: 0, warning: 1, unknown: 2, ok: 3 };

export function generateRecommendations(diagnostic) {
  const actions = [];
  for (const check of diagnostic.checks ?? []) {
    if (check.status === 'ok') continue;
    for (const remediation of check.remediation ?? []) {
      actions.push({
        id: remediation.id,
        sourceCheckId: check.id,
        description: remediation.description,
        risk: remediation.risk ?? 'low',
        impact: remediation.impact ?? (check.status === 'critical' ? 'high' : 'medium'),
        confidence: remediation.confidence ?? (check.status === 'unknown' ? 'low' : 'medium'),
        evidenceLevel: Object.keys(check.evidence ?? {}).length > 0 ? 'measured' : 'unavailable',
        expectedBenefit: remediation.expectedBenefit ?? 'May improve network stability or speed.',
        requiresConfirmation: true,
        command: remediation.command ?? null,
        status: check.status,
      });
    }
  }

  actions.sort((left, right) => (RANK[left.status] ?? 9) - (RANK[right.status] ?? 9));
  return {
    id: makeRunId('plan'),
    kind: 'recommendation-plan',
    diagnosticRunId: diagnostic.id,
    createdAt: new Date().toISOString(),
    actions: rankActions(actions),
  };
}
