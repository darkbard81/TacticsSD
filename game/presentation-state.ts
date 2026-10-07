/** Pure presentation rule: equipment is visible only in a live damaging attack. */
export function weaponVisible(state: { kind?: string; progress: number; damagingSkill: boolean; walking: boolean; hurt: boolean; collapsed: boolean }) {
  return state.progress >= 0 && state.progress < 1 && !state.walking && !state.hurt && !state.collapsed && (state.kind === 'attack' || (state.kind === 'skill' && state.damagingSkill));
}
