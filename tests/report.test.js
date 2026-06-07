import assert from 'node:assert/strict';
import test from 'node:test';
import { renderJsonReport, renderMarkdownReport } from '../src/core/report.js';

test('renders JSON and Markdown reports with redacted sensitive values', () => {
  const run = {
    id: 'diag-1',
    kind: 'diagnostic',
    createdAt: '2026-06-05T00:00:00.000Z',
    checks: [
      {
        id: 'wifi',
        title: 'Wi-Fi',
        status: 'warning',
        summary: 'SSID HomeNet is weak',
        evidence: { ssid: 'HomeNet', ip: '192.168.1.8' },
        remediation: [],
      },
    ],
  };

  const json = renderJsonReport(run);
  const markdown = renderMarkdownReport(run);

  assert.equal(JSON.parse(json).checks[0].evidence.ssid, '[redacted]');
  assert.match(markdown, /# Net Boost Agent diagnostic Report/);
  assert.doesNotMatch(markdown, /HomeNet/);
});
