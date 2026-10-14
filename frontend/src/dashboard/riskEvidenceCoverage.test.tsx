import {expect,test} from 'vitest';
import {fireEvent,render,screen,within} from '@testing-library/react';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import {riskSourceMetadata} from './riskSourceMetadata';
import type {RiskEntry,DocumentationResult} from '../intelligence/types';
const risk=(id:string,likelihood:string|null,impact:string|null,severity:string|null):RiskEntry=>({id,title:`Risk ${id}`,description:`Documented risk ${id}`,likelihood,impact,severity,status:'Open',mitigation:null,categories:['delivery_challenges'],references:[{evidence_id:`source-${id}`,quote:`Risk ID: ${id === 'unknown' ? 'unknown-risk' : id};`}]});
const result=(risks:RiskEntry[]):DocumentationResult=>({status:'partial',query:'Review the uploaded project documents.',generated_at:'2026-10-07T10:00:00Z',provider:'local',retrieved_count:1,evidence_limited:false,warnings:[],user_stories:[],action_items:[],risks,evidence:[]});

test('all nine rated records and all partial records stay visible without invented coordinates',()=>{
 const entries=[risk('R-01','High','High','Critical'),risk('R-02','Low','Critical','Critical'),risk('R-03','Moderate','High','High'),risk('R-04','High','Moderate','High'),risk('R-05','Medium','Moderate','Moderate'),risk('R-06','Moderate','Moderate','Moderate'),risk('R-07','Low','High','Moderate'),risk('R-08','Low','Low','Low'),risk('R-09','Moderate','High','High'),risk('P-only','High',null,null),risk('I-only',null,'Major',null),risk('unknown',null,null,null)];
 const before=JSON.stringify(entries);render(<RiskPriorityMatrix result={result(entries)}/>);
 expect(within(screen.getByRole('group',{name:'Probability versus impact matrix'})).getAllByRole('button')).toHaveLength(9);
 const evidence=screen.getByRole('region',{name:'Risk evidence records without established positions'});
 expect(within(evidence).getAllByRole('button')).toHaveLength(3);
 expect(screen.getByRole('region',{name:'Probability stated · impact not stated'})).toHaveTextContent('P-only');
 expect(screen.getByRole('region',{name:'Impact stated · probability not stated'})).toHaveTextContent('I-only');
 expect(within(screen.getByLabelText('Risk register summary')).getByText('9 / 12')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Other / Not stated 3'}));
 expect(within(evidence).getAllByRole('button')).toHaveLength(3);
 expect(JSON.stringify(entries)).toBe(before);
});

test('Likely, Unlikely, Major, Minor and percentage records all use their own literal scale',()=>{
 const entries=[risk('levels','High','High','Critical'),risk('words','Likely','Major','High'),risk('unlikely','Unlikely','Minor','Low'),risk('mixed','Likely','Moderate','Moderate'),risk('percent','70%','80%',null)];
 const {container}=render(<RiskPriorityMatrix result={result(entries)}/>);
 const nodes=container.querySelectorAll('button[data-risk-id]');
 expect(nodes).toHaveLength(5);expect(new Set([...nodes].map(n=>n.getAttribute('data-risk-id'))).size).toBe(5);
 for(const r of entries){const n=container.querySelector(`[data-risk-id="${r.id}"]`);expect(n).toHaveAttribute('data-true-probability',r.likelihood);expect(n).toHaveAttribute('data-true-impact',r.impact);}
 expect(screen.queryByRole('region',{name:'Risk evidence records without established positions'})).not.toBeInTheDocument();
});

test('source labels, owner and deadline come only from this returned record and do not overwrite its API identity',()=>{
 const r=risk('api-hash','High','High','Critical');r.references=[{evidence_id:'e1',quote:'Delivery challenge | Owner: Neha Rao; Risk ID: R-01; Risk Title: Retrieval regression; Probability: High; Impact: High; Severity: Critical; Status: Open; Due date: 2026-10-10.'}];
 const before=JSON.stringify(r);expect(riskSourceMetadata(r)).toEqual({sourceId:'R-01',title:'Retrieval regression',owner:'Neha Rao',dueDate:'2026-10-10',status:'Open'});
 render(<RiskPriorityMatrix result={result([r])}/>);fireEvent.focus(screen.getByRole('button',{name:/Open risk api-hash/}));
 const tip=screen.getByRole('tooltip');for(const value of ['R-01','Retrieval regression','Critical'])expect(tip).toHaveTextContent(value);
 expect(tip).not.toHaveTextContent('Neha Rao');fireEvent.click(screen.getByRole('button',{name:/Open risk api-hash/}));
 const panel=screen.getByRole('region',{name:'Risk details'});for(const value of ['Neha Rao','2026-10-10','Open'])expect(panel).toHaveTextContent(value);
 expect(JSON.stringify(r)).toBe(before);
});

test('ambiguous, missing and cross-risk source metadata remain unknown',()=>{
 const r=risk('hash',null,null,null);
 r.references=[{evidence_id:'a',quote:'Risk ID: R-01; Owner: Neha Rao; Due date: Not stated.'},{evidence_id:'b',quote:'Risk ID: R-01; Owner: Ravi Kumar; Due date: Not stated.'}];
 expect(riskSourceMetadata(r).owner).toBeNull();expect(riskSourceMetadata(r).dueDate).toBeNull();
 r.references=[{evidence_id:'a',quote:'Risk ID: R-01; Risk ID: R-02; Owner: Neha Rao; Due date: 2026-10-10.'}];
 expect(riskSourceMetadata(r).owner).toBeNull();expect(riskSourceMetadata(r).sourceId).toBeNull();
});
