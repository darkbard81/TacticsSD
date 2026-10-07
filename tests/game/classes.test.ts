import {it,expect} from 'vitest';
import {ROSTER,CLASS_ABILITIES,jobForHero,weaponFor} from '../../game/content';
import {classPartFor,CLASS_PART_IDS} from '../../game/class-standees';
import {newCampaign,encodeCampaign,parseCampaign,makeBattle} from '../../game/domain';

it('preserves roster IDs and exposes all eight art classes on usable recruits',()=>{
 expect(ROSTER.slice(0,6).map(h=>h.id)).toEqual(['erin','rowan','sera','miel','lena','iris']);
 expect(new Set(ROSTER.map((_,i)=>classPartFor(i)))).toEqual(new Set(CLASS_PART_IDS));
 for(let h=0;h<ROSTER.length;h++){
  const c=newCampaign();c.party=[h];const unit=makeBattle(0,c).units[0];
  expect(unit.classId).toBe(jobForHero(h).id);
  expect(CLASS_ABILITIES[unit.classId]).toContain(unit.abilityId);
  expect(weaponFor(h,0).family).toBe(jobForHero(h).weaponFamily);
  expect(parseCampaign(encodeCampaign(c))).toEqual(c);
 }
});
it('accepts complete current saves and rejects obsolete formats without rewriting them',()=>{
 const c=newCampaign(); const current=encodeCampaign(c); expect(parseCampaign(current)).toEqual(c);
 expect(parseCampaign(JSON.stringify(c))).toBeNull();
 const incomplete=JSON.parse(current); delete incomplete.equipment.kaela;
 const old=JSON.stringify(incomplete); expect(parseCampaign(old)).toBeNull(); expect(JSON.stringify(incomplete)).toBe(old);
});
