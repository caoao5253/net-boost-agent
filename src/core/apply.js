import { appendAuditEntry } from './audit.js';

function findAction(plan, actionId) {
  const action = plan.actions?.find(candidate => candidate.id === actionId);
  if (!action) throw new Error(`unknown action: ${actionId}`);
  return action;
}

export async function previewFix(plan, actionId, { auditPath } = {}) {
  const action = findAction(plan, actionId);
  const preview = {
    dryRun: true,
    planId: plan.id,
    action,
    message: 'No changes made. Re-run with explicit confirmation to apply this action.',
  };
  if (auditPath) {
    await appendAuditEntry({
      auditPath,
      entry: {
        planId: plan.id,
        actionId,
        actionDescription: action.description,
        dryRun: true,
        confirmed: false,
        mode: 'preview',
      },
    });
  }
  return preview;
}

export async function applyFix(plan, actionId, { confirmed = false, executor, auditPath } = {}) {
  const action = findAction(plan, actionId);
  if (!confirmed) {
    throw new Error(`Action ${actionId} requires explicit confirmation`);
  }
  const run = executor ?? (async selected => ({ exitCode: 0, actionId: selected.id, dryRunOnly: true }));
  const result = await run(action);
  const applied = {
    status: 'applied',
    planId: plan.id,
    actionId,
    result,
    changedAt: new Date().toISOString(),
  };
  if (auditPath) {
    await appendAuditEntry({
      auditPath,
      entry: {
        planId: plan.id,
        actionId,
        actionDescription: action.description,
        dryRun: false,
        confirmed: true,
        mode: 'apply',
        result,
      },
    });
  }
  return applied;
}
