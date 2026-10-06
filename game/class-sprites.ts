import { jobForHero } from './content';

export const CLASS_SPRITE_URLS = {
    'warrior': new URL('./assets/classes/warrior/sheet.png', import.meta.url).href,
    'archer': new URL('./assets/classes/archer/sheet.png', import.meta.url).href,
    'wizard': new URL('./assets/classes/wizard/sheet.png', import.meta.url).href,
    'cleric': new URL('./assets/classes/cleric/sheet.png', import.meta.url).href,
    'spellblade': new URL('./assets/classes/spellblade/sheet.png', import.meta.url).href,
    'knight': new URL('./assets/classes/knight/sheet.png', import.meta.url).href,
    'terror-knight': new URL('./assets/classes/terror-knight/sheet.png', import.meta.url).href,
    'berserker': new URL('./assets/classes/berserker/sheet.png', import.meta.url).href,
} as const;
export type ClassSprite = keyof typeof CLASS_SPRITE_URLS;
// Legacy class IDs retain their gameplay; sentinel/sage share the matching archetype art.
const mapping: Record<string, ClassSprite> = {knight:'knight', ranger:'archer', arcanist:'wizard', healer:'cleric', sentinel:'knight', sage:'cleric', warrior:'warrior', spellblade:'spellblade', 'terror-knight':'terror-knight', berserker:'berserker'};
export const classSpriteFor = (hero: number): ClassSprite => mapping[jobForHero(hero).id];
