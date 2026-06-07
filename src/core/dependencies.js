import { commandRunner as defaultCommandRunner } from '../platform/common.js';

const SPEEDTEST_INSTALL_OPTIONS = {
  win32: [
    'Download Speedtest CLI for Windows from https://www.speedtest.net/apps/cli.',
    'Extract the archive and add the folder containing speedtest.exe to PATH.',
  ],
  darwin: [
    'brew tap teamookla/speedtest',
    'brew update',
    'brew install speedtest --force',
  ],
  linux: [
    'Use the Ubuntu/Debian or Fedora/CentOS/RedHat install instructions at https://www.speedtest.net/apps/cli.',
    'Choose the package for your distribution and CPU architecture.',
  ],
  freebsd: [
    'Download the FreeBSD build from https://www.speedtest.net/apps/cli.',
    'Choose the x86_64 package and add the speedtest binary to PATH.',
  ],
};

function speedtestInstallHint(platform) {
  const options = SPEEDTEST_INSTALL_OPTIONS[platform] ?? SPEEDTEST_INSTALL_OPTIONS.win32;
  return options.join(' ');
}

function speedtestAgentFlow({ available, command, platform }) {
  if (available) {
    return {
      setupState: command === 'speedtest' ? 'available-on-path' : 'available-from-path',
      canContinueBasicDiagnostics: true,
      blockedMetrics: [],
      nextStep: 'Run before/after benchmark with the available Speedtest CLI.',
    };
  }

  return {
    setupState: 'missing',
    canContinueBasicDiagnostics: true,
    blockedMetrics: ['downloadMbps', 'uploadMbps'],
    nextStep: 'Continue basic diagnostics now. To enable download/upload benchmark, download Speedtest CLI and provide the speedtest executable path.',
    afterDownload: {
      officialUrl: 'https://www.speedtest.net/apps/cli',
      pathOption: platform === 'win32'
        ? 'Send the downloaded speedtest.exe path to the Agent.'
        : 'Install Speedtest CLI or send the speedtest executable path to the Agent.',
      pathArgument: '--speedtest-path <path-to-speedtest>',
      environmentVariable: 'NET_BOOST_SPEEDTEST_PATH',
    },
  };
}

const DEPENDENCIES = [
  {
    name: 'node',
    command: 'node',
    args: ['--version'],
    required: true,
    purpose: 'Run the Net Boost Agent CLI and MCP server.',
    installHint: 'Install Node.js 20 or newer from https://nodejs.org/.',
    downloadUrl: 'https://nodejs.org/',
    docsUrl: 'https://nodejs.org/en/download',
  },
  {
    name: 'speedtest',
    displayName: 'Ookla Speedtest CLI',
    command: 'speedtest',
    args: ['--version'],
    required: false,
    purpose: 'Collect download and upload benchmark metrics.',
    installHint: null,
    downloadUrl: 'https://www.speedtest.net/apps/cli',
    docsUrl: 'https://www.speedtest.net/apps/cli',
    installOptions: {
      Windows: SPEEDTEST_INSTALL_OPTIONS.win32,
      macOS: SPEEDTEST_INSTALL_OPTIONS.darwin,
      Linux: SPEEDTEST_INSTALL_OPTIONS.linux,
      FreeBSD: SPEEDTEST_INSTALL_OPTIONS.freebsd,
    },
    alternatives: [
      {
        name: 'speedtest-cli',
        downloadUrl: 'https://pypi.org/project/speedtest-cli/',
        installHint: 'Legacy fallback: install with "pipx install speedtest-cli" or "pip install speedtest-cli".',
      },
    ],
  },
  {
    name: 'ping',
    command: 'ping',
    args: ['-?'],
    required: false,
    purpose: 'Measure latency and packet loss.',
    installHint: 'Use the operating system ping utility. On Windows it is normally built in.',
    downloadUrl: null,
    docsUrl: 'https://learn.microsoft.com/windows-server/administration/windows-commands/ping',
  },
];

export async function checkDependencies({
  commandRunner = defaultCommandRunner,
  platform = process.platform,
  speedtestPath = process.env.NET_BOOST_SPEEDTEST_PATH,
} = {}) {
  const dependencies = [];

  for (const dependency of DEPENDENCIES) {
    const command = dependency.name === 'speedtest' && speedtestPath ? speedtestPath : dependency.command;
    const result = await commandRunner(command, dependency.args);
    const item = {
      name: dependency.name,
      required: dependency.required,
      available: result.exitCode === 0,
      command,
      displayName: dependency.displayName ?? dependency.name,
      purpose: dependency.purpose,
      installHint: dependency.name === 'speedtest' ? speedtestInstallHint(platform) : dependency.installHint,
      downloadUrl: dependency.downloadUrl,
      docsUrl: dependency.docsUrl,
      installOptions: dependency.installOptions,
      alternatives: dependency.alternatives,
      evidence: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    };
    if (dependency.name === 'speedtest') {
      item.agentFlow = speedtestAgentFlow({ available: item.available, command, platform });
    }
    dependencies.push(item);
  }

  const missingRequired = dependencies.filter(item => item.required && !item.available).length;
  const missingOptional = dependencies.filter(item => !item.required && !item.available).length;

  return {
    kind: 'dependency-check',
    createdAt: new Date().toISOString(),
    status: missingRequired > 0 ? 'critical' : missingOptional > 0 ? 'warning' : 'ok',
    dependencies,
    summary: {
      total: dependencies.length,
      missingRequired,
      missingOptional,
    },
  };
}
