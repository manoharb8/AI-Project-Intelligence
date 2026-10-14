import type {RiskEntry} from '../intelligence/types';
import {riskSourceMetadata, documentedRiskId} from './riskSourceMetadata';

export {documentedRiskId} from './riskSourceMetadata';

const unknown = (value: string | null) => !value?.trim() || /^(not stated|unknown|not specified|n\/a)$/i.test(value.trim());
export function canonicalRisks(entries: RiskEntry[]) {
  const groups = new Map<string, RiskEntry[]>(), observations: RiskEntry[] = [];
  for (const risk of entries) {
    const id = documentedRiskId(risk);
    if (id) groups.set(id, [...(groups.get(id) ?? []), risk]);
    else observations.push(risk);
  }
  const originals = new Map<string, RiskEntry[]>(), conflicts = new Map<string, string[]>();
  const risks = [...groups].map(([, records]) => {
    // Only explicit, valid snapshot dates establish chronology; upload order never does.
    const dated = records.map(record => ({record, date: snapshotDate(record)}));
    const latest = dated.every(entry => entry.date !== null) ? dated.reduce((a,b) => a.date! > b.date! ? a : b).date : null;
    const current = latest ? dated.filter(entry => entry.date === latest).map(entry => entry.record) : records;
    const first = current[0], disputed: string[] = [];
    const field = (key: 'likelihood'|'impact'|'severity'|'status'|'mitigation') => {
      const values = current.map(r => r[key]).filter((v): v is string => !unknown(v));
      const unique = [...new Map(values.map(v => [v.trim().toLowerCase(), v])).values()];
      if (unique.length > 1) disputed.push(key);
      return unique.length === 1 ? unique[0] : null;
    };
    const references = [...new Map(records.flatMap(r => r.references).map(ref => [JSON.stringify([ref.evidence_id, ref.quote]), {...ref}])).values()];
    const grouped: RiskEntry = {...first, references, categories: [...new Set(records.flatMap(r => r.categories))], likelihood: field('likelihood'), impact: field('impact'), severity: field('severity'), status: field('status'), mitigation: field('mitigation')};
    grouped.title = riskSourceMetadata(grouped).title ?? first.title;
    originals.set(first.id, records);
    if (disputed.length) conflicts.set(first.id, disputed);
    return grouped;
  });
  return {risks, observations, originals, conflicts};
}

function snapshotDate(record: RiskEntry): string | null {
  const dates = [...new Set(record.references.flatMap(ref => [...ref.quote.matchAll(/(?:^|;)\s*As of:\s*(\d{4}-\d{2}-\d{2})(?=[;.]|$)/gi)].map(m => m[1])))];
  const date = dates[0];
  if (dates.length !== 1 || !date) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null;
}
