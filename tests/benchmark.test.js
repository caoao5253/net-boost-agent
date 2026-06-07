import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { compareBenchmarks, createRealMetricsProvider, runBenchmark } from '../src/core/benchmark.js';

test('stores benchmark runs and compares before and after values', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-'));
  try {
    const before = await runBenchmark({
      label: 'before',
      outputDir: dir,
      metricsProvider: async () => ({
        downloadMbps: 50,
        uploadMbps: 10,
        latencyMs: 40,
        jitterMs: 8,
        packetLossPercent: 2,
        dnsAverageMs: 80,
      }),
    });
    const after = await runBenchmark({
      label: 'after',
      outputDir: dir,
      metricsProvider: async () => ({
        downloadMbps: 75,
        uploadMbps: 12,
        latencyMs: 25,
        jitterMs: 4,
        packetLossPercent: 0,
        dnsAverageMs: 45,
      }),
    });
    const saved = JSON.parse(await readFile(before.paths.json, 'utf8'));
    const comparison = compareBenchmarks(before.run, after.run);

    assert.equal(saved.label, 'before');
    assert.equal(comparison.downloadMbps.direction, 'improved');
    assert.equal(comparison.latencyMs.direction, 'improved');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('default benchmark records missing speedtest provider instead of pretending speed was measured', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-'));
  try {
    const result = await runBenchmark({ label: 'before', outputDir: dir });

    assert.equal(result.run.metrics.providerStatus, 'missing');
    assert.deepEqual(result.run.metrics.missingTools, ['speedtest']);
    assert.equal(result.run.metrics.downloadMbps, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('real metrics provider parses speedtest and ping output', async () => {
  const calls = [];
  const provider = createRealMetricsProvider({
    speedtestCommand: 'C:\\tools\\speedtest.exe',
    commandRunner: async (command, args, options) => {
      calls.push([command, args, options]);
      if (command === 'C:\\tools\\speedtest.exe') {
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            ping: { latency: 18.5, jitter: 3.5 },
            download: { bandwidth: 10_000_000 },
            upload: { bandwidth: 2_500_000 },
            packetLoss: 0,
          }),
          stderr: '',
        };
      }
      return {
        exitCode: 0,
        stdout: 'Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\nMinimum = 10ms, Maximum = 30ms, Average = 20ms',
        stderr: '',
      };
    },
  });

  const metrics = await provider();

  assert.equal(metrics.providerStatus, 'ok');
  assert.equal(metrics.downloadMbps, 80);
  assert.equal(metrics.uploadMbps, 20);
  assert.equal(metrics.latencyMs, 20);
  assert.equal(metrics.jitterMs, 20);
  assert.equal(metrics.packetLossPercent, 0);
  assert.equal(calls[0][0], 'C:\\tools\\speedtest.exe');
  assert.deepEqual(calls[0][1], ['--format=json', '--accept-license', '--accept-gdpr']);
  assert.equal(calls[0][2].timeout, 120000);
});

test('real metrics provider falls back to legacy speedtest-cli when Ookla CLI is missing', async () => {
  const provider = createRealMetricsProvider({
    commandRunner: async command => {
      if (command === 'speedtest') return { exitCode: 1, stdout: '', stderr: 'missing' };
      if (command === 'speedtest-cli') {
        return {
          exitCode: 0,
          stdout: JSON.stringify({ download: 40_000_000, upload: 10_000_000, ping: 25 }),
          stderr: '',
        };
      }
      return { exitCode: 1, stdout: '', stderr: '' };
    },
  });

  const metrics = await provider();

  assert.equal(metrics.provider, 'speedtest-cli');
  assert.equal(metrics.providerStatus, 'ok');
  assert.equal(metrics.downloadMbps, 40);
  assert.equal(metrics.uploadMbps, 10);
  assert.equal(metrics.latencyMs, 25);
});

test('benchmark uses median metrics across multiple rounds and saves latest label pointer', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-'));
  const downloads = [10, 90, 50];
  try {
    const result = await runBenchmark({
      label: 'before',
      outputDir: dir,
      rounds: 3,
      metricsProvider: async () => ({
        downloadMbps: downloads.shift(),
        uploadMbps: 10,
        latencyMs: 30,
        jitterMs: 4,
        packetLossPercent: 1,
        dnsAverageMs: 40,
        providerStatus: 'ok',
      }),
    });
    const pointer = JSON.parse(await readFile(join(dir, 'latest-before.json'), 'utf8'));

    assert.equal(result.run.metrics.downloadMbps, 50);
    assert.equal(result.run.rounds.length, 3);
    assert.equal(pointer.runId, result.run.id);
    assert.equal(pointer.json, result.paths.json);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('benchmark ignores failed provider rounds when at least one real round succeeds', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'net-boost-'));
  const rounds = [
    {
      downloadMbps: 30,
      uploadMbps: 10,
      latencyMs: 20,
      jitterMs: 5,
      packetLossPercent: 0,
      dnsAverageMs: null,
      provider: 'speedtest',
      providerStatus: 'ok',
      missingTools: [],
    },
    {
      downloadMbps: null,
      uploadMbps: null,
      latencyMs: null,
      jitterMs: null,
      packetLossPercent: null,
      dnsAverageMs: null,
      provider: 'speedtest',
      providerStatus: 'missing',
      missingTools: ['speedtest'],
    },
  ];
  try {
    const result = await runBenchmark({
      label: 'mixed',
      outputDir: dir,
      rounds: 2,
      metricsProvider: async () => rounds.shift(),
    });

    assert.equal(result.run.metrics.providerStatus, 'ok');
    assert.deepEqual(result.run.metrics.missingTools, []);
    assert.equal(result.run.metrics.downloadMbps, 30);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
