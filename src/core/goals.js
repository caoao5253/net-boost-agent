export const GOALS = Object.freeze(['general', 'gaming', 'video_call', 'download']);

const ALIASES = new Map([
  ['default', 'general'],
  ['video-call', 'video_call'],
  ['video', 'video_call'],
  ['call', 'video_call'],
  ['downloads', 'download'],
  ['throughput', 'download'],
  ['game', 'gaming'],
]);

export function normalizeGoal(goal = 'general') {
  const normalized = String(goal || 'general').trim().toLowerCase().replace(/\s+/g, '_');
  const mapped = ALIASES.get(normalized) ?? normalized;
  return GOALS.includes(mapped) ? mapped : 'general';
}
