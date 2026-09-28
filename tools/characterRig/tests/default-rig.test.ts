import { describe, expect, it } from 'vitest';
import { createDefaultRig, resetEditorPlacement } from '../domain/default-rig';
import { imageRefs, parseRig, serializeRig, setGround } from '../domain/rig';
import { evaluateWorldRig } from '../domain/animator';

describe('user supplied parts-sheet default', () => {
  it('shares one image but keeps independently editable views, with ten unique crops', () => {
    const rig = createDefaultRig();
    expect(imageRefs(rig)).toHaveLength(1);
    expect(new Set(Object.values(rig.views).flatMap(v=>v.parts.map(p=>JSON.stringify(p.rect)))).size).toBe(10);
    const originalBack = structuredClone(rig.views.Back);
    rig.views.Front.parts[0].restTransform.x = 40;
    expect(rig.views.Back).toEqual(originalBack);
    expect(createDefaultRig().views.Front.parts[0].restTransform.x).toBe(0);
  });
  it('assembles atlas pieces around the ground instead of preserving sheet layout', () => {
    const rig = createDefaultRig();
    for (const view of ['Front','Back'] as const) {
      const pose = evaluateWorldRig(rig,view,0,'Rest');
      expect(Math.max(...pose.map(p=>Math.abs(p.x)))).toBeLessThanOrEqual(120);
      expect(pose.find(p=>p.id==='head')!.y).toBeLessThan(pose.find(p=>p.id==='body')!.y);
      for(const foot of rig.views[view].parts.filter(p=>p.id.startsWith('leg'))) {
        const soleY = view==='Front'?1221:1224;
        expect(pose.find(p=>p.id===foot.id)!.y + soleY - foot.rect.y - foot.pivot.y).toBeCloseTo(0);
      }
      const head = rig.views[view].parts[0];
      expect(head.restTransform.x).not.toBe(head.rect.x+head.pivot.x-rig.views[view].ground.x);
    }
  });
  it('maps the two shared arms to anatomical L/R for each view', () => {
    const rig=createDefaultRig();const find=(v:'Front'|'Back',id:string)=>rig.views[v].parts.find(p=>p.id===id)!;
    expect(find('Front','armL').rect).toEqual(find('Back','armR').rect);
    expect(find('Front','armR').rect).toEqual(find('Back','armL').rect);
    expect(evaluateWorldRig(rig,'Front',0,'Rest').find(p=>p.id==='armL')!.x).toBeGreaterThan(0);
    expect(evaluateWorldRig(rig,'Back',0,'Rest').find(p=>p.id==='armL')!.x).toBeLessThan(0);
  });
  it('round-trips the complete authored pose and motion', () => {
    const rig=createDefaultRig();expect(parseRig(serializeRig(rig))).toEqual(rig);
  });
  it('reset restores the assembled pose, including changed ground, rather than scattering the atlas', () => {
    const rig=createDefaultRig(), view=rig.views.Front, p=view.parts[0], original=structuredClone(p.restTransform);
    p.restTransform.x=999;p.restTransform.rotation=.5;resetEditorPlacement(p,view,'Front');expect(p.restTransform).toEqual(original);
    setGround(view,{x:view.ground.x+10,y:view.ground.y});p.restTransform.x=99;resetEditorPlacement(p,view,'Front');expect(evaluateWorldRig(rig,'Front',0,'Rest').find(p=>p.id==='head')!.x).toBeCloseTo(-10);
  });
});
