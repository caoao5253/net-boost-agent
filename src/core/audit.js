import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const DEFAULT_AUDIT_PATH = '.net-boost-runs/audit.jsonl';

export async function appendAuditEntry({ auditPath = DEFAULT_AUDIT_PATH, entry }) {
  await mkdir(dirname(auditPath), { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  await writeFile(auditPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', flag: 'a' });
  return payload;
}

export async function readAuditLog({ auditPath = DEFAULT_AUDIT_PATH } = {}) {
  try {
    const body = await readFile(auditPath, 'utf8');
    return body
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
