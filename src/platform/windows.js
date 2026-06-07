import { commandRunner as defaultCommandRunner } from './common.js';
import { makeCheckResult, STATUS } from '../core/types.js';

export async function checkWindowsNetworkProfiles({ commandRunner = defaultCommandRunner } = {}) {
  const result = await commandRunner('powershell.exe', ['-NoProfile', '-Command', 'Get-NetConnectionProfile | Format-List Name,NetworkCategory,IPv4Connectivity,IPv6Connectivity']);
  const disconnected = /Disconnected|NoTraffic|Old/i.test(result.stdout);
  return makeCheckResult({
    id: 'network-profiles',
    title: 'Network profiles',
    status: result.exitCode !== 0 ? STATUS.unknown : disconnected ? STATUS.warning : STATUS.ok,
    summary: result.exitCode !== 0 ? 'Could not inspect network profiles.' : disconnected ? 'Stale or disconnected profiles may be present.' : 'Network profiles look current.',
    evidence: { exitCode: result.exitCode, profileCount: (result.stdout.match(/Name\s*:/g) ?? []).length },
    remediation: disconnected ? [{ id: 'remove-stale-profile', description: 'Preview removal of stale network profiles before applying cleanup.', risk: 'medium' }] : [],
  });
}

export async function checkWindowsWifi({ commandRunner = defaultCommandRunner } = {}) {
  const result = await commandRunner('netsh', ['wlan', 'show', 'interfaces']);
  const signalMatch = result.stdout.match(/Signal\s*:\s*(\d+)%/i);
  const signal = signalMatch ? Number(signalMatch[1]) : null;
  return makeCheckResult({
    id: 'wifi',
    title: 'Wi-Fi signal',
    status: signal === null ? STATUS.unknown : signal < 60 ? STATUS.warning : STATUS.ok,
    summary: signal === null ? 'Wi-Fi signal could not be measured.' : `Wi-Fi signal is ${signal}%.`,
    evidence: { signalPercent: signal },
    remediation: signal !== null && signal < 60 ? [{ id: 'improve-wifi-signal', description: 'Move closer to the access point or reduce channel interference.', risk: 'low' }] : [],
  });
}

export async function checkWindowsBandwidthProcesses() {
  return makeCheckResult({
    id: 'bandwidth-processes',
    title: 'Bandwidth-heavy processes',
    status: STATUS.unknown,
    summary: 'Per-process bandwidth requires platform counters and may need elevated permissions.',
    evidence: {},
    remediation: [{ id: 'review-bandwidth-processes', description: 'Review active download, sync, and update processes before stopping anything.', risk: 'medium' }],
  });
}

export async function checkMdnsStatus({ commandRunner = defaultCommandRunner } = {}) {
  const result = await commandRunner('powershell.exe', ['-NoProfile', '-Command', 'Get-Service -Name Bonjour*,Dnscache -ErrorAction SilentlyContinue | Select-Object Name,Status']);
  return makeCheckResult({
    id: 'mdns',
    title: 'mDNS status',
    status: result.exitCode === 0 ? STATUS.ok : STATUS.unknown,
    summary: result.exitCode === 0 ? 'mDNS related services were inspected.' : 'mDNS service status could not be inspected.',
    evidence: { exitCode: result.exitCode },
    remediation: [],
  });
}
