import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes CLI and MCP binaries', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.bin['net-boost'], './bin/net-boost.js');
  assert.equal(pkg.bin['net-boost-mcp'], './bin/net-boost-mcp.js');
  assert.match(pkg.scripts.test, /node --test/);
});
