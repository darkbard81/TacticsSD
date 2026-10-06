import {it,expect} from 'vitest';
import {ROSTER,CLASS_ABILITIES,jobForHero,weaponFor} from '../../game/content';
import {classSpriteFor,CLASS_SPRITE_URLS} from '../../game/class-sprites';
import {newCampaign,encodeCampaign,parseCampaign,makeBattle} from '../../game/domain';
import {inventoryFor} from '../../game/shop';

it('preserves legacy roster IDs and exposes all eight art classes on usable recruits',()=>{
 expect(ROSTER.slice(0,6).map(h=>h.id)).toEqual(['erin','rowan','sera','miel','lena','iris']);
 expect(new Set(ROSTER.map((_,i)=>classSpriteFor(i)))).toEqual(new Set(Object.keys(CLASS_SPRITE_URLS)));
 for(let h=0;h<ROSTER.length;h++){
  const c=newCampaign();c.party=[h];const unit=makeBattle(0,c).units[0];
  expect(unit.classId).toBe(jobForHero(h).id);
  expect(CLASS_ABILITIES[unit.classId]).toContain(unit.abilityId);
  expect(weaponFor(h,0).family).toBe(jobForHero(h).weaponFamily);
  expect(parseCampaign(encodeCampaign(c))).toEqual(c);
 }
});
it('migrates six-recruit finite inventories once without altering owned upgrades or progress',()=>{
 const c=newCampaign();c.gear=c.gear.slice(0,6);c.gear[0].weapon=1;
 // A genuine prior-version finite inventory, including one equipped upgrade.
 c.inventory={'sword-field':1,'sword-dawn':1,'bow-field':1,'arcane-field':1,'sun-field':2,'travel-mail':6,'mend-leaf':2};
 c.gold=47;c.unlocked=1;c.cleared=[0];c.levels={knight:3};
 const old=JSON.parse(encodeCampaign(newCampaign()));old.equipment=Object.fromEntries(Object.entries(old.equipment).slice(0,6));old.equipment.erin.weaponId='sword-dawn';Object.assign(old,{inventory:c.inventory,gold:47,unlocked:1,cleared:[0],levels:c.levels});
 for(const raw of [JSON.stringify(c),JSON.stringify(old)]){
  const loaded=parseCampaign(raw)!;expect(loaded).not.toBeNull();expect(loaded.gear).toHaveLength(10);
  expect(loaded.gold).toBe(47);expect(loaded.levels).toEqual({knight:3});
  expect(inventoryFor(loaded)).toEqual({...c.inventory,'sword-field':5,'travel-mail':10});
  expect(parseCampaign(encodeCampaign(loaded))).toEqual(loaded);
 }
});
