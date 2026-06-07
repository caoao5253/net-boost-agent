import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDependencies } from '../src/core/dependencies.js';

test('dependency check reports missing optional Ookla Speedtest CLI with platform install guidance', async () => {
  const result = await checkDependencies({
    commandRunner: async command => ({
      exitCode: command === 'speedtest' ? 1 : 0,
      stdout: command === 'node' ? 'v22.0.0' : '',
      stderr: command === 'speedtest' ? 'not found' : '',
    }),
    platform: 'win32',
  });

  const speedtest = result.dependencies.find(dependency => dependency.name === 'speedtest');
  assert.equal(result.kind, 'dependency-check');
  assert.equal(speedtest.available, false);
  assert.equal(speedtest.required, false);
  assert.equal(speedtest.displayName, 'Ookla Speedtest CLI');
  assert.equal(speedtest.downloadUrl, 'https://www.speedtest.net/apps/cli');
  assert.match(speedtest.installHint, /Download Speedtest CLI for Windows/);
  assert.equal(speedtest.installOptions.macOS[0], 'brew tap teamookla/speedtest');
  assert.equal(speedtest.agentFlow.setupState, 'missing');
  assert.equal(speedtest.agentFlow.canContinueBasicDiagnostics, true);
  assert.deepEqual(speedtest.agentFlow.blockedMetrics, ['downloadMbps', 'uploadMbps']);
  assert.equal(speedtest.agentFlow.afterDownload.pathArgument, '--speedtest-path <path-to-speedtest>');
  assert.equal(result.summary.missingOptional, 1);
});

test('dependency check accepts downloaded speedtest executable path', async () => {
  const result = await checkDependencies({
    commandRunner: async command => ({
      exitCode: command === 'C:\\tools\\speedtest.exe' || command !== 'speedtest' ? 0 : 1,
      stdout: '',
      stderr: '',
    }),
    speedtestPath: 'C:\\tools\\speedtest.exe',
    platform: 'win32',
  });

  const speedtest = result.dependencies.find(dependency => dependency.name === 'speedtest');
  assert.equal(speedtest.available, true);
  assert.equal(speedtest.command, 'C:\\tools\\speedtest.exe');
  assert.equal(speedtest.agentFlow.setupState, 'available-from-path');
  assert.deepEqual(speedtest.agentFlow.blockedMetrics, []);
  assert.equal(result.status, 'ok');
});
