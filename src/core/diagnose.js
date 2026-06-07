import { makeRunId, makeCheckResult, STATUS } from './types.js';
import {
  checkDnsResolution,
  checkMtuProbe,
  checkPacketLoss,
  checkSpeedtestAvailability,
} from '../platform/common.js';
import {
  checkMdnsStatus,
  checkWindowsBandwidthProcesses,
  checkWindowsNetworkProfiles,
  checkWindowsWifi,
} from '../platform/windows.js';

export function defaultChecks() {
  return [
    checkSpeedtestAvailability,
    checkDnsResolution,
    checkMtuProbe,
    checkPacketLoss,
    checkWindowsWifi,
    checkWindowsNetworkProfiles,
    checkWindowsBandwidthProcesses,
    checkMdnsStatus,
  ];
}

export async function runDiagnostics({ checks = defaultChecks() } = {}) {
  const results = [];
  for (const check of checks) {
    try {
      results.push(await check());
    } catch (error) {
      results.push(makeCheckResult({
        id: check.name || 'unknown-check',
        title: check.name || 'Unknown check',
        status: STATUS.unknown,
        summary: error.message,
        evidence: {},
      }));
    }
  }

  return {
    id: makeRunId('diag'),
    kind: 'diagnostic',
    createdAt: new Date().toISOString(),
    checks: results,
  };
}
