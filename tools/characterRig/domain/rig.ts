import { matrix, multiply, inverse, apply, decompose } from './transform.ts';
import { CURRENT_SCHEMA_VERSION, HUMANOID, DIRECTIONS, VIEWS, type Transform, type DirectionId, type Part, type RigView, type ViewId, type Rect, type ImageRef, type CharacterRigData } from './schema.ts';
export * from './schema.ts';

export const identity = (): Transform => ({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 });
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** Source coordinates are used only to initialize a newly loaded image. */
export function resetPlacement(part: Part, view: RigView) {
  const anchor = { x: part.rect.x + part.pivot.x - view.ground.x, y: part.rect.y + part.pivot.y - view.ground.y };
  part.attachment.socket = part.attachment.parentId ? apply(inverse(restMatrix(view, part.attachment.parentId)), anchor) : anchor;
  part.restTransform = identity();
}
/** Preserve the painted origin when moving a pivot; atlas crop positions never move a joint. */
export function updateGeometry(part: Part, rect: Rect, pivot: {x: number; y: number}) {
  const linear = matrix(part.restTransform);
  const dx = pivot.x - part.pivot.x, dy = pivot.y - part.pivot.y;
  part.restTransform.x += linear.a * dx + linear.c * dy;
  part.restTransform.y += linear.b * dx + linear.d * dy;
  part.rect = rect; part.pivot = pivot;
}
export function setGround(view: RigView, point: {x: number; y: number}) {
  for (const p of view.parts) if (!p.attachment.parentId) {
    p.attachment.socket.x += view.ground.x - point.x;
    p.attachment.socket.y += view.ground.y - point.y;
  }
  view.ground = point;
}
export function restMatrix(view: RigView, id: string): ReturnType<typeof matrix> {
  const p = view.parts.find(p => p.id === id)!;
  const local = matrix({ ...p.restTransform, x: p.attachment.socket.x + p.restTransform.x, y: p.attachment.socket.y + p.restTransform.y }, p.pivot);
  return p.attachment.parentId ? multiply(restMatrix(view, p.attachment.parentId), local) : local;
}
/** Preserve the neutral Rest pose while changing a parent. Direction corrections remain local. */
export function setParent(view: RigView, part: Part, parentId: 'body' | null) {
  if (part.id === parentId || (part.id === 'body' && parentId)) throw new Error('몸통은 자신의 부모가 될 수 없습니다.');
  if (part.attachment.parentId === parentId) return;
  const world = restMatrix(view, part.id);
  const local = parentId ? multiply(inverse(restMatrix(view, parentId)), world) : world;
  part.attachment = { parentId, socket: apply(local, part.pivot) };
  part.restTransform = { ...decompose(local), x: 0, y: 0 };
}
export function makeView(viewId: ViewId, image: ImageRef | null = null): RigView {
  const width = image?.width ?? 1254, height = image?.height ?? 1254;
  const sx = width / 1254, sy = height / 1254;
  // Disjoint partition reconstructs every pixel. Selection still needs artistic refinement.
  const middle = { x: 515, y: 390, width: 212, height: 430 };
  const leftArm = { x: 0, y: 390, width: 515, height: 430 };
  const rightArm = { x: 727, y: 390, width: 527, height: 430 };
  const leftFoot = { x: 0, y: 820, width: 627, height: 434 };
  const rightFoot = { x: 627, y: 820, width: 627, height: 434 };
  const anatomicalLeft = viewId === 'Front';
  const rects: Record<string, Rect> = { head: { x: 0, y: 0, width: 1254, height: 390 }, body: middle, armL: anatomicalLeft ? rightArm : leftArm, armR: anatomicalLeft ? leftArm : rightArm, legL: anatomicalLeft ? rightFoot : leftFoot, legR: anatomicalLeft ? leftFoot : rightFoot };
  const v: RigView = { image, width, height, ground: { x: width / 2, y: height * 0.98 }, displayScale: 1, referenceSize: height, parts: [] };
  v.parts = HUMANOID.map((def, i) => {
    const raw = rects[def.id];
    const x = clamp(Math.round(raw.x * sx), 0, width - 1), y = clamp(Math.round(raw.y * sy), 0, height - 1);
    const rect = { x, y, width: clamp(Math.round((raw.x + raw.width) * sx), x + 1, width) - x, height: clamp(Math.round((raw.y + raw.height) * sy), y + 1, height) - y };
    const px = def.role === 'arm' ? (raw.x === 0 ? 480 : 40) : def.role === 'leg' ? (raw.x === 0 ? 560 : 55) : raw.width / 2;
    const pivot = { x: clamp(Math.round(px * sx), 0, rect.width), y: clamp(Math.round((def.role === 'head' ? 365 : def.role === 'body' ? 200 : 25) * sy), 0, rect.height) };
    const p: Part = { id: def.id, attachment: { parentId: null, socket: { x: 0, y: 0 } }, rect, pivot, restTransform: identity(), zIndex: [5, 2, 3, 3, 1, 1][i], visible: true };
    resetPlacement(p, v); return p;
  });
  for (const p of v.parts) if (p.id !== 'body') setParent(v, p, 'body');
  return v;
}
/** Project the character's horizontal axis onto a 45-degree, half-height board.
 * Keep its vertical axis upright. The body's children inherit this once; root flip
 * supplies screen-west. Front slopes down-right, Back up-right before mirroring.
 * Pixi uses a=cos(skewY)*scaleX, b=sin(skewY)*scaleX, so a=sqrt(1/2), b=±sqrt(1/8).
 */
export function defaultDirectionCorrection(direction: DirectionId, partId: string) {
  const projectedBody = !VIEWS.includes(direction as ViewId) && partId === 'body';
  const back = direction === 'NE' || direction === 'NW';
  return { ...identity(), scaleX: projectedBody ? Math.sqrt(5 / 8) : 1,
    skewY: projectedBody ? (back ? -1 : 1) * Math.atan(0.5) : 0, zOffset: 0 };
}
export function createRig(): CharacterRigData {
  const directions = Object.fromEntries(DIRECTIONS.map(id => {
    const back = ['Back', 'NE', 'NW'].includes(id), iso = !VIEWS.includes(id as ViewId), west = id.endsWith('W');
    const parts = Object.fromEntries(HUMANOID.map(p => [p.id, defaultDirectionCorrection(id, p.id)]));
    return [id, { view: back ? 'Back' : 'Front', flip: iso && west, vector: { x: iso ? (west ? -0.866 : 0.866) : 0, y: back ? -0.5 : iso ? 0.5 : 1 }, motionSign: back ? -1 : 1, swapLimbs: false, parts }];
  })) as CharacterRigData['directions'];
  return { schemaVersion: CURRENT_SCHEMA_VERSION, id: 'elf-soldier', rigType: 'humanoid', views: { Front: makeView('Front'), Back: makeView('Back') }, motion: { presetId: 'SD_Walk', duration: 1, bounce: 0.008, lean: 0.012, headRecoil: 0.003, armSwing: 0.08, stride: 0.012, lift: 0.009, footScale: 0, stance: 0.6, depthOrder: 0.2 }, directions };
}
export function imageRefs(rig: CharacterRigData): ImageRef[] {
  return [...new Map(VIEWS.flatMap(v => [rig.views[v].image, ...rig.views[v].parts.map(p => p.replacement)]).filter((r): r is ImageRef => !!r).map(r => [r.id, r])).values()];
}
