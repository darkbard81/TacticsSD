import { describe, expect, it } from 'vitest';
import { silhouette, thickness, bonePose } from '../domain/preview3d';
import { createDefaultRig } from '../domain/default-rig';
import { evaluateRig } from '../domain/animator';
import { serializeRig, parseRig } from '../io/rig-file';
describe('editor-only volume adapter', () => {
  it('uses alpha outline instead of rectangular crop', () => {
    const data = new Uint8ClampedArray(16 * 16 * 4);
    for (let y=3;y<13;y++) for(let x=5;x<10;x++) data[(y*16+x)*4+3]=255;
    const contour = silhouette(data,16,16);
    expect(contour.length).toBeGreaterThan(3);
    expect(Math.min(...contour.map(p=>p[0]))).toBe(5);
    expect(Math.max(...contour.map(p=>p[0]))).toBe(10);
    expect(silhouette(new Uint8ClampedArray(64),4,4)).toEqual([]);
    expect(thickness('head',100)).toBe(4);
    expect(thickness('armL',250)).toBe(4);
  });
  it('maps pivots/sockets and order to bones/depth; replaces gait scale with Z travel', () => {
    const rig=createDefaultRig(), part=rig.views.Front.parts.find(p=>p.id==='legL')!;
    const pose=evaluateRig(rig,'Front',0,'Walk').find(p=>p.id==='legL')!;
    const mapped=bonePose(rig,'Front',part,pose);
    expect(mapped.x).toBeCloseTo(part.restTransform.x+part.attachment.socket.x);
    expect(mapped.z).toBeCloseTo(pose.zIndex*8+pose.depth*rig.motion.stride*rig.views.Front.referenceSize);
    expect(mapped.scaleX).toBeCloseTo(part.restTransform.scaleX*rig.directions.Front.parts.legL.scaleX);
    expect(mapped.rotationX).not.toBe(0);
    const rest=evaluateRig(rig,'Front',0,'Rest').find(p=>p.id==='head')!;
    expect(bonePose(rig,'Front',rig.views.Front.parts[0],rest).z).toBe(rest.zIndex*8);
  });
  it('evaluating all modes and directions preserves v2 JSON and custom edits', () => {
    const rig=createDefaultRig();rig.views.Back.parts[0].pivot.x+=13;rig.directions.NW.parts.head.x=27;
    const saved=serializeRig(rig);
    for(const direction of ['Front','Back','SE','NW'] as const) for(const mode of ['Rest','Idle','Walk'] as const) {
      for(const pose of evaluateRig(rig,direction,.4,mode)) bonePose(rig,direction,rig.views[rig.directions[direction].view].parts.find(p=>p.id===pose.id)!,pose);
    }
    expect(serializeRig(rig)).toBe(saved);expect(parseRig(saved)).toEqual(rig);
  });
});
