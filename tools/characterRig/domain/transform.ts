import type { Transform } from './rig';
export type Point = { x: number; y: number };
export type Matrix = { a: number; b: number; c: number; d: number; tx: number; ty: number };
/** Same affine convention as Pixi, without a renderer dependency. */
export function matrix(t: Transform, pivot: Point = { x: 0, y: 0 }): Matrix {
  const a = Math.cos(t.rotation + t.skewY) * t.scaleX, b = Math.sin(t.rotation + t.skewY) * t.scaleX;
  const c = -Math.sin(t.rotation - t.skewX) * t.scaleY, d = Math.cos(t.rotation - t.skewX) * t.scaleY;
  return { a, b, c, d, tx: t.x - pivot.x*a - pivot.y*c, ty: t.y - pivot.x*b - pivot.y*d };
}
export const apply = (m: Matrix, p: Point): Point => ({ x: m.a*p.x+m.c*p.y+m.tx, y: m.b*p.x+m.d*p.y+m.ty });
export function multiply(a: Matrix, b: Matrix): Matrix {
  return { a:a.a*b.a+a.c*b.b, b:a.b*b.a+a.d*b.b, c:a.a*b.c+a.c*b.d, d:a.b*b.c+a.d*b.d, tx:a.a*b.tx+a.c*b.ty+a.tx, ty:a.b*b.tx+a.d*b.ty+a.ty };
}
export function inverse(m: Matrix): Matrix {
  const det = m.a*m.d-m.b*m.c;
  if (Math.abs(det) < 1e-8) throw new Error('몸통 변형이 납작하게 겹쳐 연결할 수 없습니다. 몸통의 배율/skew를 조정하세요.');
  return { a:m.d/det, b:-m.b/det, c:-m.c/det, d:m.a/det, tx:(m.c*m.ty-m.d*m.tx)/det, ty:(m.b*m.tx-m.a*m.ty)/det };
}
export function decompose(m: Matrix): Transform {
  const rotation = Math.atan2(m.b,m.a);
  const angle = rotation - Math.atan2(-m.c,m.d);
  return { x:m.tx,y:m.ty,scaleX:Math.hypot(m.a,m.b),scaleY:Math.hypot(m.c,m.d),rotation,skewX:Math.atan2(Math.sin(angle),Math.cos(angle)),skewY:0 };
}
