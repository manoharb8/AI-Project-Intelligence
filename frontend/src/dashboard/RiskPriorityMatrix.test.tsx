import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import {layoutRiskPoints} from './riskPointLayout';
import {axisValue, defaultAxes, groupPositions, impactLevels, positionOf, probabilityLevels, severityOf} from './riskMatrixModel';
import type {DocumentationResult, RiskEntry} from '../intelligence/types';

const risk = (changes: Partial<RiskEntry> = {}): RiskEntry => ({id:'risk-source-id',title:'Approval delay',description:'Approval delay is documented.',categories:['schedule_risks'],impact:'High',likelihood:'High',severity:'Critical',status:null,mitigation:null,...changes,references:changes.references ?? [{evidence_id:'source-1',quote:'Approval delay is documented.'},{evidence_id:'identity',quote:`Risk ID: ${changes.id === 'unknown' ? 'unknown-risk' : changes.id ?? 'risk-source-id'};`}]});
const result = (risks: RiskEntry[]): DocumentationResult => ({status:'partial',query:'Review risks',generated_at:'2026-10-06T12:00:00Z',provider:'local',retrieved_count:1,evidence_limited:false,warnings:[],user_stories:[],action_items:[],risks,evidence:[{id:'source-1',document_id:'doc-1',filename:'sprint.txt',document_type:'txt',chunk_number:0,location:'Text section 1',text:'Approval delay is documented.',similarity:.7}]});

describe('faithful matrix positions', () => {
  test('does not infer coordinates or severity from descriptive evidence or bare numbers', () => {
    for (const value of [null,'','Not stated','Unknown','integration testing cannot start','0.8','4/5','High risk','50–70%','110%','-2%']) {
      expect(axisValue(value,'levels',probabilityLevels)).toBeNull();
      expect(axisValue(value,'percent',probabilityLevels)).toBeNull();
    }
    expect(positionOf(risk({impact:null,severity:'Critical'}),'levels','levels')).toBeNull();
    expect(severityOf('Medium')).toBeNull();expect(severityOf('unknown')).toBeNull();
  });
  test('explicit Medium uses the labeled Moderate / Medium category; percentages preserve zero and 100', () => {
    expect(axisValue('Medium','levels',probabilityLevels)).toBe(axisValue('Moderate','levels',probabilityLevels));
    expect(axisValue('Likely','levels',probabilityLevels)).toBeNull();
    expect(axisValue('Likely','words',probabilityLevels)).toBe(75);
    expect(axisValue('Major','words',impactLevels)).toBe(75);
    expect(axisValue(' high ','levels',probabilityLevels)).toBeCloseTo(83.3333,3);
    expect(axisValue('High','levels',impactLevels)).toBe(62.5);
    expect(axisValue('0%','percent',probabilityLevels)).toBe(0);
    expect(axisValue('100 %','percent',probabilityLevels)).toBe(100);
    expect(axisValue('25.5%','percent',probabilityLevels)).toBe(25.5);
    expect(severityOf(' CRITICAL ')).toBe('Critical');
  });
  test('mixed scales are never silently converted; default displays most comparable entries', () => {
    const entries = [risk(),risk({id:'b',likelihood:'50%'}),risk({id:'c',likelihood:'20%'})];
    expect(defaultAxes(entries)).toEqual({probability:'percent',impact:'levels',count:2});
    expect(positionOf(entries[0],'percent','levels')).toBeNull();
    expect(positionOf(entries[1],'levels','levels')).toBeNull();
  });
  test('coincident entries keep exact coordinates and originals unchanged', () => {
    const entries = [risk(),risk({id:'second',severity:'Low'})];const original=JSON.stringify(entries);
    const groups=groupPositions(entries,'levels','levels');
    expect(groups).toHaveLength(1);expect(groups[0].risks.map(r=>r.id)).toEqual(['risk-source-id','second']);
    expect(groups[0].x).toBeCloseTo(83.3333,3);expect(groups[0].y).toBe(62.5);
    expect(JSON.stringify(entries)).toBe(original);
  });
});

const originalShow = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function() {this.setAttribute('open','');};
  HTMLDialogElement.prototype.close = function() {this.removeAttribute('open');};
});
afterAll(() => {HTMLDialogElement.prototype.showModal=originalShow;HTMLDialogElement.prototype.close=originalClose;});

test('unavailable, loading and empty results do not claim there are no risks', () => {
  const {rerender}=render(<RiskPriorityMatrix result={null} busy/>);
  expect(screen.getByText('Preparing the risk register…')).toBeInTheDocument();
  expect(within(screen.getByLabelText('Risk register summary')).getAllByText('—')).toHaveLength(4);
  rerender(<RiskPriorityMatrix result={result([])}/>);
  expect(screen.getByText('This is not evidence that the project has no risks.')).toBeInTheDocument();
  expect(screen.queryByRole('group',{name:'Probability versus impact matrix'})).not.toBeInTheDocument();
});
test('counts exact register entries and unknowns, retaining all unspecified records outside graph', () => {
  render(<RiskPriorityMatrix result={result([risk(),risk({id:'unknown',severity:null,impact:'Integration cannot start',likelihood:null}),risk({id:'medium',severity:'Medium',impact:null})])}/>);
  const stats=screen.getByLabelText('Risk register summary');
  expect(within(stats).getByText('3')).toBeInTheDocument();expect(within(stats).getByText('1 / 3')).toBeInTheDocument();
  const list=screen.getByRole('region',{name:'Risk evidence records without established positions'});
  expect(within(list).getAllByRole('button')).toHaveLength(2);
  expect(within(screen.getByRole('region',{name:'Positioned risk records'})).getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('button',{name:'Other / Not stated 2'})).toBeInTheDocument();
  expect(screen.getByText('Unpositioned · probability not stated')).toBeInTheDocument();
  expect(screen.getByText('Probability: Not stated · Impact: Integration cannot start')).toBeInTheDocument();
  expect(screen.getAllByText('Medium')).toHaveLength(1);
});
test('severity filters update chart and list together without changing full-register counts', () => {
  render(<RiskPriorityMatrix result={result([risk(),risk({id:'low',severity:'Low',likelihood:'Low',impact:'Low'})])}/>);
  fireEvent.click(screen.getByRole('button',{name:'Low 1'}));
  expect(screen.getByRole('button',{name:'Low 1'})).toHaveAttribute('aria-pressed','true');
  expect(within(screen.getByRole('region',{name:'Positioned risk records'})).getAllByRole('button')).toHaveLength(1);
  expect(screen.queryByRole('button',{name:/Open risk risk-source-id/})).not.toBeInTheDocument();
  expect(within(screen.getByLabelText('Risk register summary')).getByText('2 / 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'High 0'}));
  expect(screen.getByText('No returned entries match this severity.')).toBeInTheDocument();
});
test('keyboard focus exposes exact tooltip and Escape dismisses it', () => {
  render(<RiskPriorityMatrix result={result([risk()])}/>);
  const point=screen.getByRole('button',{name:/Open risk risk-source-id/});fireEvent.focus(point);
  const tip=screen.getByRole('tooltip');expect(tip).toHaveTextContent('risk-source-id');expect(tip).toHaveTextContent('Critical');expect(tip).toHaveTextContent('Approval delay');expect(tip).not.toHaveTextContent('sprint.txt');
  fireEvent.keyDown(point,{key:'Escape'});expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
test('opens existing complete detail fields and source quotation; close restores focus', () => {
  render(<RiskPriorityMatrix result={result([risk({mitigation:'Request approval.'})])}/>);
  const row=screen.getByRole('button',{name:/Review risk risk-source-id/});row.focus();fireEvent.click(row);
  const dialog=screen.getByRole('region',{name:'Risk details'});
  expect(within(dialog).getByText('Request approval.')).toBeInTheDocument();expect(within(dialog).getAllByText('Not stated').length).toBeGreaterThan(0);
  fireEvent.click(within(dialog).getByText('View source',{selector:'summary'})); fireEvent.click(within(dialog).getByText('sprint.txt · Text section 1'));
  expect(within(dialog).getAllByText('Approval delay is documented.',{selector:'blockquote'})[0]).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button',{name:'Close risk details'}));expect(row).toHaveFocus();
});
test('coincident risks have individual nodes and retain their exact values and details', () => {
  const entries=[risk(),risk({id:'second-id',title:'Second record',severity:'Low'})];
  const original=JSON.stringify(entries);
  render(<RiskPriorityMatrix result={result(entries)}/>);
  const chart=screen.getByRole('group',{name:'Probability versus impact matrix'});
  expect(within(chart).getAllByRole('button')).toHaveLength(2);
  const second=within(chart).getByRole('button',{name:/Open risk second-id/});
  expect(second).toHaveAttribute('data-offset','true');
  expect(second).toHaveAttribute('data-true-probability','High');
  expect(second).toHaveAttribute('data-true-impact','High');
  expect(second).toHaveStyle({bottom:'62.5%'});
  fireEvent.focus(second);expect(screen.getByRole('tooltip')).toHaveTextContent('Second record');
  fireEvent.click(second);const dialog=screen.getByRole('region',{name:'Risk details'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(second).toHaveAttribute('aria-pressed','true');
  expect(within(dialog).getByRole('heading',{name:'Second record'})).toBeInTheDocument();
  expect(JSON.stringify(entries)).toBe(original);
  fireEvent.keyDown(dialog,{key:'Escape'});expect(screen.queryByRole('region',{name:'Risk details'})).not.toBeInTheDocument();
});
test('all eight coincident risks have distinct nearby screen positions and keyboard nodes', () => {
  const entries=Array.from({length:8},(_,i)=>risk({id:`R-${i+1}`}));
  const points=layoutRiskPoints(entries,'levels','levels',600,250);
  expect(points).toHaveLength(8);expect(new Set(points.map(p=>`${p.dx}:${p.dy}`)).size).toBe(8);
  points.forEach(p=>{expect(p.x).toBeCloseTo(83.3333,3);expect(p.y).toBe(62.5);expect(Math.hypot(p.dx,p.dy)).toBeLessThan(98);});
  render(<RiskPriorityMatrix result={result(entries)}/>);
  const chart=screen.getByRole('group',{name:'Probability versus impact matrix'});
  expect(within(chart).getAllByRole('button')).toHaveLength(8);
  entries.forEach(r=>expect(within(chart).getByText(r.id)).toBeVisible());
});
test('nearby percentage values are separated visually without rounding or replacing source positions', () => {
  const entries=[risk({id:'a',likelihood:'70%'}),risk({id:'b',likelihood:'71%'})];
  const points=layoutRiskPoints(entries,'percent','levels',600,250);
  expect(points.map(p=>p.x)).toEqual([70,71]);expect(points[1].dx||points[1].dy).not.toBe(0);
});
test('mixed-scale selector keeps every comparable record plotted on its own stated axes', () => {
  render(<RiskPriorityMatrix result={result([risk(),risk({id:'percent',likelihood:'0%',impact:'100%'})])}/>);
  fireEvent.change(screen.getByLabelText('Probability scale'),{target:{value:'percent'}});
  fireEvent.change(screen.getByLabelText('Impact scale'),{target:{value:'percent'}});
  const point=screen.getByRole('button',{name:/Open risk percent/});expect(point).toHaveStyle({left:'0%',bottom:'100%'});
  expect(screen.getByRole('button',{name:/Open risk risk-source-id/})).toBeVisible();
  expect(screen.getByRole('group',{name:'Probability versus impact on additional source scales'})).toBeInTheDocument();
  expect(screen.queryByRole('region',{name:'Risk evidence records without established positions'})).not.toBeInTheDocument();
});
test('retained stale/error results remain inspectable and changing results removes obsolete details', () => {
  const {rerender}=render(<RiskPriorityMatrix result={result([risk()])} stale failed/>);
  expect(screen.getByText(/These retained results may be out of date/)).toBeInTheDocument();
  expect(screen.getByText(/latest risk-register refresh failed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Review risk risk-source-id/}));
  expect(screen.getByRole('region',{name:'Risk details'})).toHaveTextContent('Previous source version');
  rerender(<RiskPriorityMatrix result={result([risk({id:'new-record'})])}/>);
  expect(screen.queryByRole('region',{name:'Risk details'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Review risk risk-source-id/})).not.toBeInTheDocument();
});

test('all unpositioned risks replace the grid with equal-weight evidence cards in original order', () => {
  const entries = Array.from({length:8},(_,index)=>risk({id:`original-${8-index}`,title:`Actual returned risk ${index}`,severity:null,likelihood:null,impact:null}));
  render(<RiskPriorityMatrix result={result(entries)}/>);
  expect(screen.queryByRole('group',{name:'Probability versus impact matrix'})).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Position not established from source evidence'})).toBeInTheDocument();
  const board=screen.getByRole('region',{name:'Risk evidence records without established positions'});
  expect(within(board).getAllByRole('button').map(button=>button.getAttribute('aria-label'))).toEqual(entries.map(r=>`Review risk ${r.id}: ${r.title}`));
  expect(within(board).queryByText('sprint.txt · Text section 1')).not.toBeInTheDocument(); expect(within(board).getAllByText('View source')).toHaveLength(8);
  expect(screen.getByText('Source order within each evidence group · equal visual weight · no priority ranking inferred')).toBeInTheDocument();
});

test('mixed evidence keeps genuine coordinates and shows every remaining record in the fallback', () => {
  render(<RiskPriorityMatrix result={result([risk(),risk({id:'no-probability',likelihood:null}),risk({id:'no-impact',impact:null}),risk({id:'descriptive',impact:'Testing cannot start'})])}/>);
  expect(screen.getByRole('button',{name:/Open risk risk-source-id:/})).toHaveStyle({left:'83.33333333333334%',bottom:'62.5%'});
  expect(within(screen.getByRole('region',{name:'Positioned risk records'})).getAllByRole('button')).toHaveLength(1);
  expect(within(screen.getByRole('region',{name:'Risk evidence records without established positions'})).getAllByRole('button')).toHaveLength(3);
  expect(screen.queryByText('Coordinates not established')).not.toBeInTheDocument();
});

test('evidence cards expose the original quotation on focus and dismiss preview with Escape', () => {
  render(<RiskPriorityMatrix result={result([risk({impact:null,likelihood:null,severity:null})])}/>);
  const card=screen.getByRole('button',{name:/Review risk risk-source-id:/});fireEvent.focus(card);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Approval delay is documented.');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Probability: Not stated');
  fireEvent.keyDown(card,{key:'Escape'});expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  card.focus();fireEvent.click(card);
  expect(screen.getByRole('dialog',{name:'Risk details'})).toHaveTextContent('Not stated');
  fireEvent.click(screen.getByRole('button',{name:'Close risk details'}));expect(card).toHaveFocus();
});

test('filters remain available in the fallback and never fabricate entries for an empty severity', () => {
  render(<RiskPriorityMatrix result={result([risk({id:'known-high',impact:null,severity:'High'}),risk({id:'unknown',impact:null,severity:null})])}/>);
  fireEvent.click(screen.getByRole('button',{name:'High 1'}));
  expect(screen.getByRole('button',{name:/Review risk known-high:/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Review risk unknown:/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Critical 0'}));
  expect(screen.getByRole('status')).toHaveTextContent('No returned entries match this severity.');
  expect(screen.queryByRole('group',{name:'Probability versus impact matrix'})).not.toBeInTheDocument();
});
