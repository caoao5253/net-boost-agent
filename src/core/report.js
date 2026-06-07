const SENSITIVE_KEYS = new Set(['ssid', 'ip', 'hostname', 'processName']);

export function redactSensitive(value) {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitive(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEYS.has(key) ? '[redacted]' : redactSensitive(nested),
      ]),
    );
  }
  if (typeof value === 'string') {
    return value.replace(/\b(?:SSID\s+)?[A-Za-z0-9_-]*HomeNet[A-Za-z0-9_-]*\b/g, '[redacted]');
  }
  return value;
}

export function renderJsonReport(run, { redact = true } = {}) {
  const payload = redact ? redactSensitive(run) : run;
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function renderMarkdownReport(run, { redact = true } = {}) {
  const payload = redact ? redactSensitive(run) : run;
  const lines = [
    `# Net Boost Agent ${payload.kind} Report`,
    '',
    `- Run ID: ${payload.id}`,
    `- Created: ${payload.createdAt}`,
    '',
  ];

  if (payload.metrics) {
    lines.push('## Metrics', '');
    for (const [key, value] of Object.entries(payload.metrics)) {
      lines.push(`- ${key}: ${value}`);
    }
    lines.push('');
  }

  if (payload.checks) {
    lines.push('## Checks', '');
    for (const check of payload.checks) {
      lines.push(`- ${check.status.toUpperCase()} ${check.title}: ${check.summary}`);
    }
    lines.push('');
  }

  if (payload.actions) {
    lines.push('## Recommended Actions', '');
    for (const action of payload.actions) {
      lines.push(`- ${action.risk.toUpperCase()} ${action.description}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
