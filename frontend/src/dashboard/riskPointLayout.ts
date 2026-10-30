import type {RiskEntry} from '../intelligence/types';
import {positionOf, type AxisMode} from './riskMatrixModel';

/** Screen-space offsets only. Source coordinates and risk records never change. */
export function layoutRiskPoints(risks: RiskEntry[], probability: AxisMode, impact: AxisMode, width: number, height: number) {
  const points: {risk: RiskEntry; x: number; y: number; dx: number; dy: number; px: number; py: number}[] = [];
  for (const risk of risks) {
    const point = positionOf(risk, probability, impact);
    if (!point) continue;
    const px = point.x / 100 * width, py = (100 - point.y) / 100 * height;
    const offsets = [{dx: 0, dy: 0}];
    // Nearby nodes separate locally, never becoming aggregate cluster markers.
    for (const radius of [42, 60, 78, 96]) {
      for (let i = 0; i < 12; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 6;
        offsets.push({dx: Math.round(Math.cos(angle) * radius), dy: Math.round(Math.sin(angle) * radius)});
      }
    }
    const inside = ({dx,dy}: {dx:number;dy:number}) => px+dx >= 0 && px+dx <= width && py+dy >= 0 && py+dy <= height;
    const clearance = ({dx,dy}: {dx:number;dy:number}) => Math.min(Infinity, ...points.map(p => Math.hypot((px+dx-p.px)/1.45,py+dy-p.py)));
    const candidates = offsets.filter(inside);
    const offset = candidates.find(candidate => clearance(candidate) >= 41)
      ?? [...candidates].sort((a,b) => clearance(b)-clearance(a))[0] ?? offsets[0];
    points.push({risk,...point,...offset,px:px+offset.dx,py:py+offset.dy});
  }
  return points;
}

/** Place single-line label rectangles in chart pixels, independently of source coordinates. */
export function layoutRiskLabels(points: ReturnType<typeof layoutRiskPoints>, width: number, height: number, label: (risk: RiskEntry) => string) {
  const boxes: {left:number;top:number;width:number;height:number}[] = [];
  return points.map(point => {
    const w = Math.min(120, Math.max(38, label(point.risk).length * 6.5 + 10), width - 4), h = 20;
    const offsets = [[12,-10],[-w-12,-10],[-w/2,-32],[-w/2,12],[12,-32],[-w-12,-32],[12,12],[-w-12,12]];
    const candidates = offsets.map(([x,y]) => ({left:Math.max(2,Math.min(width-w-2,point.px+x)),top:Math.max(2,Math.min(height-h-2,point.py+y)),width:w,height:h}));
    const overlap=(a:typeof boxes[number],b:typeof boxes[number]) => Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
    const penalty=(b:typeof boxes[number]) => boxes.reduce((sum,other)=>sum+overlap(b,other),0)+points.reduce((sum,p)=>sum+overlap(b,{left:p.px-10,top:p.py-10,width:20,height:20})*2,0);
    const best=candidates.reduce((a,b)=>penalty(b)<penalty(a)?b:a);
    boxes.push(best);
    return {...point,labelX:best.left-point.px,labelY:best.top-point.py,labelWidth:w};
  });
}
