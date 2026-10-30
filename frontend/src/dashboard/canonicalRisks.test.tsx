import {expect,test} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {canonicalRisks,documentedRiskId} from './canonicalRisks';
import {layoutRiskPoints,layoutRiskLabels} from './riskPointLayout';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import type {DocumentationResult} from '../intelligence/types';
import source from './__fixtures__/sampleRiskResult.json';
const result=source as DocumentationResult;

test('actual six-document sample returns nine identified risks and ten separate observations',()=>{
 const before=JSON.stringify(result),grouped=canonicalRisks(result.risks);
 expect(result.risks).toHaveLength(19);expect(grouped.risks).toHaveLength(9);expect(grouped.observations).toHaveLength(10);
 expect(grouped.risks.map(documentedRiskId).sort()).toEqual(Array.from({length:9},(_,i)=>`R-0${i+1}`));
 const {container}=render(<RiskPriorityMatrix result={result}/>);
 expect(container.querySelectorAll('button[data-risk-id]')).toHaveLength(9);
 const disclosure=container.querySelector('.rpm-observations-disclosure') as HTMLDetailsElement;
 expect(disclosure.open).toBe(false);fireEvent.click(disclosure.querySelector('summary')!);
 expect(disclosure.open).toBe(true);
 expect(within(screen.getByRole('region',{name:'Additional evidence-only observations'})).getAllByRole('button')).toHaveLength(10);
 for(const [severity,count] of [['Critical',2],['High',3],['Moderate',3],['Low',1]] as const){
   fireEvent.click(screen.getByRole('button',{name:`${severity} ${count}`}));
   expect(container.querySelectorAll('button[data-risk-id]')).toHaveLength(count);
   expect(within(screen.getByRole('region',{name:'Additional evidence-only observations'})).getAllByRole('button')).toHaveLength(10);
 }
 expect(JSON.stringify(result)).toBe(before);
});

test('same explicit ID merges references but not unrelated IDs or ambiguous cross-risk observations',()=>{
 const first=canonicalRisks(result.risks).risks[0];
 const duplicate={...first,id:'extra-passage',references:[...first.references,{evidence_id:'another',quote:`${documentedRiskId(first)} is still under review.`}]};
 const ambiguous={...first,id:'ambiguous',references:[{evidence_id:'multi',quote:'R-01 and R-02 require review.'}]};
 const grouped=canonicalRisks([...result.risks,duplicate,ambiguous]);
 expect(grouped.risks).toHaveLength(9);expect(grouped.observations).toHaveLength(11);
 expect(grouped.originals.get(first.id)).toHaveLength(2);
 expect(grouped.risks[0].references).toHaveLength(first.references.length+1);
 expect(grouped.risks[0].likelihood).toBe(first.likelihood);
});

test('conflicting fields are disclosed without selecting a rating, and originals remain available',()=>{
 const first=canonicalRisks(result.risks).risks[0];
 const conflicting={...first,id:'conflict',likelihood:'Low'};
 const grouped=canonicalRisks([first,conflicting]);
 expect(grouped.risks).toHaveLength(1);expect(grouped.risks[0].likelihood).toBeNull();expect(grouped.conflicts.get(first.id)).toContain('likelihood');
 expect(grouped.originals.get(first.id)).toEqual([first,conflicting]);
});

test('generated API IDs alone cannot establish source identities even with complete ratings',()=>{
 const first=canonicalRisks(result.risks).risks[0];
 expect(canonicalRisks([{...first,id:'R-01',references:[]}]).risks).toHaveLength(0);
 expect(documentedRiskId({...first,references:[{evidence_id:'natural',quote:'The R-09 risk remains open.'}]})).toBe('R-09');
});

test.each([[180,230],[260,230],[450,230],[800,230],[170,320],[210,320],[330,300],[510,330],[720,330]])('nine sample labels fit a %ipx by %ipx plot without crossing axes or other labels',(width,height)=>{
 const risks=canonicalRisks(result.risks).risks;
 const points=layoutRiskPoints(risks,'levels','levels',width,height);
 const labels=layoutRiskLabels(points,width,height,r=>documentedRiskId(r)!);
 const boxes=labels.map(p=>({x:p.px+p.labelX,y:p.py+p.labelY,w:p.labelWidth,h:20}));
 for(const [i,b] of boxes.entries()){
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.w).toBeLessThanOrEqual(width);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.h).toBeLessThanOrEqual(height);
  for(const point of points)expect(Math.max(0,Math.min(b.x+b.w,point.px+7)-Math.max(b.x,point.px-7))*Math.max(0,Math.min(b.y+b.h,point.py+7)-Math.max(b.y,point.py-7))).toBe(0);
  for(const c of boxes.slice(i+1))expect(Math.max(0,Math.min(b.x+b.w,c.x+c.w)-Math.max(b.x,c.x))*Math.max(0,Math.min(b.y+b.h,c.y+c.h)-Math.max(b.y,c.y))).toBe(0);
 }
 expect(labels.map(p=>[p.x,p.y])).toEqual(points.map(p=>[p.x,p.y]));
});
