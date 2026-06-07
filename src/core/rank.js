const IMPACT = { high: 30, medium: 20, low: 10 };
const CONFIDENCE = { high: 30, medium: 20, low: 5 };
const RISK = { low: 30, medium: 10, high: -20 };

export function scoreAction(action) {
  return (IMPACT[action.impact] ?? 0) + (CONFIDENCE[action.confidence] ?? 0) + (RISK[action.risk] ?? 0);
}

export function rankActions(actions = []) {
  return [...actions]
    .map(action => ({ ...action, score: scoreAction(action) }))
    .sort((left, right) => right.score - left.score || String(left.id).localeCompare(String(right.id)));
}
