import { makeRunId } from './types.js';
import { normalizeGoal } from './goals.js';

const STATUS_CONFIDENCE = {
  critical: 'high',
  warning: 'high',
  ok: 'medium',
  unknown: 'low',
};

function hasMeasuredEvidence(check) {
  return Object.values(check.evidence ?? {}).some(value => value !== null && value !== undefined && value !== '');
}

function evidenceLevel(check) {
  if (hasMeasuredEvidence(check)) return 'measured';
  if (check.status === 'unknown') return 'unavailable';
  return 'inferred';
}

function impactFor(checkId, goal, status) {
  if (status === 'ok') return 'low';
  const highByGoal = {
    gaming: new Set(['packet-loss', 'wifi']),
    video_call: new Set(['packet-loss', 'wifi', 'dns']),
    download: new Set(['speedtest', 'bandwidth-processes']),
    general: new Set(['dns', 'packet-loss']),
  };
  if (highByGoal[goal]?.has(checkId)) return 'high';
  if (['dns', 'packet-loss', 'wifi', 'network-profiles', 'bandwidth-processes'].includes(checkId)) return 'medium';
  return 'low';
}

function riskFor(checkId) {
  if (['network-profiles', 'bandwidth-processes', 'mdns'].includes(checkId)) return 'medium';
  return 'low';
}

function issueIdFor(check) {
  const mapping = {
    dns: 'dns-latency',
    speedtest: 'speedtest-unavailable',
    wifi: 'wifi-quality',
    mtu: 'mtu-fragmentation-risk',
    'packet-loss': 'packet-loss',
    'network-profiles': 'stale-network-profiles',
    'bandwidth-processes': 'bandwidth-contention',
    mdns: 'mdns-status',
  };
  return mapping[check.id] ?? check.id;
}

const IMPACT_SCORE = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_SCORE = { high: 0, medium: 1, low: 2 };

export function assessNetwork({ diagnostic, goal } = {}) {
  const selectedGoal = normalizeGoal(goal);
  const issues = (diagnostic?.checks ?? [])
    .filter(check => check.status !== 'ok')
    .map(check => {
      const impact = impactFor(check.id, selectedGoal, check.status);
      const confidence = STATUS_CONFIDENCE[check.status] ?? 'low';
      return {
        issueId: issueIdFor(check),
        sourceCheckIds: [check.id],
        goal: selectedGoal,
        impact,
        confidence,
        risk: riskFor(check.id),
        evidenceLevel: evidenceLevel(check),
        summary: check.summary,
      };
    })
    .sort((left, right) => {
      const impactDelta = IMPACT_SCORE[left.impact] - IMPACT_SCORE[right.impact];
      if (impactDelta !== 0) return impactDelta;
      return CONFIDENCE_SCORE[left.confidence] - CONFIDENCE_SCORE[right.confidence];
    });

  return {
    id: makeRunId('assessment'),
    kind: 'assessment',
    diagnosticRunId: diagnostic?.id ?? null,
    goal: selectedGoal,
    createdAt: new Date().toISOString(),
    issues,
  };
}
