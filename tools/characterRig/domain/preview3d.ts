import type { EvaluatedPart } from './animator';
import type { CharacterRigData, DirectionId, Part } from './rig';
/** Low-poly outer envelope, sampled from opaque row spans. Interior holes remain alpha-cut caps. */
export function silhouette(alpha: Uint8ClampedArray, width: number, height: number) {
  const left: [number, number][] = [], right: [number, number][] = [];
  const step = Math.max(1, Math.floor(height / 32));
  for (let y = 0; y < height; y += step) {
    let lo = width, hi = -1;
    for (let yy = y; yy < Math.min(height, y + step); yy++) for (let x = 0; x < width; x++) {
      if (alpha[(yy * width + x) * 4 + 3] > 100) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    if (hi >= lo) { left.push([lo, y]); right.push([hi + 1, Math.min(height, y + step)]); }
  }
  return [...left, ...right.reverse()];
}
/** Shared rig-coordinate thickness; XY part scale never changes the Z extent. */
export function thickness(_id: string, _width: number) { return 4; }
/** Overlapping slabs retain a solid joint instead of leaving an air gap. */
export const LAYER_DEPTH = 1.5;
export function bonePose(rig: CharacterRigData, direction: DirectionId, part: Part, pose: EvaluatedPart) {
  const d = rig.directions[direction], v = rig.views[d.view];
  const limb = part.id.startsWith('leg'), arm = part.id.startsWith('arm');
  const scaleIllusion = limb ? 1 + pose.depth * rig.motion.footScale : 1;
  const travel = pose.depth * rig.motion.stride * v.referenceSize;
  return {
    x: pose.x + part.attachment.socket.x - (limb ? travel * d.vector.x * (d.flip ? -1 : 1) : 0),
    y: -(pose.y + part.attachment.socket.y - (limb ? travel * d.vector.y - pose.lift * rig.motion.lift * v.referenceSize : 0)),
    // A rigid leg pivots at its hip; translating its entire slab detached the joint.
    z: pose.zIndex * LAYER_DEPTH,
    rotationZ: -pose.rotation,
    rotationX: limb ? pose.depth * .25 : arm ? Math.sin(pose.rotation - part.restTransform.rotation) * .5 : 0,
    scaleX: pose.scaleX / scaleIllusion, scaleY: pose.scaleY / scaleIllusion,
  };
}

/** Taper top/bottom depth to infer a rounded low-poly volume rather than a uniform slab. */
export function depthAt(y: number, height: number, depth: number) {
  return depth * (.12 + .38 * Math.sin(Math.PI * Math.max(0, Math.min(1, y / height))));
}
