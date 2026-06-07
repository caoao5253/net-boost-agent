import assert from 'node:assert/strict';
import test from 'node:test';
import { generateHumanReport } from '../src/core/human-report.js';
import { generateComparisonChartSvg } from '../src/core/report-chart.js';

test('human report answers user-facing optimization questions with before and after comparison', () => {
  const before = {
    id: 'before-1',
    kind: 'benchmark',
    label: 'before',
    metrics: {
      downloadMbps: 80,
      uploadMbps: 20,
      latencyMs: 40,
      jitterMs: 10,
      packetLossPercent: 1,
      dnsAverageMs: 70,
      providerStatus: 'ok',
    },
  };
  const after = {
    id: 'after-1',
    kind: 'benchmark',
    label: 'after',
    metrics: {
      downloadMbps: 100,
      uploadMbps: 22,
      latencyMs: 25,
      jitterMs: 5,
      packetLossPercent: 0,
      dnsAverageMs: 50,
      providerStatus: 'ok',
    },
  };
  const assessment = {
    issues: [
      { issueId: 'packet-loss', impact: 'high', confidence: 'high', evidenceLevel: 'measured', summary: 'Packet loss was detected.' },
      { issueId: 'dns-latency', impact: 'medium', confidence: 'high', evidenceLevel: 'measured', summary: 'DNS was slower than expected.' },
      { issueId: 'stale-network-profiles', impact: 'medium', confidence: 'medium', evidenceLevel: 'measured', summary: 'Stale profiles may exist.' },
      { issueId: 'mdns-status', impact: 'low', confidence: 'low', evidenceLevel: 'inferred', summary: 'mDNS needs review.' },
    ],
  };
  const auditEntries = [
    { actionId: 'remove-stale-profile', mode: 'preview', dryRun: true, confirmed: false, actionDescription: 'Preview stale profile cleanup' },
    { actionId: 'remove-stale-profile', mode: 'apply', dryRun: false, confirmed: true, actionDescription: 'Removed stale profile', result: { exitCode: 0 } },
  ];

  const report = generateHumanReport({ before, after, assessment, auditEntries, goal: 'gaming' });

  assert.match(report.markdown, /# Network Optimization Report/);
  assert.match(report.markdown, /Result: Improved/);
  assert.match(report.markdown, /Download.*80 Mbps.*100 Mbps.*\+25%/);
  assert.match(report.markdown, /Latency.*40 ms.*25 ms.*-15 ms/);
  assert.match(report.markdown, /Top 3 Issues/);
  assert.match(report.markdown, /packet-loss/);
  assert.match(report.markdown, /What Changed/);
  assert.match(report.markdown, /Removed stale profile/);
  assert.match(report.markdown, /Next Steps/);
  assert.equal(report.summary.result, 'improved');
});

test('human report explains inconclusive results when benchmark provider is missing', () => {
  const before = {
    label: 'before',
    metrics: { downloadMbps: null, uploadMbps: null, providerStatus: 'missing', missingTools: ['speedtest'] },
  };
  const after = {
    label: 'after',
    metrics: { downloadMbps: null, uploadMbps: null, providerStatus: 'missing', missingTools: ['speedtest'] },
  };

  const report = generateHumanReport({ before, after, assessment: { issues: [] }, auditEntries: [], goal: 'general' });

  assert.equal(report.summary.result, 'inconclusive');
  assert.match(report.markdown, /Result: Inconclusive/);
  assert.match(report.markdown, /Missing tools: speedtest/);
  assert.match(report.markdown, /https:\/\/www\.speedtest\.net\/apps\/cli/);
});

test('comparison chart renderer returns parseable SVG with measured and unavailable metrics', () => {
  const before = {
    label: 'before',
    metrics: { downloadMbps: null, uploadMbps: null, latencyMs: 134, packetLossPercent: 10, providerStatus: 'missing', missingTools: ['speedtest'] },
  };
  const after = {
    label: 'after',
    metrics: { downloadMbps: 55.84, uploadMbps: 17.47, latencyMs: 20.91, jitterMs: 5.48, packetLossPercent: 0, providerStatus: 'ok', missingTools: [] },
  };

  const svg = generateComparisonChartSvg({ before, after, title: 'Release Readiness Chart' });

  assert.match(svg, /^<svg /);
  assert.match(svg, /Release Readiness Chart/);
  assert.match(svg, /Download/);
  assert.match(svg, /Unavailable/);
  assert.match(svg, /55\.84 Mbps/);
  assert.doesNotMatch(svg, /<text[^>]*>[^<]{120,}<\/text>/);
});
