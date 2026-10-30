import type {RiskEntry} from '../intelligence/types';

/** Display-only literal fields from this returned record's own supporting quotes.
 * Never read another record, infer an owner/date, or alter the API identity. */
export function riskSourceMetadata(risk: RiskEntry) {
  const quotes = [...new Set(risk.references.map(ref=>ref.quote))];
  const get = (label:string) => {
    const values = quotes.flatMap(quote=>{
      if(new Set(quote.match(/\bR(?:ISK)?[- ]?\d+\b/gi)??[]).size > 1)return [];
      const regex=new RegExp('(?:^|[;.|]\\s*)'+label+'\\s*:\\s*(.*?)(?=;|\\s*\\|\\s*|\\.\\s+[A-Za-z][A-Za-z ]*:|$)','gi');
      return [...quote.matchAll(regex)].map(match=>match[1].trim().replace(/\.$/,''));
    });
    const unique=[...new Set(values)];
    return unique.length===1&&!/^(not stated|unknown|not confirmed|unassigned|tbd|n\/?a)$/i.test(unique[0])?unique[0]:null;
  };
  return {sourceId:get('Risk ID') ?? documentedRiskId(risk),title:get('Risk Title'),owner:get('Owner'),dueDate:get('Due date'),status:risk.status};
}

/** Presentation grouping only. API IDs are never assumed to be documented Risk IDs. */
export function documentedRiskId(risk: RiskEntry): string | null {
  const ids = new Set<string>();
  for (const {quote} of risk.references) {
    for (const match of quote.matchAll(/\bRisk\s+ID\s*:\s*([A-Za-z0-9][A-Za-z0-9_-]*)/gi)) {
      if (!/^(not|unknown|none|tbd)$/i.test(match[1])) ids.add(match[1].toUpperCase());
    }
    // A link on a blocker/action is not the identity of a risk record.
    const identityText = quote.replace(/\bLinked risk:\s*R-\d+\b/gi, '');
    for (const match of identityText.matchAll(/\bR-\d+\b/gi)) ids.add(match[0].toUpperCase());
  }
  return ids.size === 1 ? [...ids][0] : null;
}
