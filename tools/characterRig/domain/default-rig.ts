import data from '../assets/default-rig.json';
import { parseRig, resetPlacement, type Part, type RigView, type ViewId } from './rig';

/** Both views share one atlas, but have independent crops, pivots, rest poses and draw order. */
export const createDefaultRig = () => parseRig(JSON.stringify(data));
export const DEFAULT_SHEET_URL = new URL('../assets/elf-parts-sheet.png', import.meta.url).href;

/** Atlas presets reset to their assembled pose, while ordinary images reset to source placement. */
export function resetEditorPlacement(part: Part, view: RigView, viewId: ViewId) {
  const preset = data.views[viewId];
  if (view.image?.id !== preset.image.id) { resetPlacement(part, view); return; }
  const original = preset.parts.find(p => p.id === part.id)!;
  part.restTransform = {
    ...original.restTransform,
    x: original.restTransform.x + part.rect.x + part.pivot.x - original.rect.x - original.pivot.x + preset.ground.x - view.ground.x,
    y: original.restTransform.y + part.rect.y + part.pivot.y - original.rect.y - original.pivot.y + preset.ground.y - view.ground.y,
  };
}
