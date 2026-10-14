import {useEffect,useId,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {RiskEntry} from '../intelligence/types';
import type {Evidence} from '../types';
import {axisLabels,probabilityLevels,impactLevels,severityOf,stated,type AxisMode} from './riskMatrixModel';
import {layoutRiskPoints, layoutRiskLabels} from './riskPointLayout';
import {riskSourceMetadata} from './riskSourceMetadata';
import RiskPointTooltip from './RiskPointTooltip';

/** Separate axes prevent converting Likely into High, Major into High, or words into percentages. */
export default function RiskAdditionalPlot({risks,probability,impact,onOpen,selectedId}:{risks:RiskEntry[];probability:AxisMode;impact:AxisMode;evidence:Evidence[];selectedId?:string|null;onOpen:(risk:RiskEntry)=>void}) {
 const [anchor,setAnchor]=useState<HTMLElement|null>(null);
 const ref=useRef<HTMLDivElement>(null),id=useId();const [size,setSize]=useState({width:500,height:220}),[hovered,setHovered]=useState<string|null>(null);
 useEffect(()=>{if(!ref.current||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>{if(entry.contentRect.width)setSize({width:entry.contentRect.width,height:entry.contentRect.height});});observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const points=useMemo(()=>layoutRiskLabels(layoutRiskPoints(risks,probability,impact,size.width,size.height),size.width,size.height,risk=>riskSourceMetadata(risk).sourceId??risk.id),[risks,probability,impact,size]);
 const ticks=(mode:AxisMode,levels:string[])=>mode==='percent'?[0,25,50,75,100].map(n=>({label:`${n}%`,position:n})):axisLabels(mode,levels).map((label,i,all)=>({label:label==='Moderate'?'Moderate / Medium':label,position:(i+.5)/all.length*100}));
 const current=risks.find(r=>r.id===hovered);
 return <section className="rpm-additional-plot" aria-label="Additional explicitly stated risk scale"><h4>{risks.length} records on a separate stated scale</h4><p>No conversion between different source scales.</p><div className="rpm-chart-shell" onMouseLeave={()=>setHovered(null)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHovered(null);}} onKeyDown={e=>{if(e.key==='Escape')setHovered(null);}}><span className="rpm-y-title">IMPACT</span><div className="rpm-chart" ref={ref} role="group" aria-label="Probability versus impact on additional source scales">
  <div className="rpm-grid" aria-hidden="true"/>{ticks(impact,impactLevels).map(t=><span key={t.label} className="rpm-y-tick" style={{bottom:`${t.position}%`}}>{t.label}</span>)}{ticks(probability,probabilityLevels).map(t=><span key={t.label} className="rpm-x-tick" style={{left:`${t.position}%`}}>{t.label}</span>)}
  <svg className="rpm-position-guides" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">{points.filter(p=>p.dx||p.dy).map(p=><line key={p.risk.id} x1={p.x/100*size.width} y1={(100-p.y)/100*size.height} x2={p.px} y2={p.py}/>)}</svg>
  {points.map(({risk,x,y,dx,dy,labelX,labelY,labelWidth},index)=>{const meta=riskSourceMetadata(risk);return <button key={risk.id} className={`rpm-point rpm-${severityOf(risk.severity)?.toLowerCase()??'other'}`} aria-pressed={selectedId===risk.id} data-risk-id={risk.id} data-true-probability={risk.likelihood} data-true-impact={risk.impact} style={{left:`${x}%`,bottom:`${y}%`,translate:`${dx}px ${dy}px`,'--reveal-delay':`${Math.min(index,6)*35}ms`} as CSSProperties} aria-label={`Open risk ${meta.sourceId??risk.id}: ${meta.title??risk.title}; probability ${stated(risk.likelihood)}; impact ${stated(risk.impact)}`} aria-describedby={hovered===risk.id?id:undefined} onFocus={event=>{setHovered(risk.id);setAnchor(event.currentTarget);}} onMouseEnter={event=>{setHovered(risk.id);setAnchor(event.currentTarget);}} onMouseLeave={()=>setHovered(null)} onBlur={()=>setHovered(null)} onClick={()=>{setHovered(null);onOpen(risk);}}><span className="rpm-point-symbol" aria-hidden="true"/><span className="rpm-point-label" style={{left:`calc(50% + ${labelX}px)`,top:`calc(50% + ${labelY}px)`,width:labelWidth}}>{meta.sourceId??risk.id}</span></button>;})}
 </div><p className="rpm-x-title">PROBABILITY</p>{current&&anchor&&<RiskPointTooltip risk={current} anchor={anchor} id={id}/>}</div><p className="rpm-offset-note">Any displaced node is connected to its unchanged source position.</p></section>;
}
