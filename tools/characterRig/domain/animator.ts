import { TEMPLATES, type CharacterRigData, type DirectionId, type Mode, type Transform } from './rig';
export type EvaluatedPart = Transform & { id: string; zIndex: number; visible: boolean; depth: number; lift: number };
export const phaseAt = (seconds: number, duration: number) => ((seconds / duration) % 1 + 1) % 1;
// A cycle contains one left and one right step. Stance moves on ground at constant speed;
// swing returns smoothly and has a separate vertical lift, never used for depth sorting.
export function footCycle(phase: number, stance: number) {
  const p = ((phase % 1) + 1) % 1;
  if (p < stance) return { depth: 1 - 2 * p / stance, lift: 0 };
  const t = (p - stance) / (1 - stance);
  return { depth: -Math.cos(Math.PI * t), lift: Math.sin(Math.PI * t) };
}
export function evaluateRig(rig: CharacterRigData, direction: DirectionId, seconds: number, mode: Mode): EvaluatedPart[] {
  const d = rig.directions[direction], view = rig.views[d.view], m = rig.motion;
  const phase = phaseAt(seconds, m.duration), wave = Math.sin(phase * Math.PI * 2);
  const factor = view.referenceSize;
  const bounce = mode === 'Walk' ? -m.bounce * factor * (1 - Math.cos(phase * Math.PI * 4)) / 2 : mode === 'Idle' ? -m.bounce * factor * 0.25 * (1 - Math.cos(phase * Math.PI * 2)) : 0;
  return TEMPLATES[rig.rigType].map(def => {
    const p = view.parts.find(p => p.id === def.id)!;
    const c = d.parts[def.id], rest = p.restTransform;
    let dx = 0, dy = 0, rotation = 0, scale = 1, depth = 0, lift = 0;
    if (mode !== 'Rest') {
      if (def.role === 'body' || def.role === 'head' || def.role === 'arm') dy = bounce;
      if (def.role === 'body') rotation = wave * m.lean;
      if (def.role === 'head') dy -= Math.sin(phase * Math.PI * 4) * m.headRecoil * factor * (mode === 'Idle' ? 0.25 : 1);
      if (mode === 'Walk' && (def.role === 'foot' || def.role === 'arm')) {
        const side = def.side * (d.swapLimbs ? -1 : 1);
        const step = footCycle(phase + (side === 1 ? 0 : 0.5), m.stance);
        if (def.role === 'foot') {
          depth = step.depth; lift = step.lift;
          dx = depth * m.stride * factor * d.vector.x;
          dy = depth * m.stride * factor * d.vector.y - lift * m.lift * factor;
          scale = 1 + depth * m.footScale;
        } else {
          // Same-side arm opposes its foot in projected depth, including Back mapping.
          dx = -step.depth * m.stride * factor * 0.2 * d.vector.x;
          dy += -step.depth * m.stride * factor * 0.2 * d.vector.y;
          rotation = -step.depth * m.armSwing * side * d.motionSign;
        }
      }
    }
    // Direction corrections use 1254 reference units; motion uses each view's referenceSize.
    // Motion X is pre-inverted under a mirrored root to retain the requested world vector.
    return { id: def.id, x: rest.x + c.x * factor / 1254 + dx * (d.flip ? -1 : 1), y: rest.y + c.y * factor / 1254 + dy,
      scaleX: rest.scaleX * c.scaleX * scale, scaleY: rest.scaleY * c.scaleY * scale,
      rotation: rest.rotation + c.rotation + rotation, skewX: rest.skewX + c.skewX, skewY: rest.skewY + c.skewY,
      zIndex: p.zIndex + c.zOffset + (def.role === 'foot' ? depth * d.vector.y * m.depthOrder : 0), visible: p.visible, depth, lift };
  });
}
