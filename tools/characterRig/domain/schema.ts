import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 2 as const;
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
  { id: 'legL', label: '왼다리', role: 'leg', side: 1 },
  { id: 'legR', label: '오른다리', role: 'leg', side: -1 },
] as const;
export const TEMPLATES = { humanoid: HUMANOID };
const finite = z.number().finite();
const coordinate = finite.min(-100000).max(100000);
const positive = finite.min(0.001).max(100);
const point = z.object({ x: coordinate, y: coordinate }).strict();
const imageRef = z.object({ id: z.string().min(1).max(200).refine(s => !/^(blob:|data:|https?:)/i.test(s), '일시 URL을 저장할 수 없습니다.'), name: z.string().min(1).max(255), width: z.number().int().min(1).max(8192), height: z.number().int().min(1).max(8192) }).strict();
const transform = z.object({ x: coordinate, y: coordinate, scaleX: positive, scaleY: positive, rotation: finite.min(-Math.PI * 2).max(Math.PI * 2), skewX: finite.min(-Math.PI).max(Math.PI), skewY: finite.min(-Math.PI).max(Math.PI) }).strict();
const basePartSchema = z.object({ id: z.string(), rect: z.object({ x: finite.min(0), y: finite.min(0), width: finite.min(1), height: finite.min(1) }).strict(), pivot: point, restTransform: transform, zIndex: finite.min(-1000).max(1000), visible: z.boolean(), replacement: imageRef.optional() }).strict();
const partSchema = basePartSchema.extend({ attachment: z.object({ parentId: z.literal('body').nullable(), socket: point }).strict() }).strict();
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
const baseSchema = z.object({ schemaVersion: z.literal(CURRENT_SCHEMA_VERSION), id: z.string().min(1).max(120), rigType: z.literal('humanoid'), views: z.object({ Front: viewSchema, Back: viewSchema }).strict(), motion: motionSchema, directions: z.object({ Front: directionSchema, Back: directionSchema, SE: directionSchema, SW: directionSchema, NE: directionSchema, NW: directionSchema }).strict() }).strict();
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
      if (p.id === 'body' && p.attachment.parentId !== null) fail('몸통은 지면에 연결해야 합니다.');
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
