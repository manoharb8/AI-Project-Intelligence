import {fireEvent,render,screen,within} from '@testing-library/react';
import {expect,test} from 'vitest';
import {pointTooltipPosition} from './RiskPointTooltip';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import sample from './__fixtures__/sampleRiskResult.json';
import type {DocumentationResult} from '../intelligence/types';

test.each([
  [1440,900,{left:180,right:1000,top:180,bottom:600}],
  [768,900,{left:64,right:700,top:220,bottom:650}],
  [360,780,{left:14,right:346,top:210,bottom:600}],
] as const)('compact hint stays outside chart and inside a %ipx viewport',(width,height,chart)=>{
  for(const x of [chart.left,chart.right])for(const y of [chart.top,chart.bottom]){
    const p=pointTooltipPosition({left:x-22,right:x+22,top:y-22,bottom:y+22},chart,220,80,{width,height});
    expect(p).not.toBeNull();if(!p)continue;
    expect(p.left).toBeGreaterThanOrEqual(8);expect(p.top).toBeGreaterThanOrEqual(8);
    expect(p.left+220).toBeLessThanOrEqual(width-8);expect(p.top+80).toBeLessThanOrEqual(height-8);
    expect(p.left+220<=chart.left||p.left>=chart.right||p.top+80<=chart.top||p.top>=chart.bottom).toBe(true);
  }
});
test('no safe perimeter space means no overlay rather than a clipped or obstructive hint',()=>{
  expect(pointTooltipPosition({left:140,right:180,top:240,bottom:280},{left:0,right:360,top:0,bottom:600},220,80,{width:360,height:600})).toBeNull();
});
test('point selection opens evidence in the rail, highlights exactly one risk, and filter changes dismiss it',()=>{
  const before=JSON.stringify(sample);const {container}=render(<RiskPriorityMatrix result={sample as DocumentationResult}/>);
  const points=[...container.querySelectorAll<HTMLButtonElement>('.rpm-point')];
  fireEvent.mouseEnter(points[0]);expect(screen.getByRole('tooltip')).toBeInTheDocument();
  fireEvent.mouseLeave(points[0]);expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.click(points[0]);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const rail=screen.getByRole('region',{name:'Positioned risk records'});
  expect(within(rail).getByRole('region',{name:'Risk details'})).toBeInTheDocument();
  expect(within(rail).getByText('Source evidence')).toBeInTheDocument();
  expect(points[0]).toHaveAttribute('aria-pressed','true');
  fireEvent.click(points[1]);expect(points[0]).toHaveAttribute('aria-pressed','false');expect(points[1]).toHaveAttribute('aria-pressed','true');
  expect(screen.getAllByRole('region',{name:'Risk details'})).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Low 1'}));
  expect(screen.queryByRole('region',{name:'Risk details'})).not.toBeInTheDocument();expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(JSON.stringify(sample)).toBe(before);
});
test('tap uses the same inline panel and close returns focus to the invoking point',()=>{
  const {container}=render(<RiskPriorityMatrix result={sample as DocumentationResult}/>);
  const point=container.querySelector<HTMLButtonElement>('.rpm-point')!;point.focus();
  fireEvent.pointerDown(point,{pointerType:'touch'});fireEvent.click(point);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Close risk details'}));expect(point).toHaveFocus();
});
