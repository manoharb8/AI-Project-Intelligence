import type {RiskEntry} from '../intelligence/types';

// Presentation only: never estimate values from a quote, severity, category or health score.
export const severityLevels = ['Critical', 'High', 'Moderate', 'Low'] as const;
export type Severity = typeof severityLevels[number];
export type SeverityFilter = 'all' | Severity | 'other';
export type AxisMode = 'levels' | 'percent' | 'words' | 'score5';
export const probabilityLevels = ['Low', 'Moderate', 'High'];
export const impactLevels = ['Low', 'Moderate', 'High', 'Critical'];
export function axisLabels(mode: AxisMode, levels: string[]) {
  if (mode === 'score5') return ['1/5','2/5','3/5','4/5','5/5'];
  return mode === 'words' ? (levels === probabilityLevels ? ['Unlikely','Likely'] : ['Minor','Major']) : levels;
}

export function stated(value: string | null) {
  return value?.trim() ? value : 'Not stated';
}
export function severityOf(value: string | null): Severity | null {
  return severityLevels.find(level => level.toLowerCase() === value?.trim().toLowerCase()) ?? null;
}
export function axisValue(value: string | null, mode: AxisMode, levels: string[]): number | null {
  if (!value?.trim()) return null;
  if (mode === 'score5') {
    const match = value.trim().match(/^([1-5])\s*\/\s*5(?:\s*[—–-]\s*(?:Very Low|Low|Moderate|Medium|High|Very High))?$/i);
    return match ? (Number(match[1]) - .5) / 5 * 100 : null;
  }
  if (mode !== 'percent') {
    const labels = axisLabels(mode, levels);
    const literal = value.trim().toLowerCase();
    const index = labels.findIndex(level => level.toLowerCase() === (literal === 'medium' ? 'moderate' : literal));
    return index < 0 ? null : (index + .5) / labels.length * 100;
  }
  // A bare number, range, free-text statement, fraction or score has no confirmed % scale.
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)\s*%$/.test(value.trim())) return null;
  const number = Number(value.trim().replace('%', '').trim());
  return number >= 0 && number <= 100 ? number : null;
}
export function positionOf(risk: RiskEntry, probability: AxisMode, impact: AxisMode) {
  const x = axisValue(risk.likelihood, probability, probabilityLevels);
  const y = axisValue(risk.impact, impact, impactLevels);
  return x === null || y === null ? null : {x, y};
}
export function availableModes(values: (string | null)[], levels: string[]): AxisMode[] {
  const modes: AxisMode[] = ['levels', 'percent', 'words', 'score5'];
  const supported = modes.filter(mode => values.some(value => axisValue(value, mode, levels) !== null));
  return supported.length ? supported : ['levels'];
}
export function allAxisPairs(risks: RiskEntry[]) {
  return availableModes(risks.map(r=>r.likelihood),probabilityLevels).flatMap(probability=>
    availableModes(risks.map(r=>r.impact),impactLevels).map(impact=>({probability,impact,risks:risks.filter(r=>positionOf(r,probability,impact))}))).filter(group=>group.risks.length);
}
export function hasPosition(risk: RiskEntry) { return allAxisPairs([risk]).length > 0; }
export function defaultAxes(risks: RiskEntry[]) {
  const probabilityModes = availableModes(risks.map(r => r.likelihood), probabilityLevels);
  const impactModes = availableModes(risks.map(r => r.impact), impactLevels);
  const choices = probabilityModes.flatMap(probability => impactModes.map(impact => ({probability, impact,
    count: risks.filter(r => positionOf(r, probability, impact)).length})));
  return choices.sort((a, b) => b.count - a.count)[0];
}
export function positionReason(risk: RiskEntry, probability: AxisMode, impact: AxisMode) {
  const missing = [!risk.likelihood?.trim() && 'probability', !risk.impact?.trim() && 'impact'].filter(Boolean);
  if (missing.length) return `${missing.join(' and ')} not stated`;
  const unavailable = [axisValue(risk.likelihood, probability, probabilityLevels) === null && 'probability',
    axisValue(risk.impact, impact, impactLevels) === null && 'impact'].filter(Boolean);
  return `${unavailable.join(' and ')} not comparable on the selected axes`;
}
export function groupPositions(risks: RiskEntry[], probability: AxisMode, impact: AxisMode) {
  const groups = new Map<string, {x: number; y: number; risks: RiskEntry[]}>();
  risks.forEach(risk => {
    const point = positionOf(risk, probability, impact);
    if (!point) return;
    const key = `${point.x}:${point.y}`;
    const group = groups.get(key) ?? {...point, risks: []};
    group.risks.push(risk);
    groups.set(key, group);
  });
  return [...groups.values()];
}
