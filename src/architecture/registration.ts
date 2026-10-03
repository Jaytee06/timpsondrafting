export type Point2 = [number, number];
export type ControlPoint = { id: string; drawing: Point2; building: Point2 };
export type Registration = { scale: number; angle: number; translation: Point2; residuals: { id: string; metres: number }[]; rms: number; max: number };
export function transformPoint(p: Point2, r: Pick<Registration, 'scale' | 'angle' | 'translation'>): Point2 {
  const c = Math.cos(r.angle), s = Math.sin(r.angle);
  return [r.scale * (c*p[0]-s*p[1])+r.translation[0],r.scale*(s*p[0]+c*p[1])+r.translation[1]];
}
/** Least-squares similarity fit. No stretching, shear or reflection. */
export function registerPoints(points: ControlPoint[]): Registration {
  if (points.length < 3) throw new Error('Use at least three control points');
  if (new Set(points.map(p=>p.id)).size !== points.length || points.some(p=>[...p.drawing,...p.building].some(n=>!Number.isFinite(n)))) throw new Error('Invalid control points');
  const mean = (key: 'drawing'|'building'): Point2 => [points.reduce((s,p)=>s+p[key][0],0)/points.length,points.reduce((s,p)=>s+p[key][1],0)/points.length];
  const d=mean('drawing'), b=mean('building'); let dot=0,cross=0,spread=0,xx=0,xy=0,yy=0;
  for(const p of points){const x=p.drawing[0]-d[0],y=p.drawing[1]-d[1],u=p.building[0]-b[0],v=p.building[1]-b[1];dot+=x*u+y*v;cross+=x*v-y*u;spread+=x*x+y*y;xx+=x*x;xy+=x*y;yy+=y*y;}
  if (spread<=1e-15 || (xx*yy-xy*xy)/(spread*spread)<1e-6) throw new Error('Control points must cover a two-dimensional region');
  const scale=Math.hypot(dot,cross)/spread, angle=Math.atan2(cross,dot);
  if (!Number.isFinite(scale) || scale<=1e-12) throw new Error('Control points do not establish a usable scale');
  const mapped=transformPoint(d,{scale,angle,translation:[0,0]});
  const translation: Point2=[b[0]-mapped[0],b[1]-mapped[1]];
  const residuals=points.map(p=>({id:p.id,metres:Math.hypot(...transformPoint(p.drawing,{scale,angle,translation}).map((n,i)=>n-p.building[i]))}));
  return {scale,angle,translation,residuals,rms:Math.sqrt(residuals.reduce((s,r)=>s+r.metres*r.metres,0)/points.length),max:Math.max(...residuals.map(r=>r.metres))};
}
