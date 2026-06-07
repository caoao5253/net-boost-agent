import { applyFix, previewFix } from '../core/apply.js';
import { assessNetwork } from '../core/assess.js';
import { readAuditLog } from '../core/audit.js';
import { compareBenchmarks, createRealMetricsProvider, runBenchmark } from '../core/benchmark.js';
import { checkDependencies } from '../core/dependencies.js';
import { runDiagnostics } from '../core/diagnose.js';
import { generateHumanReport } from '../core/human-report.js';
import { generateRecommendations } from '../core/recommend.js';
import { rankActions } from '../core/rank.js';

const tools = [
  {
    name: 'run_diagnostics',
    description: 'Run read-only network diagnostics.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'run_benchmark',
    description: 'Run a timestamped benchmark and save JSON/Markdown artifacts. If Speedtest CLI is downloaded but not installed, pass speedtestPath.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        rounds: { type: 'number' },
        speedtestPath: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'compare_benchmarks',
    description: 'Compare before and after benchmark payloads.',
    inputSchema: { type: 'object', properties: { before: { type: 'object' }, after: { type: 'object' } }, required: ['before', 'after'] },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'generate_recommendations',
    description: 'Generate a safe optimization plan from diagnostic results.',
    inputSchema: { type: 'object', properties: { diagnostic: { type: 'object' } }, required: ['diagnostic'] },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'preview_fix',
    description: 'Preview a proposed fix without changing the system.',
    inputSchema: { type: 'object', properties: { plan: { type: 'object' }, actionId: { type: 'string' } }, required: ['plan', 'actionId'] },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'apply_fix',
    description: 'Apply a specific fix only when confirmed.',
    inputSchema: { type: 'object', properties: { plan: { type: 'object' }, actionId: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['plan', 'actionId', 'confirmed'] },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: 'assess_network',
    description: 'Assess diagnostic evidence for a selected network goal.',
    inputSchema: { type: 'object', properties: { diagnostic: { type: 'object' }, goal: { type: 'string' } }, required: ['diagnostic'] },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'rank_fixes',
    description: 'Rank fix actions by impact, confidence, and risk.',
    inputSchema: { type: 'object', properties: { actions: { type: 'array' } }, required: ['actions'] },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'read_audit_log',
    description: 'Read local preview and apply audit entries.',
    inputSchema: { type: 'object', properties: { auditPath: { type: 'string' } } },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'check_dependencies',
    description: 'Check whether optional external tools such as Ookla Speedtest CLI are available. If the user downloaded speedtest.exe, pass speedtestPath.',
    inputSchema: { type: 'object', properties: { speedtestPath: { type: 'string' } } },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'generate_human_report',
    description: 'Generate a user-facing network optimization report from before/after benchmarks, assessment, and audit entries.',
    inputSchema: {
      type: 'object',
      properties: {
        before: { type: 'object' },
        after: { type: 'object' },
        assessment: { type: 'object' },
        auditEntries: { type: 'array' },
        goal: { type: 'string' },
      },
      required: ['before', 'after'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
];

function content(payload) {
  return [{ type: 'text', text: JSON.stringify(payload, null, 2) }];
}

export function createMcpServer() {
  return {
    async handle(message) {
      try {
        if (message.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'net-boost-agent', version: '0.5.0' },
            },
          };
        }

        if (message.method === 'tools/list') {
          return { jsonrpc: '2.0', id: message.id, result: { tools } };
        }

        if (message.method === 'tools/call') {
          const { name, arguments: args = {} } = message.params ?? {};
          const result = await callTool(name, args);
          return { jsonrpc: '2.0', id: message.id, result: { content: content(result) } };
        }

        return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `unknown method: ${message.method}` } };
      } catch (error) {
        return { jsonrpc: '2.0', id: message.id, error: { code: -32000, message: error.message } };
      }
    },
  };
}

export async function callTool(name, args) {
  if (name === 'run_diagnostics') return runDiagnostics();
  if (name === 'run_benchmark') return runBenchmark({
    label: args.label ?? 'benchmark',
    rounds: args.rounds ?? 1,
    metricsProvider: createRealMetricsProvider({ speedtestCommand: args.speedtestPath || undefined }),
  });
  if (name === 'compare_benchmarks') return compareBenchmarks(args.before, args.after);
  if (name === 'generate_recommendations') return generateRecommendations(args.diagnostic);
  if (name === 'preview_fix') return previewFix(args.plan, args.actionId, { auditPath: args.auditPath });
  if (name === 'apply_fix') return applyFix(args.plan, args.actionId, { confirmed: args.confirmed === true, auditPath: args.auditPath });
  if (name === 'assess_network') return assessNetwork({ diagnostic: args.diagnostic, goal: args.goal });
  if (name === 'rank_fixes') return rankActions(args.actions);
  if (name === 'read_audit_log') return readAuditLog({ auditPath: args.auditPath });
  if (name === 'check_dependencies') return checkDependencies({ speedtestPath: args.speedtestPath });
  if (name === 'generate_human_report') return generateHumanReport({
    before: args.before,
    after: args.after,
    assessment: args.assessment,
    auditEntries: args.auditEntries ?? [],
    goal: args.goal,
  });
  throw new Error(`unknown tool: ${name}`);
}

export async function runStdioServer({ input = process.stdin, output = process.stdout } = {}) {
  const server = createMcpServer();
  let buffer = '';
  input.setEncoding('utf8');
  for await (const chunk of input) {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const response = await server.handle(JSON.parse(line));
      output.write(`${JSON.stringify(response)}\n`);
    }
  }
}
