import type {ActionItem, DocumentationResult, HealthResult} from '../intelligence/types';

export function actionStatuses(actions: ActionItem[]) {
  return actions.reduce<Record<string, number>>((counts, item) => {
    const label = item.status ?? 'Not stated';
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, Object.create(null) as Record<string, number>);
}
export function scopeSignals(health: HealthResult | null) {
  return health?.dimensions.find(dimension => dimension.id === 'scope_clarity')?.scope_signals ?? [];
}
export function evidenceGaps(documentation: DocumentationResult | null, health: HealthResult | null) {
  const gaps: string[] = [];
  if (documentation) {
    const owners = documentation.action_items.filter(action => action.owner === null).length;
    const dates = documentation.action_items.filter(action => action.due_date === null).length;
    if (owners) gaps.push(`${owners} action ${owners === 1 ? 'entry has' : 'entries have'} no stated owner.`);
    if (dates) gaps.push(`${dates} action ${dates === 1 ? 'entry has' : 'entries have'} no stated due date.`);
  }
  health?.dimensions.filter(dimension => dimension.score === null).forEach(dimension => gaps.push(`${dimension.label}: ${dimension.explanation}`));
  if (!documentation) gaps.push('Documentation results are not available yet.');
  if (!health) gaps.push('Health assessment is not available yet.');
  return gaps;
}
