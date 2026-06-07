import assert from 'node:assert/strict';
import test from 'node:test';
import { assessNetwork } from '../src/core/assess.js';
import { normalizeGoal } from '../src/core/goals.js';

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
