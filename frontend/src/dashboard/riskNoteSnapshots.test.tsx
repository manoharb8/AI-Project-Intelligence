import {test, expect} from 'vitest';
import {canonicalRisks,documentedRiskId} from './canonicalRisks';
import {axisValue,positionOf,probabilityLevels,impactLevels} from './riskMatrixModel';
import type {RiskEntry} from '../intelligence/types';
const record=(date:string,status='Open'):RiskEntry=>({id:date+status,title:'Workspace data mixing',description:'Delivery challenge',categories:[],likelihood:'4/5 — High',impact:'5/5 — Very High',severity:'Critical',status,mitigation:'Complete isolation checks',references:[{evidence_id:date,quote:`Risk ID: R-02; Risk Title: Workspace data mixing; Owner: Ravi Kumar; As of: ${date}.`}]});
test('explicit fractions use their own ordinal scale without becoming percentages',()=>{
 expect(positionOf(record('2026-10-08'),'score5','score5')).toEqual({x:70,y:90});
 expect(axisValue('4/5 — High','percent',probabilityLevels)).toBeNull();
 for(const value of ['4','6/5','0/5','4/10','unknown','4/5 maybe']) expect(axisValue(value,'score5',impactLevels)).toBeNull();
});
test('latest dated status wins with all historical evidence retained regardless of order',()=>{
 const old=record('2026-10-05'),now=record('2026-10-08','In Progress');
 for(const entries of [[old,now],[now,old]]){
 const result=canonicalRisks(entries);expect(result.risks).toHaveLength(1);expect(result.risks[0].status).toBe('In Progress');expect(result.risks[0].references).toHaveLength(2);expect(result.conflicts.size).toBe(0);
 }
});
test('same-day and invalid-date contradictions stay unknown',()=>{
 for(const date of ['2026-10-08','2026-02-30']){
 const result=canonicalRisks([record(date),record('2026-10-08','Resolved')]);expect(result.risks[0].status).toBeNull();expect(result.conflicts.size).toBe(1);
 }
});
test('linked risk on a blocker is an observation, not a separate risk record',()=>{
 expect(documentedRiskId({...record('2026-10-08'),references:[{evidence_id:'e',quote:'Blocker B-03: checklist unavailable; Linked risk: R-07; Status: Open.'}]})).toBeNull();
});

import {render,screen,within} from '@testing-library/react';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import sample from './fixtures/meetingNoteRiskResult.json';
import type {DocumentationResult} from '../intelligence/types';
const actual=sample as DocumentationResult;
test('real three-note API output groups into five positioned risks and retains observations',()=>{
 const grouped=canonicalRisks(actual.risks);
 expect(grouped.risks.map(documentedRiskId).sort()).toEqual(['R-01','R-02','R-03','R-04','R-05']);
 expect(grouped.observations).toHaveLength(2);
 for(const risk of grouped.risks){expect(positionOf(risk,'score5','score5')).not.toBeNull();expect(risk.references).toHaveLength(3);}
 expect(grouped.risks.find(r=>documentedRiskId(r)==='R-01')!.status).toBe('In Progress');
 render(<RiskPriorityMatrix result={actual}/>);
 expect(within(screen.getByLabelText('Risk register summary')).getByText('5 / 5')).toBeInTheDocument();
 expect(within(screen.getByRole('group',{name:'Probability versus impact matrix'})).getAllByRole('button')).toHaveLength(5);
 expect(screen.getByRole('button',{name:'Critical 1'})).toBeInTheDocument();
});
