import { describe, it, expect } from 'vitest';
import { createRig, DIRECTIONS, imageRefs, makeView, resetPlacement, setGround, updateGeometry, restMatrix, VIEWS, type CharacterRigData } from '../domain/rig';
import { parseRig, serializeRig } from '../io/rig-file';
import { evaluateRig, evaluateWorldRig, footCycle, phaseAt } from '../domain/animator';
const fixture = () => { const r = createRig(); r.views.Front = makeView('Front', { id:'front', name:'front.png', width:1254,height:1254 }); r.views.Back = makeView('Back', { id:'back', name:'back.png', width:900,height:1600 }); return r; };
const pose = (rig: CharacterRigData, t: number, id = 'legL') => evaluateRig(rig,'Front',t,'Walk').find(p=>p.id===id)!;
describe('source pixel coordinates and independent views', () => {
  it('Rest reconstructs source pixel origins from ground + rest - pivot', () => {
    const rig = fixture();
    for (const id of VIEWS) for (const p of rig.views[id].parts) {
      const result = evaluateWorldRig(rig,id,12345,'Rest').find(a=>a.id===p.id)!;
      expect(result.x + rig.views[id].ground.x - p.pivot.x).toBeCloseTo(p.rect.x,10);
      expect(result.y + rig.views[id].ground.y - p.pivot.y).toBeCloseTo(p.rect.y,10);
    }
  });
  it('changing pivot preserves source placement; moving ground adjusts all rest anchors', () => {
    const r = fixture(), v=r.views.Front, p=v.parts[0];
    updateGeometry(p,p.rect,{x:p.pivot.x+10,y:p.pivot.y-7});
    setGround(v,{x:500,y:1200});
    expect(restMatrix(v,p.id).tx+v.ground.x).toBeCloseTo(p.rect.x);
    expect(restMatrix(v,p.id).ty+v.ground.y).toBeCloseTo(p.rect.y);
    p.restTransform.rotation=0.5; resetPlacement(p,v); expect(p.restTransform.rotation).toBe(0);
  });
  it('Front editing cannot mutate Back, and source resolution scales motion consistently', () => {
    const r=fixture(), before=structuredClone(r.views.Back); r.views.Front.parts[0].rect.x=1;
    expect(r.views.Back).toEqual(before);
    const a=createRig(), b=createRig(); b.views.Front=makeView('Front',{id:'double',name:'double.png',width:2508,height:2508});
    const ap=pose(a,.2),bp=pose(b,.2), ar=a.views.Front.parts.find(p=>p.id==='legL')!.restTransform, br=b.views.Front.parts.find(p=>p.id==='legL')!.restTransform; expect(bp.x-br.x).toBeCloseTo((ap.x-ar.x)*2); expect(bp.y-br.y).toBeCloseTo((ap.y-ar.y)*2);
  });
});
describe('time-based shared motion', () => {
  it('matches poses at 30, 60 and 120 FPS', () => {
    const r=fixture();
    for(const fps of [30,60,120]) {
      let t=0;for(let i=0;i<fps*3;i++)t+=1/fps;
      const actual=evaluateRig(r,'SE',t+.23,'Walk'),expected=evaluateRig(r,'SE',3.23,'Walk');
      actual.forEach((p,i)=>{ for(const k of ['x','y','rotation','scaleX','scaleY','zIndex'] as const)expect(p[k]).toBeCloseTo(expected[i][k],9); });
    }
  });
  it('keeps stance on ground and alternates left/right with opposed arms in both views', () => {
    const r=fixture();
    expect(footCycle(.3,.6).depth).toBeCloseTo(0); expect(footCycle(.3,.6).lift).toBe(0);
    expect(footCycle(.8,.6).lift).toBeCloseTo(1);
    for(const direction of VIEWS) {
      const at=(t:number)=>evaluateRig(r,direction,t,'Walk');
      expect(at(.8).find(p=>p.id==='legL')!.lift).toBeGreaterThan(.9);
      expect(at(.8).find(p=>p.id==='legR')!.lift).toBe(0);
      expect(at(.3).find(p=>p.id==='legR')!.lift).toBeGreaterThan(.9);
      for(const id of ['L','R']) {
        const list=at(0),foot=list.find(p=>p.id===`leg${id}`)!,arm=list.find(p=>p.id===`arm${id}`)!;
        const view=r.views[direction];
        expect((foot.y-view.parts.find(p=>p.id===foot.id)!.restTransform.y)*(arm.y-view.parts.find(p=>p.id===arm.id)!.restTransform.y)).toBeLessThan(0);
      }
    }
  });
  it('front feet stay on source X, and isometric stride follows world diagonals even when mirrored', () => {
    const r=fixture();
    for(const t of [0,.2,.4,.6,.8]) expect(pose(r,t).x).toBe(r.views.Front.parts.find(p=>p.id==='legL')!.restTransform.x);
    for(const dir of ['SE','SW','NE','NW'] as const) {
      const d=r.directions[dir],v=r.views[d.view],rest=v.parts.find(p=>p.id==='legL')!.restTransform;
      const p=evaluateRig(r,dir,0,'Walk').find(p=>p.id==='legL')!;
      expect(Math.sign((p.x-rest.x-d.parts.legL.x*v.referenceSize/1254)*(d.flip?-1:1))).toBe(Math.sign(d.vector.x));
      expect(Math.sign(p.y-rest.y)).toBe(Math.sign(d.vector.y));
    }
  });
  it('does not accumulate transforms after thousands of direction switches', () => {
    const r=fixture(),original=serializeRig(r),reference=evaluateRig(r,'Front',.35,'Walk');
    for(let i=0;i<3000;i++)evaluateRig(r,DIRECTIONS[i%DIRECTIONS.length],i/60,'Walk');
    expect(serializeRig(r)).toBe(original); expect(evaluateRig(r,'Front',10000.35,'Walk')).toEqual(expect.arrayContaining(reference.map(p=>expect.objectContaining({id:p.id,visible:p.visible}))));
    reference.forEach((p,i)=>expect(evaluateRig(r,'Front',10000.35,'Walk')[i].y).toBeCloseTo(p.y,7));
  });
  it('has two body bounces per two-foot cycle, optional scale off by default, depth independent of lift', () => {
    const r=fixture(),body=(t:number)=>pose(r,t,'body').y;
    expect(body(0)).toBeCloseTo(body(.5));expect(body(.25)).toBeCloseTo(body(.75));expect(body(.25)).toBeLessThan(body(0));
    const before=pose(r,.8);r.motion.lift=.08;const after=pose(r,.8);
    expect(after.zIndex).toBe(before.zIndex); expect(after.y).toBeLessThan(before.y); expect(after.scaleX).toBe(1);
  });
  it('supports per-view mapping, rotation sign, base placement, skew and depth corrections', () => {
    const r=fixture(); r.directions.Back.swapLimbs=true;r.directions.Back.motionSign=1;
    const front=evaluateRig(r,'Front',.8,'Walk'),back=evaluateRig(r,'Back',.8,'Walk');
    expect(back.find(p=>p.id==='legL')!.lift).toBe(front.find(p=>p.id==='legR')!.lift);
    r.views.Front.parts[0].restTransform.rotation=.1;r.directions.SE.parts.head.rotation=.2;r.directions.SE.parts.head.zOffset=3;
    expect(evaluateRig(r,'SE',0,'Rest')[0].rotation).toBeCloseTo(.3);
    expect(evaluateRig(r,'SE',0,'Rest')[0].zIndex).toBe(8);
    expect(phaseAt(-.25,1)).toBe(.75);
  });
});
describe('versioned round trip and validation', () => {
  it('restores all view, replacement, direction and motion settings without temporary URLs', () => {
    const r=fixture();r.views.Back.parts[1].replacement={id:'body-clean',name:'clean.png',width:200,height:300};r.views.Back.displayScale=1.2;r.directions.NW.parts.armL.skewX=.1;r.motion.duration=1.4;
    expect(parseRig(serializeRig(r))).toEqual(r);expect(imageRefs(r)).toHaveLength(3);expect(serializeRig(r)).not.toContain('blob:');
  });
  it.each([
    ['obsolete version',(r: any)=>{r.schemaVersion=1;}],
    ['future version',(r: any)=>{r.schemaVersion=3;}],
    ['out of bounds',(r: any)=>{r.views.Front.parts[0].rect.width=99999;}],
    ['pivot',(r: any)=>{r.views.Front.parts[0].pivot.x=-1;}],
    ['duplicate part',(r: any)=>{r.views.Front.parts[0].id='body';}],
    ['missing direction',(r: any)=>{delete r.directions.NE;}],
    ['missing correction',(r: any)=>{delete r.directions.NE.parts.head;}],
    ['temporary URL',(r: any)=>{r.views.Front.image.id='blob:invalid';}],
    ['size mismatch',(r: any)=>{r.views.Front.width=1200;}],
    ['zero cycle',(r: any)=>{r.motion.duration=0;}],
    ['unsafe vector',(r: any)=>{r.directions.SE.vector.x=10;}],
  ])('rejects %s without mutating live data', (_name,change) => {
    const r=fixture(),before=structuredClone(r),bad=structuredClone(r);change(bad);expect(()=>parseRig(JSON.stringify(bad))).toThrow();expect(r).toEqual(before);
  });
  it('rejects corrupt and excessively large files',()=>{expect(()=>parseRig('{oops')).toThrow('JSON');expect(()=>parseRig(' '.repeat(2_000_001))).toThrow('2MB');});
});
