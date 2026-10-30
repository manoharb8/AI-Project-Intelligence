import {FileText} from 'lucide-react';
import type {RiskEntry} from '../intelligence/types';
import type {Evidence} from '../types';
import {SeverityBadge} from './RiskEvidenceBoard';
import {stated} from './riskMatrixModel';
import {riskSourceMetadata} from './riskSourceMetadata';
export default function RiskTooltip({risk,evidence,id,offset=false}:{risk:RiskEntry;evidence:Evidence[];id:string;offset?:boolean}) {
 const meta=riskSourceMetadata(risk),ref=risk.references[0],source=evidence.find(e=>e.id===ref?.evidence_id);
 return <div role="tooltip" id={id} className="rpm-tooltip"><div><code>{meta.sourceId??risk.id}</code><SeverityBadge value={risk.severity}/></div><strong>{meta.title??risk.title}</strong><dl>{[['Probability',risk.likelihood],['Impact',risk.impact],['Status',risk.status],['Owner',meta.owner],['Due date',meta.dueDate]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{stated(value)}</dd></div>)}</dl><p><FileText size={12}/>{source?`${source.filename} · ${source.location} · ${ref.evidence_id}`:ref?.evidence_id??'Source reference not available'}</p>{ref&&<blockquote>{ref.quote}</blockquote>}<small>{offset?'Visual offset only; these source values are unchanged. ':''}Open for the full record and all references.</small></div>;
}
