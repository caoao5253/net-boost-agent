import assert from 'node:assert/strict';
import test from 'node:test';
import { runCli } from '../src/cli.js';

test('CLI can run diagnostics and return JSON', async () => {
  const output = [];
  const code = await runCli(['diagnose', '--json'], {
    stdout: text => output.push(text),
    checks: [async () => ({ id: 'dns', title: 'DNS', status: 'ok', summary: 'DNS ok', evidence: {}, remediation: [] })],
  });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'diagnostic');
});

test('CLI can assess diagnostics for a selected goal', async () => {
  const output = [];
  const diagnostic = {
    id: 'diag-1',
    checks: [{ id: 'packet-loss', status: 'warning', evidence: { packetLossPercent: 2 }, summary: 'Loss' }],
  };
  const readFile = async () => JSON.stringify(diagnostic);
  const code = await runCli(['assess', '--from', 'diag.json', '--goal', 'gaming', '--json'], {
    stdout: text => output.push(text),
    readFile,
  });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'assessment');
  assert.equal(parsed.goal, 'gaming');
  assert.equal(parsed.issues[0].impact, 'high');
});

test('CLI doctor reports missing dependencies', async () => {
  const output = [];
  const code = await runCli(['doctor', '--json'], {
    stdout: text => output.push(text),
    commandRunner: async command => ({ exitCode: command === 'node' ? 0 : 1, stdout: '', stderr: 'missing' }),
  });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'dependency-check');
  assert.ok(parsed.dependencies.some(dependency => dependency.name === 'speedtest' && dependency.available === false));
  assert.ok(parsed.dependencies.some(dependency => dependency.name === 'speedtest' && dependency.downloadUrl === 'https://www.speedtest.net/apps/cli'));
});

test('CLI doctor accepts a direct speedtest executable path', async () => {
  const output = [];
  const calls = [];
  const code = await runCli(['doctor', '--speedtest-path', 'C:\\tools\\speedtest.exe', '--json'], {
    stdout: text => output.push(text),
    commandRunner: async command => {
      calls.push(command);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
  });
  const parsed = JSON.parse(output.join(''));
  const speedtest = parsed.dependencies.find(dependency => dependency.name === 'speedtest');

  assert.equal(code, 0);
  assert.equal(speedtest.available, true);
  assert.equal(speedtest.command, 'C:\\tools\\speedtest.exe');
  assert.ok(calls.includes('C:\\tools\\speedtest.exe'));
});

test('CLI benchmark can compare after run against latest before pointer', async () => {
  const output = [];
  const before = {
    id: 'bench-before',
    kind: 'benchmark',
    label: 'before',
    metrics: { downloadMbps: 50, latencyMs: 40 },
  };
  const readFile = async path => {
    if (String(path).includes('latest-before')) return JSON.stringify({ json: 'before.json' });
    return JSON.stringify(before);
  };
  const code = await runCli(['benchmark', '--label', 'after', '--compare', 'before', '--json'], {
    stdout: text => output.push(text),
    readFile,
    metricsProvider: async () => ({ downloadMbps: 75, latencyMs: 25 }),
  });
  const parsed = JSON.parse(output.join(''));

  assert.equal(code, 0);
  assert.equal(parsed.kind, 'benchmark-comparison');
  assert.equal(parsed.comparison.downloadMbps.direction, 'improved');
  assert.equal(parsed.after.label, 'after');
});

test('CLI can render a human report from before and after benchmark files', async () => {
  const output = [];
  const before = { label: 'before', metrics: { downloadMbps: 50, latencyMs: 40, providerStatus: 'ok' } };
  const after = { label: 'after', metrics: { downloadMbps: 75, latencyMs: 20, providerStatus: 'ok' } };
  const readFile = async path => (String(path).includes('after') ? JSON.stringify(after) : JSON.stringify(before));
  const code = await runCli(['report', '--before', 'before.json', '--after', 'after.json'], {
    stdout: text => output.push(text),
    readFile,
  });

  assert.equal(code, 0);
  assert.match(output.join(''), /Network Optimization Report/);
  assert.match(output.join(''), /Result: Improved/);
});

test('CLI can render a comparison chart SVG from before and after benchmark files', async () => {
  const output = [];
  const before = { label: 'before', metrics: { downloadMbps: null, uploadMbps: null, latencyMs: 134, packetLossPercent: 10, providerStatus: 'missing', missingTools: ['speedtest'] } };
  const after = { label: 'after', metrics: { downloadMbps: 55.84, uploadMbps: 17.47, latencyMs: 20.91, packetLossPercent: 0, providerStatus: 'ok', missingTools: [] } };
  const readFile = async path => (String(path).includes('after') ? JSON.stringify(after) : JSON.stringify(before));
  const code = await runCli(['chart', '--before', 'before.json', '--after', 'after.json'], {
    stdout: text => output.push(text),
    readFile,
  });

  assert.equal(code, 0);
  assert.match(output.join(''), /^<svg /);
  assert.match(output.join(''), /Download/);
  assert.match(output.join(''), /Unavailable/);
});
