import { rigSchema, imageRefs, type CharacterRigData, type ImageRef } from '../tools/characterRig/domain/rig';
import { StandeeRig, type StandeeAssets } from '../tools/characterRig/runtime/standee';
import { jobForHero } from './content';
export const CLASS_PART_IDS = ['warrior', 'archer', 'wizard', 'cleric', 'spellblade', 'knight', 'terror-knight', 'berserker'] as const;
export type ClassPartId = typeof CLASS_PART_IDS[number];
const mapping: Record<string, ClassPartId> = { knight: 'knight', ranger: 'archer', arcanist: 'wizard', healer: 'cleric', sentinel: 'knight', sage: 'cleric', warrior: 'warrior', spellblade: 'spellblade', 'terror-knight': 'terror-knight', berserker: 'berserker' };
export const classPartFor = (hero: number) => mapping[jobForHero(hero).id];
const rigURLs = import.meta.glob('./assets/class-parts/*/rig.json', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const imageURLs = import.meta.glob('./assets/class-parts/*/parts.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
export type LoadedStandee = { rig: CharacterRigData; assets: StandeeAssets; template: StandeeRig };
export async function loadStandee(data: CharacterRigData, source: (ref: ImageRef) => string): Promise<LoadedStandee> {
  const rig = rigSchema.parse(data), images = new Map<string, { image: HTMLImageElement; ref: ImageRef }>();
  await Promise.all(imageRefs(rig).map(async ref => {
    const image = new Image(); image.src = source(ref); await image.decode();
    if (image.naturalWidth !== ref.width || image.naturalHeight !== ref.height) throw Error(`${ref.name}: 이미지 크기가 JSON과 다릅니다.`);
    images.set(ref.id, { image, ref });
  }));
  const assets: StandeeAssets = { get: id => id ? images.get(id) : undefined };
  const template = new StandeeRig(); template.sync(rig, assets, 'Front'); template.pose(0, 'Rest');
  return { rig, assets, template };
}
export class ClassStandees {
  readonly entries = new Map<ClassPartId, LoadedStandee>();
  readonly ready = Promise.all(CLASS_PART_IDS.map(async id => {
    const path = `./assets/class-parts/${id}/rig.json`, url = rigURLs[path];
    if (!url) throw Error(`${id}: 클래스 파츠 리그가 없습니다.`);
    const response = await fetch(url); if (!response.ok) throw Error(`${id}: 파츠를 읽지 못했습니다.`);
    this.entries.set(id, await loadStandee(await response.json(), () => imageURLs[`./assets/class-parts/${id}/parts.png`]));
  }));
  get(hero: number) { return this.entries.get(classPartFor(hero)); }
}
