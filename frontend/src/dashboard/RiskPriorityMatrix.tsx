import {useEffect, useId, useMemo, useRef, useState, type CSSProperties} from 'react';
import {ArrowUpRight, CircleHelp, Crosshair, FileText, ShieldAlert} from 'lucide-react';
import type {DocumentationResult, RiskEntry} from '../intelligence/types';
import RiskAdditionalPlot from './RiskAdditionalPlots';
import RiskPointTooltip from './RiskPointTooltip';
import './riskInteraction.css';
import {riskSourceMetadata} from './riskSourceMetadata';
import RiskDetailsDialog from './RiskDetailsDialog';
import RiskEvidenceBoard, {SeverityBadge} from './RiskEvidenceBoard';
import {allAxisPairs, axisLabels, hasPosition, availableModes, defaultAxes, groupPositions, impactLevels, positionOf, positionReason, probabilityLevels, severityLevels, severityOf, stated, type AxisMode, type SeverityFilter} from './riskMatrixModel';
import {layoutRiskPoints, layoutRiskLabels} from './riskPointLayout';
import './riskMatrix.css';
import {canonicalRisks} from './canonicalRisks';

const scaleLabel = (mode: AxisMode) => mode === 'score5' ? 'Stated 1–5 scores' : mode === 'levels' ? 'Stated levels' : mode === 'words' ? 'Other stated words' : 'Stated percentages';
const ticks = (mode: AxisMode, levels: string[]) => mode === 'percent'
  ? [0, 25, 50, 75, 100].map(value => ({position: value, label: `${value}%`}))
  : axisLabels(mode, levels).map((label, i, all) => ({position: (i + .5) / all.length * 100, label:label === 'Moderate' ? 'Moderate / Medium' : label}));

export default function RiskPriorityMatrix({result, busy = false, stale = false, failed = false}: {
  result: DocumentationResult | null; busy?: boolean; stale?: boolean; failed?: boolean;
}) {
  const id = useId();
  const chart = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({width: 600, height: 250});
  const grouped = useMemo(() => canonicalRisks(result?.risks ?? []), [result]);
  const risks = grouped.risks;
  const allRecords = [...risks, ...grouped.observations];
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement|null>(null);
  const [inlineId, setInlineId] = useState<string|null>(null);
  const recordScroll = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement|null>(null);
  const inlineRisk = allRecords.find(risk => risk.id === inlineId);
  useEffect(() => {setInlineId(null);setHovered(null);setTooltipAnchor(null);}, [result]);
  useEffect(() => {
    if (!inlineId || !recordScroll.current) return;
    recordScroll.current.scrollTop = 0;
    recordScroll.current.querySelector<HTMLElement>('.rpm-inline-details')?.focus({preventScroll:true});
    if (window.matchMedia?.('(max-width: 1050px)').matches) recordScroll.current.scrollIntoView?.({block:'nearest',behavior:'instant'});
  }, [inlineId]);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [axes, setAxes] = useState<{probability: AxisMode; impact: AxisMode} | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ids: string[]; active: string} | null>(null);
  const defaults = useMemo(() => defaultAxes(risks), [risks]);
  const probabilityModes = availableModes(risks.map(r => r.likelihood), probabilityLevels);
  const impactModes = availableModes(risks.map(r => r.impact), impactLevels);
  const probability = axes && probabilityModes.includes(axes.probability) ? axes.probability : defaults.probability;
  const impact = axes && impactModes.includes(axes.impact) ? axes.impact : defaults.impact;
  const counts = severityLevels.map(level => ({level, count: risks.filter(r => severityOf(r.severity) === level).length}));
  const otherCount = risks.filter(r => !severityOf(r.severity)).length;
  const missingSeverity = risks.filter(r => !r.severity?.trim() || /^(not stated|unknown|not specified)$/i.test(r.severity.trim())).length;
  const visible = risks.filter(r => filter === 'all' || (filter === 'other' ? !severityOf(r.severity) : severityOf(r.severity) === filter));
  const groups = groupPositions(visible, probability, impact);
  const positioned = visible.filter(risk => positionOf(risk, probability, impact));
  const unpositioned = visible.filter(risk => !hasPosition(risk));
  const additional = allAxisPairs(visible).filter(group => group.probability !== probability || group.impact !== impact);
  useEffect(() => {
    const element = chart.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width && entry.contentRect.height) setSize({width:entry.contentRect.width,height:entry.contentRect.height});
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [positioned.length > 0, filter]);
  const layout = useMemo(() => layoutRiskPoints(risks, probability, impact, size.width, size.height), [risks, probability, impact, size]);
  const points = layoutRiskLabels(layout, size.width, size.height, risk => riskSourceMetadata(risk).sourceId ?? risk.id).filter(point => visible.some(risk => risk.id === point.risk.id));
  const offset = points.some(point => point.dx !== 0 || point.dy !== 0);
  const placed = risks.filter(hasPosition).length;
  const highCount = counts.filter(c => c.level === 'Critical' || c.level === 'High').reduce((sum, c) => sum + c.count, 0);
  const preview = visible.find(r => r.id === hovered);
  const selected = allRecords.find(r => r.id === selection?.active);
  const selectedRisks = allRecords.filter(r => selection?.ids.includes(r.id));
  const open = (records: RiskEntry[]) => {setHovered(null);setSelection({ids: records.map(r => r.id), active: records[0].id});};
  const changeFilter = (value: SeverityFilter) => {setFilter(value);setHovered(null);setTooltipAnchor(null);setInlineId(null);};
  const openInline = (risk: RiskEntry) => {opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setHovered(null);setTooltipAnchor(null);setInlineId(risk.id);};
  const closeInline = () => {setInlineId(null);opener.current?.focus({preventScroll:true});setHovered(null);setTooltipAnchor(null);};
  const inlineDetails = inlineRisk && <RiskDetailsDialog inline originals={grouped.originals.get(inlineRisk.id)} conflicts={grouped.conflicts.get(inlineRisk.id)} risks={[inlineRisk]} active={inlineRisk} evidence={result?.evidence??[]} stale={stale} onSelect={setInlineId} onClose={closeInline}/>;


  return <section className="risk-priority-matrix rpm-analytics" aria-labelledby={`${id}-title`} onKeyDown={event => {if (event.key === 'Escape') setHovered(null);}}>
    <div className="rpm-heading-row">
    <header className="rpm-header"><div><span className="section-overline"><Crosshair size={14}/>RISK INTELLIGENCE</span><h3 id={`${id}-title`}>Risk Priority Matrix</h3><p>{placed ? 'Probability × impact · positions stated by your sources.' : 'Your documented risks, with the evidence attached.'}</p></div><span className="rpm-live-label"><FileText size={14}/>{stale ? 'Previous source version' : busy ? 'Refreshing evidence' : failed ? 'Refresh unavailable' : result ? 'From the risk register' : 'Awaiting risk results'}</span></header>
    <div className="rpm-metrics" aria-label="Risk register summary">
      <div><strong>{result ? risks.length : '—'}</strong><span>Unique identified risks</span></div>
      <div><strong>{result ? highCount : '—'}</strong><span>Stated Critical / High</span></div>
      <div><strong>{result ? `${placed} / ${risks.length}` : '—'}</strong><span>Positioned across stated scales</span></div>
      <div><strong>{result ? missingSeverity : '—'}</strong><span>Severity not stated</span></div>
    </div>
    </div>
    {stale && <p className="rpm-caution">These retained results may be out of date. Counts and positions reflect the previous source version.</p>}
    {failed && <p className="rpm-caution">The latest risk-register refresh failed.{result ? ' Previous results remain available below.' : ' No risk counts are available.'} Use Retry below to try again.</p>}
    {!result ? <div className={`rpm-empty ${busy ? 'rpm-loading' : ''}`} role="status"><Crosshair size={27}/><h4>{busy ? 'Preparing the risk register…' : 'Risk results are not available yet'}</h4><p>Positions appear only when probability and impact are explicitly stated. Unspecified values stay unknown.</p></div>
      : !allRecords.length ? <div className="rpm-empty"><CircleHelp size={27}/><h4>No risk entries were established</h4><p>This is not evidence that the project has no risks.</p></div>
      : <>
        <div className="rpm-toolbar"><div className="rpm-filters" role="group" aria-label="Filter by stated severity">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => changeFilter('all')}>All <b>{risks.length}</b></button>
          {counts.map(({level, count}) => <button type="button" key={level} className={`rpm-${level.toLowerCase()}`} aria-pressed={filter === level} onClick={() => changeFilter(level)}><i aria-hidden="true"/>{level}<b>{count}</b></button>)}
          <button type="button" className="rpm-other" aria-pressed={filter === 'other'} onClick={() => changeFilter('other')}><i aria-hidden="true"/>Other / Not stated<b>{otherCount}</b></button>
        </div></div>
        {(probabilityModes.length > 1 || impactModes.length > 1) && <div className="rpm-axis-selectors">{probabilityModes.length > 1 && <label>Probability scale<select value={probability} onChange={e => {setAxes({probability: e.target.value as AxisMode, impact});setHovered(null);}}>{probabilityModes.map(mode => <option key={mode} value={mode}>{scaleLabel(mode)}</option>)}</select></label>}{impactModes.length > 1 && <label>Impact scale<select value={impact} onChange={e => {setAxes({probability, impact: e.target.value as AxisMode});setHovered(null);}}>{impactModes.map(mode => <option key={mode} value={mode}>{scaleLabel(mode)}</option>)}</select></label>}<p>All comparable records appear below. Other stated words and percentages use separate axes; they are never converted into High or Low.</p></div>}
        <p className="rpm-grouping-note">{risks.length} unique identified risks · {grouped.observations.length} additional extracted observations · {result.risks.length} returned entries.{grouped.conflicts.size > 0 && " Conflicting stated fields remain unpositioned or neutral; inspect original records for the conflicting values."}</p>
        {groups.length > 0 && <div className="rpm-body rpm-filter-surface" key={filter}>
          <div className="rpm-plot-and-key">
          <div className="rpm-chart-shell" onMouseLeave={() => {if (!document.activeElement?.closest('.rpm-chart-shell')) setHovered(null);}} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setHovered(null);}}>
            <span className="rpm-y-title">IMPACT</span>
            <div ref={chart} className="rpm-chart" style={{'--rpm-columns': probability === 'levels' ? 3 : 4} as CSSProperties} role="group" aria-label="Probability versus impact matrix" aria-describedby={`${id}-method`}>
              <div className="rpm-grid" aria-hidden="true"><span className="rpm-zone-label">Higher probability + impact ↗</span></div>
              {ticks(impact, impactLevels).map(tick => <span className="rpm-y-tick" key={tick.label} title={tick.label} style={{bottom:`${tick.position}%`}}>{tick.label === 'Moderate / Medium' ? <><span>Moderate</span><small>/ Medium</small></> : tick.label}</span>)}
              {ticks(probability, probabilityLevels).map(tick => <span className="rpm-x-tick" key={tick.label} title={tick.label} style={{left:`${tick.position}%`}}>{tick.label === 'Moderate / Medium' ? <><span>Moderate</span><small>/ Medium</small></> : tick.label}</span>)}
              <svg className="rpm-position-guides" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true"><g>{points.filter(point => point.dx || point.dy).map(point => <g key={point.risk.id}><line x1={point.x / 100 * size.width} y1={(100-point.y) / 100 * size.height} x2={point.px} y2={point.py}/><circle cx={point.x / 100 * size.width} cy={(100-point.y) / 100 * size.height} r="2"/></g>)}</g></svg>
              {points.map(({risk,x,y,dx,dy,labelX,labelY,labelWidth}, index) => <button type="button" className={`rpm-point rpm-${severityOf(risk.severity)?.toLowerCase() ?? 'other'} ${risk.id === hovered || risk.id === inlineId ? 'rpm-point-active' : ''}`} key={risk.id}
                data-risk-id={risk.id} data-true-probability={risk.likelihood} data-true-impact={risk.impact} data-offset={dx || dy ? 'true' : 'false'}
                style={{left:`${x}%`,bottom:`${y}%`,translate:`${dx}px ${dy}px`,'--reveal-delay':`${Math.min(index,6)*35}ms`} as CSSProperties}
                aria-label={`Open risk ${risk.id}: ${risk.title}; severity ${stated(risk.severity)}; probability ${risk.likelihood}; impact ${risk.impact}`}
                aria-controls={`${id}-records`} aria-pressed={inlineId === risk.id}
                aria-describedby={risk.id === hovered ? `${id}-tooltip` : undefined}
                onMouseEnter={event => {setHovered(risk.id);setTooltipAnchor(event.currentTarget);}} onMouseLeave={() => {setHovered(null);setTooltipAnchor(null);}} onFocus={event => {setHovered(risk.id);setTooltipAnchor(event.currentTarget);}} onBlur={() => {setHovered(null);setTooltipAnchor(null);}} onClick={() => openInline(risk)}>
                <span className="rpm-point-symbol" aria-hidden="true"/><span className="rpm-point-label" style={{left:`calc(50% + ${labelX}px)`,top:`calc(50% + ${labelY}px)`,width:labelWidth}}>{riskSourceMetadata(risk).sourceId??risk.id}</span>
              </button>)}
            </div>
            <p className="rpm-x-title">PROBABILITY <span>(source likelihood)</span><ArrowUpRight size={13}/></p>
            {preview && tooltipAnchor && <RiskPointTooltip risk={preview} anchor={tooltipAnchor} id={`${id}-tooltip`}/>}
          </div>
          <aside className="rpm-chart-key" aria-label="Stated severity legend"><h4>Severity</h4>{counts.map(({level}) => <span key={level} className={`rpm-key-item rpm-${level.toLowerCase()}`}><i aria-hidden="true"/>{level}</span>)}<span className="rpm-key-item rpm-other"><i aria-hidden="true"/>Other / Not stated</span><p>Source labels.<br/>No inferred ranking.</p></aside>
          </div>
          <div className="rpm-records"><div className="rpm-records-heading"><h4>Positioned risk records</h4><span role="status">{positioned.length} positioned · {unpositioned.length} in evidence view below</span></div>
            <div ref={recordScroll} id={`${id}-records`} className="rpm-record-scroll" role="region" aria-label="Positioned risk records" tabIndex={0}>
              {inlineDetails}
              {positioned.map(risk => {const placedRisk = positionOf(risk, probability, impact);return <button type="button" className={`rpm-record ${hovered === risk.id || inlineId === risk.id ? 'rpm-record-active' : ''}`} key={risk.id} aria-expanded={inlineId === risk.id} onClick={() => openInline(risk)} onMouseEnter={() => {if (placedRisk) setHovered(risk.id);}} onMouseLeave={() => setHovered(null)} onFocus={() => {if (placedRisk) setHovered(risk.id);}} onBlur={() => setHovered(null)} aria-label={`Review risk ${risk.id}: ${risk.title}`}>
                <div><code>{riskSourceMetadata(risk).sourceId??risk.id}</code><SeverityBadge value={risk.severity}/></div><strong>{riskSourceMetadata(risk).title??risk.title}</strong><span className="rpm-record-values">Probability: {stated(risk.likelihood)} · Impact: {stated(risk.impact)}</span><span className="rpm-record-owner">Owner: {stated(riskSourceMetadata(risk).owner)} · Due: {stated(riskSourceMetadata(risk).dueDate)}</span><small>{placedRisk ? <><Crosshair size={12}/>View evidence<ArrowUpRight size={12}/></> : <><CircleHelp size={12}/>Unpositioned · {positionReason(risk, probability, impact)}</>}</small>
              </button>;})}
            </div>
          </div>
        </div>}
        {additional.length > 0 && <div className="rpm-additional-scales">{additional.map(group=><RiskAdditionalPlot key={`${group.probability}-${group.impact}`} {...group} evidence={result.evidence} selectedId={inlineId} onOpen={openInline}/>)}</div>}
        {!groups.length && inlineDetails && <div className="rpm-records"><div ref={recordScroll} id={`${id}-records`} className="rpm-record-scroll" role="region" aria-label="Positioned risk records" tabIndex={0}>{inlineDetails}</div></div>}
        {inlineRisk && <span className="sr-only" role="status" aria-live="polite">Selected {riskSourceMetadata(inlineRisk).sourceId??inlineRisk.id}. Full details are in Positioned risk records.</span>}
        {offset && <p className="rpm-offset-note">Nodes are spaced for readability; guide lines show unchanged source positions. Select any risk for evidence.</p>}
        {unpositioned.length > 0 && <RiskEvidenceBoard risks={unpositioned} evidence={result.evidence} probability={probability} impact={impact} mixed={placed > 0} onOpen={risk => open([risk])}/>}
        {!visible.length && <p className="rpm-no-records" role="status">No returned entries match this severity.</p>}
        {grouped.observations.length > 0 && <details className="rpm-observations-disclosure"><summary><FileText size={15}/><span>Additional extracted observations <b>{grouped.observations.length}</b></span><span>Review evidence</span></summary><RiskEvidenceBoard observations risks={grouped.observations} evidence={result.evidence} probability={probability} impact={impact} mixed={true} onOpen={risk => open([risk])}/></details>}
        <footer className="rpm-footer" id={`${id}-method`}><ShieldAlert size={15}/><p>Source-ID grouping · All supporting evidence retained.</p><details><summary>How to read this view</summary><p>Counts group entries by explicitly documented Risk ID, not verified unique incidents. Additional observations stay separate and are not included in severity counts. Colours show stated severity only; no priority ranking is inferred. Matching source IDs combine supporting evidence; observations below have no unambiguous Risk ID. The upper-right shading is an axis guide, not a severity score.</p><p>Probability uses the existing likelihood field. Explicit Low / Moderate / Medium / High labels use the level axes, with Medium sharing the labeled Moderate / Medium category. Critical impact is preserved. Likely / Unlikely and Major / Minor use separate categorical axes. Explicit 0–100% values use percentage axes. Explicit n/5 values use separate 1–5 ordinal axes; they are not probability percentages. Level positions are ordered categories, not numeric scores. Descriptive text, ambiguous numbers and missing values stay unpositioned; the evidence view keeps each original record visible without assigning a position. Other severity wording stays neutral and unchanged.</p><p>Every comparable risk has its own node. Small screen-space offsets separate nearby nodes for readability; guide lines connect each displaced node to its unchanged source position. No offset is a different probability, impact, trend or risk relationship. Evidence cards have equal visual weight and retain the returned source order, not a risk ranking. Use Tab to inspect points or cards, Enter to open details and Escape to dismiss the tooltip or details. Selecting a graph point opens full details in the Positioned risk records panel.</p></details></footer>
      </>}
    {selected && selection && <RiskDetailsDialog originals={grouped.originals.get(selected.id)} conflicts={grouped.conflicts.get(selected.id)} risks={selectedRisks} active={selected} evidence={result?.evidence ?? []} stale={stale} onSelect={active => setSelection({...selection, active})} onClose={() => setSelection(null)}/>}
  </section>;
}
