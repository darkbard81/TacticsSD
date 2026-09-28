import data from '../assets/default-rig.json';
import { rigSchema, identity, updateGeometry, type Part, type RigView, type ViewId } from './rig';

export const createDefaultRig = () => rigSchema.parse(data);
export const DEFAULT_SHEET_URL = new URL('../assets/elf-parts-sheet.png', import.meta.url).href;

/** Reset offsets for ordinary rigs; restore the authored joints for the bundled atlas. */
export function resetEditorPlacement(part: Part, view: RigView, viewId: ViewId) {
  const preset = createDefaultRig().views[viewId];
  if (view.image?.id !== preset.image?.id) { part.restTransform = identity(); return; }
  const original = preset.parts.find(p => p.id === part.id)!;
  const rect = part.rect, pivot = part.pivot;
  part.attachment = structuredClone(original.attachment);
  part.restTransform = { ...original.restTransform };
  if (!part.attachment.parentId) {
    part.attachment.socket.x += preset.ground.x - view.ground.x;
    part.attachment.socket.y += preset.ground.y - view.ground.y;
  }
  part.pivot = { ...original.pivot };
  updateGeometry(part, rect, pivot);
}
