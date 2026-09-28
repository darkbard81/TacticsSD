import { z } from 'zod';

export const VIEWS = ['Front', 'Back'] as const;
export const DIRECTIONS = ['Front', 'Back', 'SE', 'SW', 'NE', 'NW'] as const;
export type ViewId = typeof VIEWS[number];
export type DirectionId = typeof DIRECTIONS[number];
export type Mode = 'Rest' | 'Idle' | 'Walk';
// Template is the only place the editor's humanoid part list is defined.
export const HUMANOID = [
  { id: 'head', label: '머리', role: 'head', side: 0 },
  { id: 'body', label: '몸통', role: 'body', side: 0 },
  { id: 'armL', label: '왼팔', role: 'arm', side: 1 },
  { id: 'armR', label: '오른팔', role: 'arm', side: -1 },
  { id: 'footL', label: '왼발 · 다리', role: 'foot', side: 1 },
  { id: 'footR', label: '오른발 · 다리', role: 'foot', side: -1 },
] as const;
export const TEMPLATES = { humanoid: HUMANOID };
const finite = z.number().finite();
const coordinate = finite.min(-100000).max(100000);
const positive = finite.min(0.001).max(100);
const point = z.object({ x: coordinate, y: coordinate }).strict();
const imageRef = z.object({ id: z.string().min(1).max(200).refine(s => !/^(blob:|data:|https?:)/i.test(s), '일시 URL을 저장할 수 없습니다.'), name: z.string().min(1).max(255), width: z.number().int().min(1).max(8192), height: z.number().int().min(1).max(8192) }).strict();
const transform = z.object({ x: coordinate, y: coordinate, scaleX: positive, scaleY: positive, rotation: finite.min(-Math.PI * 2).max(Math.PI * 2), skewX: finite.min(-1.4).max(1.4), skewY: finite.min(-1.4).max(1.4) }).strict();
const partSchema = z.object({ id: z.string(), rect: z.object({ x: finite.min(0), y: finite.min(0), width: finite.min(1), height: finite.min(1) }).strict(), pivot: point, restTransform: transform, zIndex: finite.min(-1000).max(1000), visible: z.boolean(), replacement: imageRef.optional() }).strict();
const viewSchema = z.object({ image: imageRef.nullable(), width: z.number().int().min(1).max(8192), height: z.number().int().min(1).max(8192), ground: point, displayScale: positive, referenceSize: finite.min(1).max(8192), parts: z.array(partSchema).length(6) }).strict();
const correction = transform.extend({ zOffset: finite.min(-1000).max(1000) }).strict();
const directionSchema = z.object({ view: z.enum(VIEWS), flip: z.boolean(), vector: point, motionSign: z.union([z.literal(1), z.literal(-1)]), swapLimbs: z.boolean(), parts: z.record(z.string(), correction) }).strict();
export const MOTION_FIELDS = {
  duration: { label: '양발 한 사이클 (초)', min: 0.2, max: 10, step: 0.05 },
  bounce: { label: '몸통 바운스', min: 0, max: 0.1, step: 0.001 },
  lean: { label: '몸통 기울기 (rad)', min: 0, max: 0.3, step: 0.005 },
  headRecoil: { label: '머리 반동', min: 0, max: 0.1, step: 0.001 },
  armSwing: { label: '팔 흔들림 (rad)', min: 0, max: 0.8, step: 0.01 },
  stride: { label: '발 전후 이동', min: 0, max: 0.15, step: 0.001 },
  lift: { label: '발 들기', min: 0, max: 0.1, step: 0.001 },
  footScale: { label: '발 크기 변화 · 선택', min: 0, max: 0.2, step: 0.01 },
  stance: { label: '접지 비율', min: 0.5, max: 0.8, step: 0.01 },
  depthOrder: { label: '발 사이 깊이 순서', min: 0, max: 0.4, step: 0.05 },
} as const;
const motionSchema = z.object({ presetId: z.literal('SD_Walk'), duration: finite.min(0.2).max(10), bounce: finite.min(0).max(0.1), lean: finite.min(0).max(0.3), headRecoil: finite.min(0).max(0.1), armSwing: finite.min(0).max(0.8), stride: finite.min(0).max(0.15), lift: finite.min(0).max(0.1), footScale: finite.min(0).max(0.2), stance: finite.min(0.5).max(0.8), depthOrder: finite.min(0).max(0.4) }).strict();
const baseSchema = z.object({ schemaVersion: z.literal(1), id: z.string().min(1).max(120), rigType: z.literal('humanoid'), views: z.object({ Front: viewSchema, Back: viewSchema }).strict(), motion: motionSchema, directions: z.object({ Front: directionSchema, Back: directionSchema, SE: directionSchema, SW: directionSchema, NE: directionSchema, NW: directionSchema }).strict() }).strict();
export const rigSchema = baseSchema.superRefine((rig, ctx) => {
  const ids: string[] = HUMANOID.map(p => p.id);
  const refs = new Map<string, string>();
  for (const viewId of VIEWS) {
    const v = rig.views[viewId];
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message: `${viewId}: ${message}` });
    if (v.image && (v.width !== v.image.width || v.height !== v.image.height)) fail('원본 크기와 이미지 크기가 다릅니다.');
    if (new Set(v.parts.map(p => p.id)).size !== ids.length || v.parts.some(p => !ids.includes(p.id))) fail('6개 파츠 ID가 필요합니다.');
    if (v.ground.x < 0 || v.ground.y < 0 || v.ground.x > v.width || v.ground.y > v.height) fail('지면 기준점이 이미지 밖입니다.');
    for (const p of v.parts) {
      if (p.rect.x + p.rect.width > v.width + 1e-6 || p.rect.y + p.rect.height > v.height + 1e-6) fail(`${p.id}: 영역이 원본 이미지 밖입니다.`);
      if (p.pivot.x < 0 || p.pivot.y < 0 || p.pivot.x > p.rect.width || p.pivot.y > p.rect.height) fail(`${p.id}: 부착점이 파츠 밖입니다.`);
    }
    for (const ref of [v.image, ...v.parts.map(p => p.replacement)]) if (ref) {
      const metadata = JSON.stringify(ref);
      if (refs.has(ref.id) && refs.get(ref.id) !== metadata) fail('같은 이미지 ID에 다른 정보가 있습니다.');
      refs.set(ref.id, metadata);
    }
  }
  for (const id of DIRECTIONS) {
    const d = rig.directions[id];
    if (Object.keys(d.parts).length !== ids.length || ids.some(p => !d.parts[p])) ctx.addIssue({ code: 'custom', message: `${id}: 방향별 파츠 보정이 누락되었습니다.` });
    if (Math.hypot(d.vector.x, d.vector.y) > 2) ctx.addIssue({ code: 'custom', message: `${id}: 보행 방향 벡터는 길이 2 이하여야 합니다.` });
  }
});
export type CharacterRigData = z.infer<typeof baseSchema>;
export type RigView = CharacterRigData['views'][ViewId];
export type Part = RigView['parts'][number];
export type ImageRef = z.infer<typeof imageRef>;
export type Transform = z.infer<typeof transform>;
export type DirectionPreset = z.infer<typeof directionSchema>;
export type MotionPreset = z.infer<typeof motionSchema>;
export type Rect = Part['rect'];
export const identity = (): Transform => ({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 });
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function resetPlacement(part: Part, view: Pick<RigView, 'ground'>) {
  part.restTransform = { ...identity(), x: part.rect.x + part.pivot.x - view.ground.x, y: part.rect.y + part.pivot.y - view.ground.y };
}
// Preserve user pose offsets while changing extraction or pivot coordinates.
export function updateGeometry(part: Part, rect: Rect, pivot: {x: number; y: number}) {
  part.restTransform.x += rect.x + pivot.x - part.rect.x - part.pivot.x;
  part.restTransform.y += rect.y + pivot.y - part.rect.y - part.pivot.y;
  part.rect = rect; part.pivot = pivot;
}
export function setGround(view: RigView, point: {x: number; y: number}) {
  for (const p of view.parts) { p.restTransform.x += view.ground.x - point.x; p.restTransform.y += view.ground.y - point.y; }
  view.ground = point;
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
  const rects: Record<string, Rect> = { head: { x: 0, y: 0, width: 1254, height: 390 }, body: middle, armL: anatomicalLeft ? rightArm : leftArm, armR: anatomicalLeft ? leftArm : rightArm, footL: anatomicalLeft ? rightFoot : leftFoot, footR: anatomicalLeft ? leftFoot : rightFoot };
  const v: RigView = { image, width, height, ground: { x: width / 2, y: height * 0.98 }, displayScale: 1, referenceSize: height, parts: [] };
  v.parts = HUMANOID.map((def, i) => {
    const raw = rects[def.id];
    const x = clamp(Math.round(raw.x * sx), 0, width - 1), y = clamp(Math.round(raw.y * sy), 0, height - 1);
    const rect = { x, y, width: clamp(Math.round((raw.x + raw.width) * sx), x + 1, width) - x, height: clamp(Math.round((raw.y + raw.height) * sy), y + 1, height) - y };
    const px = def.role === 'arm' ? (raw.x === 0 ? 480 : 40) : def.role === 'foot' ? (raw.x === 0 ? 560 : 55) : raw.width / 2;
    const pivot = { x: clamp(Math.round(px * sx), 0, rect.width), y: clamp(Math.round((def.role === 'head' ? 365 : def.role === 'body' ? 200 : 25) * sy), 0, rect.height) };
    const p: Part = { id: def.id, rect, pivot, restTransform: identity(), zIndex: [5, 2, 3, 3, 1, 1][i], visible: true };
    resetPlacement(p, v); return p;
  });
  return v;
}
export function createRig(): CharacterRigData {
  const directions = Object.fromEntries(DIRECTIONS.map(id => {
    const back = ['Back', 'NE', 'NW'].includes(id), iso = !VIEWS.includes(id as ViewId), west = id.endsWith('W');
    const parts = Object.fromEntries(HUMANOID.map(p => [p.id, { ...identity(), scaleX: iso ? 0.88 : 1, skewY: iso ? (west ? -0.06 : 0.06) : 0, x: iso && p.role === 'head' ? (west ? -8 : 8) : 0, zOffset: 0 }]));
    return [id, { view: back ? 'Back' : 'Front', flip: iso && west, vector: { x: iso ? (west ? -0.866 : 0.866) : 0, y: back ? -0.5 : iso ? 0.5 : 1 }, motionSign: back ? -1 : 1, swapLimbs: false, parts }];
  })) as CharacterRigData['directions'];
  return { schemaVersion: 1, id: 'elf-soldier', rigType: 'humanoid', views: { Front: makeView('Front'), Back: makeView('Back') }, motion: { presetId: 'SD_Walk', duration: 1, bounce: 0.008, lean: 0.012, headRecoil: 0.003, armSwing: 0.08, stride: 0.012, lift: 0.009, footScale: 0, stance: 0.6, depthOrder: 0.2 }, directions };
}
export function parseRig(text: string): CharacterRigData {
  if (text.length > 2_000_000) throw new Error('JSON 파일이 너무 큽니다 (최대 2MB).');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('올바른 JSON 파일이 아닙니다. 현재 작업은 유지됩니다.'); }
  const result = rigSchema.safeParse(value);
  if (!result.success) throw new Error(`리그 형식 오류: ${result.error.issues.slice(0, 3).map(i => `${i.path.join('.')} ${i.message}`).join(' / ')}`);
  return result.data;
}
export function serializeRig(rig: CharacterRigData): string { return JSON.stringify(rigSchema.parse(rig), null, 2); }
export function imageRefs(rig: CharacterRigData): ImageRef[] {
  return [...new Map(VIEWS.flatMap(v => [rig.views[v].image, ...rig.views[v].parts.map(p => p.replacement)]).filter((r): r is ImageRef => !!r).map(r => [r.id, r])).values()];
}
