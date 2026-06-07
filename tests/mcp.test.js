import assert from 'node:assert/strict';
import test from 'node:test';
import { createMcpServer } from '../src/mcp/server.js';

test('MCP server lists diagnostic, benchmark, recommendation, preview, and apply tools', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  for (const name of [
    'run_diagnostics',
    'run_benchmark',
    'compare_benchmarks',
    'generate_recommendations',
    'preview_fix',
    'apply_fix',
  ]) {
    assert.ok(names.includes(name));
  }
  assert.equal(response.result.tools.find(tool => tool.name === 'apply_fix').annotations.destructiveHint, true);
});

test('MCP server lists v2 assessment and audit tools', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  assert.ok(names.includes('assess_network'));
  assert.ok(names.includes('rank_fixes'));
  assert.ok(names.includes('read_audit_log'));
});

test('MCP server lists dependency check tool', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  assert.ok(names.includes('check_dependencies'));
  const dependencyTool = response.result.tools.find(tool => tool.name === 'check_dependencies');
  const benchmarkTool = response.result.tools.find(tool => tool.name === 'run_benchmark');
  assert.ok(dependencyTool.inputSchema.properties.speedtestPath);
  assert.ok(benchmarkTool.inputSchema.properties.speedtestPath);
});

test('MCP server lists human report tool', async () => {
  const server = createMcpServer();
  const response = await server.handle({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} });
  const names = response.result.tools.map(tool => tool.name);

  assert.ok(names.includes('generate_human_report'));
});
