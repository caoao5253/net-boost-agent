import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeRunId } from './types.js';
import { renderJsonReport, renderMarkdownReport } from './report.js';
import { commandRunner as defaultCommandRunner } from '../platform/common.js';

const HIGHER_IS_BETTER = new Set(['downloadMbps', 'uploadMbps']);
const LOWER_IS_BETTER = new Set(['latencyMs', 'jitterMs', 'packetLossPercent', 'dnsAverageMs']);

function roundMetric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function bytesPerSecondToMbps(value) {
  return roundMetric((value * 8) / 1_000_000);
}

function bitsPerSecondToMbps(value) {
  return roundMetric(value / 1_000_000);
}

function parseSpeedtestJson(stdout) {
  const payload = JSON.parse(stdout);
  return {
    downloadMbps: payload.download?.bandwidth ? bytesPerSecondToMbps(payload.download.bandwidth) : bitsPerSecondToMbps(payload.download),
    uploadMbps: payload.upload?.bandwidth ? bytesPerSecondToMbps(payload.upload.bandwidth) : bitsPerSecondToMbps(payload.upload),
    speedtestLatencyMs: roundMetric(payload.ping?.latency ?? payload.ping),
    speedtestJitterMs: roundMetric(payload.ping?.jitter),
    packetLossPercent: roundMetric(payload.packetLoss),
  };
}

function parsePingOutput(stdout) {
  const lossMatch = stdout.match(/(\d+(?:\.\d+)?)%\s*(?:loss|丢失)/i);
  const averageMatch = stdout.match(/Average\s*=\s*(\d+(?:\.\d+)?)ms/i) ?? stdout.match(/平均\s*=\s*(\d+(?:\.\d+)?)ms/i);
  const minimumMatch = stdout.match(/Minimum\s*=\s*(\d+(?:\.\d+)?)ms/i) ?? stdout.match(/最短\s*=\s*(\d+(?:\.\d+)?)ms/i);
  const maximumMatch = stdout.match(/Maximum\s*=\s*(\d+(?:\.\d+)?)ms/i) ?? stdout.match(/最长\s*=\s*(\d+(?:\.\d+)?)ms/i);
  const latencyMs = averageMatch ? Number(averageMatch[1]) : null;
  const min = minimumMatch ? Number(minimumMatch[1]) : null;
  const max = maximumMatch ? Number(maximumMatch[1]) : null;
  return {
    latencyMs: roundMetric(latencyMs),
    jitterMs: min !== null && max !== null ? roundMetric(max - min) : null,
    packetLossPercent: lossMatch ? Number(lossMatch[1]) : null,
  };
}

export function createRealMetricsProvider({
  commandRunner = defaultCommandRunner,
  pingHost = '1.1.1.1',
  speedtestCommand = process.env.NET_BOOST_SPEEDTEST_PATH || 'speedtest',
} = {}) {
  return async function realMetricsProvider() {
    let provider = 'speedtest';
    let speedtest = await commandRunner(speedtestCommand, ['--format=json', '--accept-license', '--accept-gdpr'], { timeout: 120000 });
    if (speedtest.exitCode !== 0) {
      provider = 'speedtest-cli';
      speedtest = await commandRunner('speedtest-cli', ['--json'], { timeout: 120000 });
    }
    if (speedtest.exitCode !== 0) {
      return defaultMetricsProvider();
    }

    const parsedSpeedtest = parseSpeedtestJson(speedtest.stdout);
    const ping = await commandRunner('ping', ['-n', '4', pingHost]);
    const parsedPing = ping.exitCode === 0 ? parsePingOutput(ping.stdout) : {};

    return {
      downloadMbps: parsedSpeedtest.downloadMbps,
      uploadMbps: parsedSpeedtest.uploadMbps,
      latencyMs: parsedPing.latencyMs ?? parsedSpeedtest.speedtestLatencyMs,
      jitterMs: parsedPing.jitterMs ?? parsedSpeedtest.speedtestJitterMs ?? null,
      packetLossPercent: parsedPing.packetLossPercent ?? parsedSpeedtest.packetLossPercent ?? null,
      dnsAverageMs: null,
      provider,
      providerStatus: 'ok',
      missingTools: [],
    };
  };
}

export async function defaultMetricsProvider() {
  return {
    downloadMbps: null,
    uploadMbps: null,
    latencyMs: null,
    jitterMs: null,
    packetLossPercent: null,
    dnsAverageMs: null,
    provider: 'speedtest',
    providerStatus: 'missing',
    missingTools: ['speedtest'],
    note: 'No Speedtest CLI provider configured; install Ookla Speedtest CLI or inject a metrics provider.',
  };
}

function median(values) {
  const numbers = values.filter(value => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[middle] : roundMetric((numbers[middle - 1] + numbers[middle]) / 2);
}

function combineRoundMetrics(rounds) {
  const keys = ['downloadMbps', 'uploadMbps', 'latencyMs', 'jitterMs', 'packetLossPercent', 'dnsAverageMs'];
  const combined = {};
  for (const key of keys) {
    combined[key] = median(rounds.map(round => round[key]));
  }
  const first = rounds[0] ?? {};
  combined.provider = first.provider ?? null;
  combined.providerStatus = rounds.some(round => round.providerStatus === 'ok') ? 'ok' : first.providerStatus ?? 'missing';
  combined.missingTools = combined.providerStatus === 'ok' ? [] : [...new Set(rounds.flatMap(round => round.missingTools ?? []))];
  if (combined.providerStatus !== 'ok') {
    combined.note = first.note ?? 'Benchmark provider unavailable.';
  }
  return combined;
}

export async function runBenchmark({
  label = 'benchmark',
  outputDir = '.net-boost-runs',
  metricsProvider = createRealMetricsProvider(),
  rounds = 1,
} = {}) {
  await mkdir(outputDir, { recursive: true });
  const roundCount = Math.max(1, Number(rounds) || 1);
  const roundMetrics = [];
  for (let index = 0; index < roundCount; index += 1) {
    roundMetrics.push(await metricsProvider());
  }
  const run = {
    id: makeRunId(`bench-${label}`),
    kind: 'benchmark',
    label,
    createdAt: new Date().toISOString(),
    metrics: combineRoundMetrics(roundMetrics),
    rounds: roundMetrics,
  };
  const json = join(outputDir, `${run.id}.json`);
  const markdown = join(outputDir, `${run.id}.md`);
  const latest = join(outputDir, `latest-${label}.json`);
  await writeFile(json, renderJsonReport(run), 'utf8');
  await writeFile(markdown, renderMarkdownReport(run), 'utf8');
  await writeFile(latest, `${JSON.stringify({ label, runId: run.id, json, markdown, createdAt: run.createdAt }, null, 2)}\n`, 'utf8');
  return { run, paths: { json, markdown } };
}

export function compareBenchmarks(before, after) {
  const keys = new Set([...Object.keys(before.metrics ?? {}), ...Object.keys(after.metrics ?? {})]);
  const comparison = {};

  for (const key of keys) {
    const beforeValue = before.metrics?.[key];
    const afterValue = after.metrics?.[key];
    if (typeof beforeValue !== 'number' || typeof afterValue !== 'number') {
      comparison[key] = { before: beforeValue, after: afterValue, delta: null, direction: 'inconclusive' };
      continue;
    }

    const delta = afterValue - beforeValue;
    let direction = 'unchanged';
    if (delta !== 0 && HIGHER_IS_BETTER.has(key)) direction = delta > 0 ? 'improved' : 'regressed';
    if (delta !== 0 && LOWER_IS_BETTER.has(key)) direction = delta < 0 ? 'improved' : 'regressed';
    if (!HIGHER_IS_BETTER.has(key) && !LOWER_IS_BETTER.has(key)) direction = 'inconclusive';

    comparison[key] = { before: beforeValue, after: afterValue, delta, direction };
  }

  return comparison;
}
