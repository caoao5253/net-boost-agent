import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDnsResolution, checkSpeedtestAvailability } from '../src/platform/common.js';
import { checkWindowsNetworkProfiles } from '../src/platform/windows.js';

test('platform checks degrade to unknown when commands or DNS fail', async () => {
  const dns = await checkDnsResolution({ resolver: async () => { throw new Error('timeout'); } });
  const speed = await checkSpeedtestAvailability({
    commandRunner: async () => ({ exitCode: 1, stdout: '', stderr: 'missing' }),
  });
  const profiles = await checkWindowsNetworkProfiles({
    commandRunner: async () => ({ exitCode: 0, stdout: 'Name : Old WiFi\nState : Disconnected', stderr: '' }),
  });

  assert.equal(dns.status, 'unknown');
  assert.equal(speed.status, 'unknown');
  assert.equal(profiles.status, 'warning');
});
