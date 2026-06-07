import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const REPO_URL = 'https://github.com/caoao5253/net-boost-agent';
const PRIVACY_URL = `${REPO_URL}/blob/main/docs/legal/privacy.md`;
const TERMS_URL = `${REPO_URL}/blob/main/docs/legal/terms.md`;
const placeholderPattern = new RegExp(['TO', 'DO'].join('') + '|T' + 'BD|\\[' + ['TO', 'DO'].join('') + ':');

test('plugin manifest has marketplace-ready interface metadata and assets', async () => {
  const manifest = JSON.parse(await readFile(new URL('../.codex-plugin/plugin.json', import.meta.url), 'utf8'));

  assert.equal(manifest.interface.displayName, 'Net Boost Agent');
  assert.equal(manifest.interface.category, 'Productivity');
  assert.equal(manifest.homepage, REPO_URL);
  assert.equal(manifest.repository, REPO_URL);
  assert.equal(manifest.interface.websiteURL, REPO_URL);
  assert.equal(manifest.interface.privacyPolicyURL, PRIVACY_URL);
  assert.equal(manifest.interface.termsOfServiceURL, TERMS_URL);
  assert.equal(manifest.interface.composerIcon, './assets/icon.png');
  assert.equal(manifest.interface.logo, './assets/logo.png');
  assert.equal(manifest.interface.screenshots.length, 3);

  for (const asset of [manifest.interface.composerIcon, manifest.interface.logo, ...manifest.interface.screenshots]) {
    await access(new URL(`../${asset.replace('./', '')}`, import.meta.url));
  }
});

test('marketplace entry is present with install policy', async () => {
  const marketplace = JSON.parse(await readFile(new URL('../.agents/plugins/marketplace.json', import.meta.url), 'utf8'));
  const entry = marketplace.plugins.find(plugin => plugin.name === 'net-boost-agent');

  assert.equal(marketplace.name, 'net-boost-agent-local');
  assert.equal(entry.policy.installation, 'AVAILABLE');
  assert.equal(entry.policy.authentication, 'ON_INSTALL');
  assert.equal(entry.category, 'Productivity');
});

test('legal docs exist for marketplace links', async () => {
  const privacy = await readFile(new URL('../docs/legal/privacy.md', import.meta.url), 'utf8');
  const terms = await readFile(new URL('../docs/legal/terms.md', import.meta.url), 'utf8');

  assert.match(privacy, /Privacy Policy/);
  assert.match(terms, /Terms of Service/);
  assert.doesNotMatch(privacy + terms, placeholderPattern);
});

test('public release docs do not contain placeholder URLs', async () => {
  const files = [
    '../README.md',
    '../README.zh-CN.md',
    '../README.en.md',
    '../CHANGELOG.md',
    '../docs/AGENT.md',
    '../docs/INSTALL.md',
    '../.codex-plugin/plugin.json',
  ];

  for (const file of files) {
    const body = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(body, /example\.com|github\.com\/local|node bin\/net-boost/);
  }
});
