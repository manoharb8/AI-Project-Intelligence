import {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {RiskEntry} from '../intelligence/types';
import {riskSourceMetadata} from './riskSourceMetadata';
import {SeverityBadge} from './RiskEvidenceBoard';

type Rect = {left:number;right:number;top:number;bottom:number};
/** Place outside the entire chart shell, including axes. Hide if no safe space exists. */
export function pointTooltipPosition(anchor:Rect, chart:Rect, width:number, height:number, viewport:{width:number;height:number}, otherCharts:Rect[] = []) {
  const gap=8, cx=(anchor.left+anchor.right)/2, cy=(anchor.top+anchor.bottom)/2;
  const x=Math.max(gap,Math.min(viewport.width-width-gap,cx-width/2));
  const y=Math.max(gap,Math.min(viewport.height-height-gap,cy-height/2));
  const candidates=[{left:x,top:chart.top-height-gap},{left:x,top:chart.bottom+gap},{left:chart.right+gap,top:y},{left:chart.left-width-gap,top:y}];
  return candidates.filter(p=>p.left>=gap&&p.top>=gap&&p.left+width<=viewport.width-gap&&p.top+height<=viewport.height-gap
    && otherCharts.every(c=>p.left+width<=c.left||p.left>=c.right||p.top+height<=c.top||p.top>=c.bottom))
    .sort((a,b)=>Math.hypot(a.left+width/2-cx,a.top+height/2-cy)-Math.hypot(b.left+width/2-cx,b.top+height/2-cy))[0]??null;
}

export default function RiskPointTooltip({risk,anchor,id}:{risk:RiskEntry;anchor:HTMLElement;id:string}) {
  const ref=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{left:number;top:number}|null>(null);
  const meta=riskSourceMetadata(risk);
  useLayoutEffect(()=>{
    const measure=()=>{
      const shell=anchor.closest('.rpm-chart-shell'), tip=ref.current;
      if(!shell||!tip||!anchor.isConnected){setPosition(null);return;}
      const a=anchor.getBoundingClientRect();
      if(a.bottom<0||a.top>window.innerHeight||a.right<0||a.left>window.innerWidth){setPosition(null);return;}
      const r=tip.getBoundingClientRect();
      const others=Array.from(anchor.closest('.risk-priority-matrix')?.querySelectorAll('.rpm-chart-shell')??[]).filter(c=>c!==shell).map(c=>c.getBoundingClientRect());
      setPosition(pointTooltipPosition(a,shell.getBoundingClientRect(),r.width,r.height,{width:window.innerWidth,height:window.innerHeight},others));
    };
    measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    if(ref.current)observer?.observe(ref.current);
    return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);observer?.disconnect();};
  },[anchor,risk]);
  return createPortal(<div ref={ref} id={id} role="tooltip" className="rpm-point-hint" style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}}>
    <div><code>{meta.sourceId??risk.id}</code><SeverityBadge value={risk.severity}/></div><strong>{meta.title??risk.title}</strong>
  </div>,document.body);
}
