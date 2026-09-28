import { describe, it, expect } from 'vitest';
import { createDefaultRig } from '../domain/default-rig';
import { setGround, setParent, updateGeometry, restMatrix, type CharacterRigData } from '../domain/rig';
import { parseRig, serializeRig } from '../io/rig-file';
import { evaluateRig, evaluateWorldRig } from '../domain/animator';
import { apply, matrix } from '../domain/transform';

const part = (rig: CharacterRigData, id: string) => rig.views.Front.parts.find(p=>p.id===id)!;
const closeMatrix = (actual: ReturnType<typeof matrix>, expected: ReturnType<typeof matrix>) => {
  for (const key of ['a','b','c','d','tx','ty'] as const) expect(actual[key]).toBeCloseTo(expected[key], 7);
};
describe('pivot/socket attachment contract', () => {
  it('joins five independent pivots to body sockets in both views', () => {
    const rig = createDefaultRig();
    expect(rig.schemaVersion).toBe(2);
    for (const direction of ['Front','Back'] as const) {
      const view = rig.views[direction], body = view.parts.find(p=>p.id==='body')!;
      expect(body.attachment.parentId).toBeNull();
      for (const child of view.parts.filter(p=>p.id!=='body')) {
        expect(child.attachment.parentId).toBe('body');
        const socket = apply(restMatrix(view,'body'), child.attachment.socket);
        const anchor = apply(restMatrix(view,child.id), child.pivot);
        expect(anchor.x).toBeCloseTo(socket.x);expect(anchor.y).toBeCloseTo(socket.y);
        expect(child.restTransform.x).toBe(0);expect(child.restTransform.y).toBe(0);
      }
    }
  });
  it('inherits body translation, rotation, nonuniform scale and skew without rewriting child data', () => {
    const rig = createDefaultRig(), view = rig.views.Front, body = part(rig,'body');
    const before = structuredClone(view.parts.filter(p=>p.id!=='body'));
    Object.assign(body.restTransform,{x:80,y:-40,rotation:.4,scaleX:1.2,scaleY:.8,skewX:.12});
    const poses = evaluateWorldRig(rig,'Front',0,'Rest');
    for (const child of before) {
      const expected = apply(restMatrix(view,'body'),child.attachment.socket);
      const actual = poses.find(p=>p.id===child.id)!;
      expect(actual.x).toBeCloseTo(expected.x);expect(actual.y).toBeCloseTo(expected.y);
    }
    expect(view.parts.filter(p=>p.id!=='body')).toEqual(before);
  });
  it('applies shared bounce and isometric shape once through body; limbs retain local motion', () => {
    const rig=createDefaultRig();rig.motion.headRecoil=0;rig.motion.lean=0;
    for (const mode of ['Idle','Walk'] as const) {
      const poses=evaluateRig(rig,'Front',.3,mode), body=poses.find(p=>p.id==='body')!,head=poses.find(p=>p.id==='head')!;
      expect(body.y).toBeLessThan(0);expect(head.y).toBe(0);
      const rest=evaluateWorldRig(rig,'Front',0,'Rest'), moving=evaluateWorldRig(rig,'Front',.3,mode);
      expect(moving[0].y-rest[0].y).toBeCloseTo(body.y);
    }
    const iso=evaluateWorldRig(rig,'SE',0,'Rest');
    expect(iso.find(p=>p.id==='head')!.matrix.a).toBeCloseTo(.88*Math.cos(.06));
    expect(rig.directions.SE.parts.head.scaleX).toBe(1);
  });
  it('changing a crop does not move the joint, and pivot edits preserve painted origins and descendants', () => {
    const rig=createDefaultRig(),v=rig.views.Front,p=part(rig,'body');
    p.restTransform.rotation=.4;p.restTransform.scaleX=1.2;
    const before=v.parts.map(p=>restMatrix(v,p.id));
    updateGeometry(p,{...p.rect,x:p.rect.x+2},p.pivot);
    v.parts.forEach((p,i)=>closeMatrix(restMatrix(v,p.id),before[i]));
    updateGeometry(p,p.rect,{x:p.pivot.x+8,y:p.pivot.y-5});
    v.parts.forEach((p,i)=>closeMatrix(restMatrix(v,p.id),before[i]));
  });
  it('changing ground moves the hierarchy once and leaves body-local sockets unchanged', () => {
    const rig=createDefaultRig(),v=rig.views.Front,before=evaluateWorldRig(rig,'Front',0,'Rest'),children=structuredClone(v.parts.filter(p=>p.id!=='body'));
    setGround(v,{x:v.ground.x-25,y:v.ground.y-40});
    evaluateWorldRig(rig,'Front',0,'Rest').forEach((p,i)=>{expect(p.x-before[i].x).toBeCloseTo(25);expect(p.y-before[i].y).toBeCloseTo(40);});
    expect(v.parts.filter(p=>p.id!=='body')).toEqual(children);
  });
  it('preserves neutral world pose when detaching and attaching to an affine body', () => {
    const rig=createDefaultRig(),v=rig.views.Front,p=part(rig,'head');
    Object.assign(part(rig,'body').restTransform,{rotation:.3,scaleX:1.3,scaleY:.7,skewX:.2});
    Object.assign(p.restTransform,{rotation:-.2,scaleY:1.1,x:8,y:9});
    const before=restMatrix(v,'head');setParent(v,p,null);closeMatrix(restMatrix(v,'head'),before);
    setParent(v,p,'body');closeMatrix(restMatrix(v,'head'),before);
    expect(parseRig(serializeRig(rig))).toEqual(rig);
  });
  it.each([
    ['body cycle',(r:CharacterRigData)=>{part(r,'body').attachment.parentId='body';}],
    ['missing socket',(r: any)=>{delete r.views.Front.parts[0].attachment.socket;}],
    ['unknown parent',(r: any)=>{r.views.Front.parts[0].attachment.parentId='missing';}],
    ['unsupported chain',(r: any)=>{r.views.Front.parts[0].attachment.parentId='armL';}],
    ['unbounded socket',(r:CharacterRigData)=>{part(r,'head').attachment.socket.x=100001;}],
  ])('rejects %s atomically',(_label,mutate)=>{
    const rig=createDefaultRig(),bad=structuredClone(rig);mutate(bad);
    expect(()=>parseRig(JSON.stringify(bad))).toThrow();expect(rig).toEqual(createDefaultRig());
  });
});
