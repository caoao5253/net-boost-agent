import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const placeholderPattern = new RegExp(['TO', 'DO'].join('') + '|T' + 'BD|\\[' + ['TO', 'DO'].join('') + ':');

test('Codex plugin manifest and agent skills are present', async () => {
  const manifest = JSON.parse(await readFile(new URL('../.codex-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'net-boost-agent');
  assert.ok(manifest.description.includes('network'));

  for (const skill of ['optimize-network', 'diagnose-network', 'benchmark-network', 'recommend-network-fixes', 'apply-network-fix']) {
    const body = await readFile(new URL(`../skills/${skill}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(body, new RegExp(`name: ${skill}`));
    assert.doesNotMatch(body, placeholderPattern);
  }
});

test('v2 skills describe goal-aware workflow and audit safety', async () => {
  const diagnose = await readFile(new URL('../skills/diagnose-network/SKILL.md', import.meta.url), 'utf8');
  const apply = await readFile(new URL('../skills/apply-network-fix/SKILL.md', import.meta.url), 'utf8');
  const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

  assert.match(diagnose, /goal/i);
  assert.match(diagnose, /evidence/i);
  assert.match(apply, /audit/i);
  assert.match(changelog, /0\.2\.0 - Implemented/);
});

test('user-facing docs prefer agent trigger and installed CLI over internal script paths', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const optimize = await readFile(new URL('../skills/optimize-network/SKILL.md', import.meta.url), 'utf8');

  assert.match(readme, /@net-boost-agent/);
  assert.match(readme, /net-boost doctor/);
  assert.doesNotMatch(readme, /node bin\/net-boost/);
  assert.doesNotMatch(optimize, /node bin\/net-boost/);
});

test('optimize skill and agent spec describe missing Speedtest as Agent recovery flow', async () => {
  const optimize = await readFile(new URL('../skills/optimize-network/SKILL.md', import.meta.url), 'utf8');
  const agentSpec = await readFile(new URL('../docs/AGENT.md', import.meta.url), 'utf8');

  assert.match(optimize, /Net Boost Agent does not stop/);
  assert.match(optimize, /continues DNS, Wi-Fi, gateway latency, packet loss/);
  assert.match(optimize, /This is part of Net Boost Agent's execution logic/);
  assert.match(agentSpec, /Missing Speedtest Recovery Flow/);
  assert.match(agentSpec, /Net Boost Agent resumes before\/after benchmark with speedtestPath/);
});

test('release docs explain Codex, Claude MCP, and Speedtest path setup', async () => {
  const root = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const zh = await readFile(new URL('../README.zh-CN.md', import.meta.url), 'utf8');
  const en = await readFile(new URL('../README.en.md', import.meta.url), 'utf8');
  const install = await readFile(new URL('../docs/INSTALL.md', import.meta.url), 'utf8');

  assert.match(root, /README\.zh-CN\.md/);
  assert.match(root, /README\.en\.md/);
  assert.match(en, /Codex/);
  assert.match(en, /Claude MCP/);
  assert.match(en, /--speedtest-path/);
  assert.match(en, /report chart/i);
  assert.match(zh, /Speedtest CLI/);
  assert.match(zh, /speedtest\.exe/);
  assert.match(install, /Clean Windows/);
  assert.match(install, /Claude MCP/);
});

test('release readmes are readable and free of mojibake', async () => {
  const files = [
    '../README.md',
    '../README.zh-CN.md',
    '../README.en.md',
  ];
  const mojibakePattern = /璇|涓|鎴|鐨|鍜|甯|鈫|€|枃|棣/;

  for (const file of files) {
    const body = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(body, mojibakePattern);
  }

  const root = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const zh = await readFile(new URL('../README.zh-CN.md', import.meta.url), 'utf8');
  const en = await readFile(new URL('../README.en.md', import.meta.url), 'utf8');

  assert.match(root, /Language \/ 语言/);
  assert.match(root, /中文文档/);
  assert.match(root, /帮我优化网络/);
  assert.match(zh, /返回首页/);
  assert.match(zh, /它回答什么问题/);
  assert.match(en, /中文/);
});

test('root readme explains the agent closed loop and product boundaries', async () => {
  const root = await readFile(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(root, /Agent Capabilities/);
  assert.match(root, /Closed Loop/);
  assert.match(root, /What It Does Not Do/);
  assert.match(root, /完整闭环/);
  assert.match(root, /not a web UI/i);
  assert.match(root, /does not bundle Ookla Speedtest CLI/i);
});

test('docs explain how to install the agent into Codex', async () => {
  const root = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const install = await readFile(new URL('../docs/INSTALL.md', import.meta.url), 'utf8');
  const installer = await readFile(new URL('../scripts/install-codex.ps1', import.meta.url), 'utf8');
  const combined = `${root}\n${install}`;

  assert.match(root, /Install Into Codex/);
  assert.match(root, /scripts[\\/]install-codex\.ps1/);
  assert.match(combined, /one-command/i);
  assert.match(combined, /codex plugin add net-boost-agent@net-boost-agent-local/);
  assert.match(combined, /start a new Codex thread/i);
  assert.match(install, /Advanced Manual Install/);
  assert.match(installer, /net-boost-agent-local/);
  assert.match(installer, /marketplace\.json/);
  assert.match(installer, /codex plugin add/);
});
