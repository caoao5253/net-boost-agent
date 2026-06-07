import { execFile } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { promisify } from 'node:util';
import { makeCheckResult, STATUS } from '../core/types.js';

const execFileAsync = promisify(execFile);

export async function commandRunner(command, args = [], options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 10000, windowsHide: true, ...options });
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    return {
      exitCode: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message,
    };
  }
}

export async function checkDnsResolution({ resolver = lookup, domains = ['cloudflare.com', 'google.com'] } = {}) {
  const timings = [];
  try {
    for (const domain of domains) {
      const started = performance.now();
      await resolver(domain);
      timings.push(performance.now() - started);
    }
    const averageMs = Math.round(timings.reduce((sum, item) => sum + item, 0) / timings.length);
    return makeCheckResult({
      id: 'dns',
      title: 'DNS resolution',
      status: averageMs > 120 ? STATUS.warning : STATUS.ok,
      summary: averageMs > 120 ? 'DNS resolution is slower than expected.' : 'DNS resolution looks healthy.',
      evidence: { averageMs },
      remediation: averageMs > 120 ? [{ id: 'review-dns', description: 'Review DNS resolver performance before changing DNS settings.', risk: 'medium' }] : [],
    });
  } catch (error) {
    return makeCheckResult({
      id: 'dns',
      title: 'DNS resolution',
      status: STATUS.unknown,
      summary: `DNS check failed: ${error.message}`,
      evidence: {},
    });
  }
}

export async function checkSpeedtestAvailability({ commandRunner: runner = commandRunner } = {}) {
  const result = await runner('speedtest', ['--version']);
  return makeCheckResult({
    id: 'speedtest',
    title: 'Ookla Speedtest CLI availability',
    status: result.exitCode === 0 ? STATUS.ok : STATUS.unknown,
    summary: result.exitCode === 0 ? 'Ookla Speedtest CLI is available.' : 'Ookla Speedtest CLI is not available.',
    evidence: { exitCode: result.exitCode, stderr: result.stderr },
    remediation: result.exitCode === 0 ? [] : [{ id: 'install-speedtest', description: 'Install Ookla Speedtest CLI to collect download and upload metrics.', risk: 'low' }],
  });
}

export async function checkPacketLoss({ commandRunner: runner = commandRunner, host = '1.1.1.1' } = {}) {
  const result = await runner('ping', ['-n', '4', host]);
  const lossMatch = result.stdout.match(/(\d+)%\s*loss/i);
  const loss = lossMatch ? Number(lossMatch[1]) : null;
  return makeCheckResult({
    id: 'packet-loss',
    title: 'Packet loss',
    status: loss === null ? STATUS.unknown : loss > 0 ? STATUS.warning : STATUS.ok,
    summary: loss === null ? 'Packet loss could not be measured.' : `${loss}% packet loss measured.`,
    evidence: { host, packetLossPercent: loss },
    remediation: loss && loss > 0 ? [{ id: 'investigate-packet-loss', description: 'Check Wi-Fi quality, cabling, VPN, and ISP path for packet loss.', risk: 'low' }] : [],
  });
}

export async function checkMtuProbe() {
  return makeCheckResult({
    id: 'mtu',
    title: 'MTU probe',
    status: STATUS.unknown,
    summary: 'MTU probing is available as a safe planned check; no system changes were made.',
    evidence: { supported: true },
    remediation: [],
  });
}
