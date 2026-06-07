import { readFile } from 'node:fs/promises';
import { applyFix, previewFix } from './core/apply.js';
import { assessNetwork } from './core/assess.js';
import { readAuditLog } from './core/audit.js';
import { compareBenchmarks, createRealMetricsProvider, runBenchmark } from './core/benchmark.js';
import { checkDependencies } from './core/dependencies.js';
import { runDiagnostics } from './core/diagnose.js';
import { generateHumanReport } from './core/human-report.js';
import { generateComparisonChartSvg } from './core/report-chart.js';
import { generateRecommendations } from './core/recommend.js';
import { renderJsonReport, renderMarkdownReport } from './core/report.js';

function hasFlag(args, flag) {
  return args.includes(flag);
}

function valueAfter(args, flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function helpText() {
  return `net-boost commands:
  diagnose [--json]
  benchmark --label <name> [--rounds <n>] [--compare <label-or-json>] [--json]
  benchmark --label <name> --speedtest-path <path-to-speedtest.exe> [--rounds <n>] [--json]
  recommend --from <diagnostic-json> [--json]
  apply --plan <plan-json> --action <action-id> [--dry-run|--confirm]
  assess --from <diagnostic-json> --goal <goal> [--json]
  audit [--json]
  doctor [--speedtest-path <path-to-speedtest.exe>] [--json]
  report --before <before-json> --after <after-json> [--assessment <assessment-json>] [--audit <audit-jsonl>] [--goal <goal>] [--json]
  chart --before <before-json> --after <after-json> [--title <title>]
  help
`;
}

export async function runCli(args, io = {}) {
  const stdout = io.stdout ?? (() => {});
  const stderr = io.stderr ?? (() => {});
  const command = args[0] ?? 'help';
  const asJson = hasFlag(args, '--json');
  const readTextFile = io.readFile ?? readFile;
  const speedtestPath = valueAfter(args, '--speedtest-path', process.env.NET_BOOST_SPEEDTEST_PATH);

  try {
    if (command === 'help' || command === '--help' || command === '-h') {
      stdout(helpText());
      return 0;
    }

    if (command === 'diagnose') {
      const run = await runDiagnostics({ checks: io.checks });
      stdout(asJson ? renderJsonReport(run) : renderMarkdownReport(run));
      return 0;
    }

    if (command === 'doctor') {
      const result = await checkDependencies({ commandRunner: io.commandRunner, speedtestPath });
      stdout(asJson ? renderJsonReport(result) : renderMarkdownReport(result));
      return 0;
    }

    if (command === 'benchmark') {
      const label = valueAfter(args, '--label', 'benchmark');
      const rounds = Number(valueAfter(args, '--rounds', '1'));
      const metricsProvider = io.metricsProvider ?? createRealMetricsProvider({
        speedtestCommand: speedtestPath || undefined,
      });
      const result = await runBenchmark({ label, metricsProvider, rounds });
      const compareTarget = valueAfter(args, '--compare');
      if (compareTarget) {
        const pointerPath = compareTarget.endsWith('.json') ? compareTarget : `.net-boost-runs/latest-${compareTarget}.json`;
        const pointerOrRun = JSON.parse(await readTextFile(pointerPath, 'utf8'));
        const beforePath = pointerOrRun.json ?? pointerPath;
        const before = pointerOrRun.kind === 'benchmark' ? pointerOrRun : JSON.parse(await readTextFile(beforePath, 'utf8'));
        const comparison = {
          kind: 'benchmark-comparison',
          before,
          after: result.run,
          comparison: compareBenchmarks(before, result.run),
          paths: result.paths,
        };
        stdout(`${JSON.stringify(comparison, null, 2)}\n`);
        return 0;
      }
      stdout(asJson ? renderJsonReport({ ...result.run, paths: result.paths }) : renderMarkdownReport(result.run));
      return 0;
    }

    if (command === 'recommend') {
      const source = valueAfter(args, '--from');
      if (!source) throw new Error('recommend requires --from <diagnostic-json>');
      const diagnostic = JSON.parse(await readTextFile(source, 'utf8'));
      const plan = generateRecommendations(diagnostic);
      stdout(asJson ? renderJsonReport(plan) : renderMarkdownReport(plan));
      return 0;
    }

    if (command === 'assess') {
      const source = valueAfter(args, '--from');
      if (!source) throw new Error('assess requires --from <diagnostic-json>');
      const diagnostic = JSON.parse(await readTextFile(source, 'utf8'));
      const assessment = assessNetwork({ diagnostic, goal: valueAfter(args, '--goal', 'general') });
      stdout(asJson ? renderJsonReport(assessment) : renderMarkdownReport(assessment));
      return 0;
    }

    if (command === 'audit') {
      const entries = await readAuditLog({});
      stdout(`${JSON.stringify({ kind: 'audit-log', entries }, null, 2)}\n`);
      return 0;
    }

    if (command === 'report') {
      const beforePath = valueAfter(args, '--before');
      const afterPath = valueAfter(args, '--after');
      if (!beforePath || !afterPath) throw new Error('report requires --before <before-json> and --after <after-json>');
      const before = JSON.parse(await readTextFile(beforePath, 'utf8'));
      const after = JSON.parse(await readTextFile(afterPath, 'utf8'));
      const assessmentPath = valueAfter(args, '--assessment');
      const assessment = assessmentPath ? JSON.parse(await readTextFile(assessmentPath, 'utf8')) : { issues: [] };
      const auditPath = valueAfter(args, '--audit');
      const auditEntries = auditPath
        ? String(await readTextFile(auditPath, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
        : [];
      const report = generateHumanReport({ before, after, assessment, auditEntries, goal: valueAfter(args, '--goal', 'general') });
      stdout(asJson ? `${JSON.stringify(report, null, 2)}\n` : report.markdown);
      return 0;
    }

    if (command === 'chart') {
      const beforePath = valueAfter(args, '--before');
      const afterPath = valueAfter(args, '--after');
      if (!beforePath || !afterPath) throw new Error('chart requires --before <before-json> and --after <after-json>');
      const before = JSON.parse(await readTextFile(beforePath, 'utf8'));
      const after = JSON.parse(await readTextFile(afterPath, 'utf8'));
      stdout(generateComparisonChartSvg({ before, after, title: valueAfter(args, '--title', 'Net Boost Agent Network Report') }));
      return 0;
    }

    if (command === 'apply') {
      const planPath = valueAfter(args, '--plan');
      const actionId = valueAfter(args, '--action') ?? valueAfter(args, '--confirm');
      if (!planPath || !actionId) throw new Error('apply requires --plan <plan-json> and --action <action-id>');
      const plan = JSON.parse(await readTextFile(planPath, 'utf8'));
      const result = hasFlag(args, '--dry-run')
        ? await previewFix(plan, actionId, { auditPath: valueAfter(args, '--audit-path', undefined) })
        : await applyFix(plan, actionId, { confirmed: hasFlag(args, '--confirm'), auditPath: valueAfter(args, '--audit-path', undefined) });
      stdout(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    throw new Error(`unknown command: ${command}`);
  } catch (error) {
    stderr(`${error.message}\n`);
    return 1;
  }
}
