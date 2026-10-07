import {it,expect} from 'vitest';
import {makeBattle,newCampaign,act,accuracy} from '../../game/domain';
import {ABILITIES,validateContent} from '../../game/content';
it('F06 misses never grant damage-dealt or damage-taken TP',()=>{
 const b=makeBattle(0,newCampaign()),u=b.units[0],t=b.units[3];t.x=2;t.y=2;t.facing='NW';
 for(let seed=0;seed<1000;seed++)if(((Math.imul(seed,1664525)+1013904223)>>>0)%100>=accuracy(b,u,t,'attack')){b.rng=seed;break;}
 const hp=t.hp;expect(act(b,u,t,'attack')).toBe(true);expect(t.hp).toBe(hp);expect(b.log.at(-1)).toContain('빗나감');expect(t.tp).toBe(0);expect(u.tp).toBe(0);
});
it('F07 a valid area heal affects wounded allies and never adjacent enemies',()=>{
 const b=makeBattle(0,newCampaign()),u=b.units[0],ally=b.units[1],enemy=b.units[3];u.mp=50;u.abilityId='audit-group-heal';ally.hp=10;enemy.hp=10;enemy.x=ally.x+1;enemy.y=ally.y;
 ABILITIES.push({...ABILITIES.find(a=>a.effect==='heal')!,id:'audit-group-heal',radius:1});
 try {validateContent();expect(act(b,u,ally,'skill')).toBe(true);expect(ally.hp).toBe(54);expect(enemy.hp).toBe(10);} finally{ABILITIES.pop();}
});

// State only: no browser, pixels, renderer or GPU.
it('equipment appears only during damaging attacks and clears on every nonattack state',async()=>{
 const {weaponVisible}=await import('../../game/presentation-state');
 const state={kind:'attack',progress:.5,damagingSkill:false,walking:false,hurt:false,collapsed:false};
 expect(weaponVisible(state)).toBe(true);
 for(const kind of [undefined,'item','idle','walk'])expect(weaponVisible({...state,kind})).toBe(false);
 for(const progress of [-1,1,2])expect(weaponVisible({...state,progress})).toBe(false);
 for(const flag of ['walking','hurt','collapsed'])expect(weaponVisible({...state,[flag]:true})).toBe(false);
 expect(weaponVisible({...state,kind:'skill'})).toBe(false);expect(weaponVisible({...state,kind:'skill',damagingSkill:true})).toBe(true);
});
