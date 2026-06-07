import { compareBenchmarks } from './benchmark.js';

const METRICS = [
  { key: 'downloadMbps', label: 'Download', unit: 'Mbps', higherIsBetter: true },
  { key: 'uploadMbps', label: 'Upload', unit: 'Mbps', higherIsBetter: true },
  { key: 'latencyMs', label: 'Latency', unit: 'ms', higherIsBetter: false },
  { key: 'jitterMs', label: 'Jitter', unit: 'ms', higherIsBetter: false },
  { key: 'packetLossPercent', label: 'Packet Loss', unit: '%', higherIsBetter: false },
  { key: 'dnsAverageMs', label: 'DNS', unit: 'ms', higherIsBetter: false },
];

function formatValue(value, unit) {
  return typeof value === 'number' ? `${value} ${unit}` : 'Unavailable';
}

function formatDelta(metric, comparison) {
  if (comparison.delta === null) return 'Inconclusive';
  if (metric.higherIsBetter && comparison.before !== 0) {
    const percent = Math.round((comparison.delta / comparison.before) * 1000) / 10;
    return `${comparison.delta >= 0 ? '+' : ''}${percent}%`;
  }
  const sign = comparison.delta > 0 ? '+' : '';
  return `${sign}${comparison.delta} ${metric.unit}`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resultFromComparison(comparison) {
  const metricDirections = METRICS.map(metric => comparison[metric.key]?.direction).filter(Boolean);
  if (metricDirections.length === 0 || metricDirections.every(direction => direction === 'inconclusive')) return 'inconclusive';
  const improved = metricDirections.filter(direction => direction === 'improved').length;
  const regressed = metricDirections.filter(direction => direction === 'regressed').length;
  if (improved > 0 && regressed === 0) return 'improved';
  if (regressed > improved) return 'regressed';
  return 'mixed';
}

function issueRank(issue) {
  const impact = { high: 0, medium: 1, low: 2 };
  const confidence = { high: 0, medium: 1, low: 2 };
  return (impact[issue.impact] ?? 9) * 10 + (confidence[issue.confidence] ?? 9);
}

function missingTools(before, after) {
  return [...new Set([...(before.metrics?.missingTools ?? []), ...(after.metrics?.missingTools ?? [])])];
}

function nextSteps(result, missing) {
  if (missing.length > 0) {
    return [
      `Install missing tools: ${missing.join(', ')}.`,
      'Download Ookla Speedtest CLI: https://www.speedtest.net/apps/cli.',
      'Re-run before and after benchmarks after installation.',
    ];
  }
  if (result === 'improved') {
    return ['Keep the current settings.', 'Re-run benchmark later during peak hours to confirm stability.'];
  }
  if (result === 'regressed') {
    return ['Revert the last applied action if possible.', 'Review audit log and try the next low-risk recommendation.'];
  }
  if (result === 'mixed') {
    return ['Keep improvements that match your goal.', 'Investigate metrics that regressed before applying more changes.'];
  }
  return ['Collect complete benchmark data.', 'Run dependency checks and repeat the test.'];
}

export function generateHumanReport({
  before,
  after,
  assessment = { issues: [] },
  auditEntries = [],
  goal = 'general',
} = {}) {
  const comparison = compareBenchmarks(before, after);
  const result = resultFromComparison(comparison);
  const missing = missingTools(before, after);
  const topIssues = [...(assessment.issues ?? [])].sort((left, right) => issueRank(left) - issueRank(right)).slice(0, 3);
  const applied = auditEntries.filter(entry => entry.mode === 'apply' || entry.confirmed === true);
  const previews = auditEntries.filter(entry => entry.dryRun === true);

  const lines = [
    '# Network Optimization Report',
    '',
    '## Summary',
    '',
    `- Result: ${titleCase(result)}`,
    `- Goal: ${goal}`,
    `- Missing tools: ${missing.length > 0 ? missing.join(', ') : 'None'}`,
    '',
    '## Current Network',
    '',
    '| Metric | Before | After | Change | Result |',
    '|---|---:|---:|---:|---|',
  ];

  for (const metric of METRICS) {
    const item = comparison[metric.key] ?? { before: null, after: null, delta: null, direction: 'inconclusive' };
    lines.push(`| ${metric.label} | ${formatValue(item.before, metric.unit)} | ${formatValue(item.after, metric.unit)} | ${formatDelta(metric, item)} | ${titleCase(item.direction)} |`);
  }

  lines.push('', '## Top 3 Issues', '');
  if (topIssues.length === 0) {
    lines.push('- No ranked issues available.');
  } else {
    for (const issue of topIssues) {
      lines.push(`- ${issue.issueId}: ${issue.summary} Impact: ${issue.impact}. Confidence: ${issue.confidence}. Evidence: ${issue.evidenceLevel}.`);
    }
  }

  lines.push('', '## Before vs After', '');
  for (const metric of METRICS) {
    const item = comparison[metric.key] ?? { before: null, after: null, delta: null, direction: 'inconclusive' };
    lines.push(`- ${metric.label}: ${formatValue(item.before, metric.unit)} -> ${formatValue(item.after, metric.unit)} (${formatDelta(metric, item)}, ${item.direction})`);
  }

  lines.push('', '## What Changed', '');
  if (auditEntries.length === 0) {
    lines.push('- No audit entries were provided. The report cannot confirm which actions were previewed or applied.');
  } else {
    for (const entry of auditEntries) {
      const mode = entry.dryRun ? 'Previewed' : entry.confirmed ? 'Applied' : 'Recorded';
      lines.push(`- ${mode}: ${entry.actionDescription ?? entry.actionId}`);
    }
  }

  lines.push('', '## Safety', '');
  lines.push(`- Applied actions: ${applied.length}`);
  lines.push(`- Preview-only actions: ${previews.length}`);
  lines.push('- Apply actions require explicit confirmation.');
  lines.push('- Review audit log before making more changes.');
  lines.push('- Rollback depends on the specific action and should be documented in the action plan.');

  lines.push('', '## Next Steps', '');
  for (const step of nextSteps(result, missing)) {
    lines.push(`- ${step}`);
  }

  return {
    kind: 'human-report',
    summary: {
      result,
      goal,
      missingTools: missing,
      topIssueCount: topIssues.length,
      appliedActionCount: applied.length,
    },
    comparison,
    markdown: `${lines.join('\n')}\n`,
  };
}
