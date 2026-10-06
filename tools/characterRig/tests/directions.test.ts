import { describe, it, expect } from 'vitest';
import { createRig, restMatrix } from '../domain/rig';
import { createDefaultRig } from '../domain/default-rig';
import { evaluateWorldRig } from '../domain/animator';
import { parseRig, serializeRig } from '../io/rig-file';

const facings = [
  ['SE', 'Front', false], ['SW', 'Front', true],
  ['NE', 'Back', false], ['NW', 'Back', true],
] as const;

describe('upright character projection from the CardGuild board', () => {
  for (const [label, factory] of [['new rig', createRig], ['bundled rig', createDefaultRig]] as const) {
    it(`${label} projects the horizontal axis once while keeping the vertical axis upright`, () => {
      const rig = factory();
      for (const [id, view, flip] of facings) {
        expect(rig.directions[id].view).toBe(view);
        expect(rig.directions[id].flip).toBe(flip);
        const body = rig.views[view].parts.find(p => p.id === 'body')!;
        const origin = body.attachment.socket;
        const a = Math.SQRT1_2, b = (view === 'Back' ? -1 : 1) * Math.SQRT1_2 / 2;
        for (const pose of evaluateWorldRig(rig, id, 0, 'Rest')) {
          const authored = restMatrix(rig.views[view], pose.id);
          // Independent expected projection around the body attachment, not a second scale per limb.
          expect(pose.matrix.a).toBeCloseTo(a); expect(pose.matrix.b).toBeCloseTo(b);
          expect(pose.matrix.c).toBeCloseTo(0); expect(pose.matrix.d).toBeCloseTo(1);
          expect(pose.matrix.tx).toBeCloseTo(origin.x + a * (authored.tx - origin.x));
          expect(pose.matrix.ty).toBeCloseTo(authored.ty + b * (authored.tx - origin.x));
          expect(pose.zIndex).toBe(rig.views[view].parts.find(p => p.id === pose.id)!.zIndex);
        }
        expect(b / (a * (flip ? -1 : 1))).toBeCloseTo(id === 'SE' || id === 'NW' ? .5 : -.5);
      }
    });
  }
  it('leaves Front and Back neutral', () => {
    const rig = createDefaultRig();
    for (const view of ['Front', 'Back'] as const) for (const pose of evaluateWorldRig(rig, view, 0, 'Rest')) {
      expect(pose.matrix).toEqual(restMatrix(rig.views[view], pose.id));
    }
  });
  it('keeps old v2 defaults and explicit user corrections through load and save', () => {
    const rig = createDefaultRig();
    for (const [id] of facings) {
      const west = id.endsWith('W');
      Object.assign(rig.directions[id].parts.body, { scaleX: .88, skewY: west ? -.06 : .06 });
      rig.directions[id].parts.head.x = west ? -8 : 8;
    }
    Object.assign(rig.directions.SW, { view: 'Back', flip: false, swapLimbs: true, motionSign: 1 });
    Object.assign(rig.directions.SW.parts.armL, { x: 27, y: -12, rotation: .13, skewX: .2, scaleY: .9, zOffset: 4 });
    const restored = parseRig(serializeRig(parseRig(JSON.stringify(rig))));
    expect(restored.schemaVersion).toBe(2);
    expect(restored).toEqual(rig);
    for (const [id] of facings) for (const mode of ['Rest', 'Walk'] as const) {
      expect(evaluateWorldRig(restored, id, .31, mode)).toEqual(evaluateWorldRig(rig, id, .31, mode));
    }
  });
});
