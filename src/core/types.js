export const STATUS = Object.freeze({
  ok: 'ok',
  warning: 'warning',
  critical: 'critical',
  unknown: 'unknown',
});

export function makeCheckResult({
  id,
  title,
  status = STATUS.unknown,
  summary = '',
  evidence = {},
  remediation = [],
  createdAt = new Date().toISOString(),
}) {
  if (!id) throw new Error('check result requires id');
  if (!title) throw new Error('check result requires title');

  return {
    id,
    title,
    status,
    summary,
    evidence,
    remediation,
    createdAt,
  };
}

export function makeRunId(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}
