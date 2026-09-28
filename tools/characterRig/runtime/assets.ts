import { ImageSource, Texture } from 'pixi.js';
import { imageRefs, type CharacterRigData, type ImageRef } from '../domain/rig';
export type Asset = { image: HTMLImageElement; texture: Texture; url: string; owned: boolean; ref: ImageRef };
export class RigAssets {
  private entries = new Map<string, Asset>();
  get(id: string | undefined) { return id ? this.entries.get(id) : undefined; }
  get count() { return this.entries.size; }
  async decode(url: string, name: string, id: string, owned = false): Promise<Asset> {
    const image = new Image();
    try {
      image.src = url; await image.decode();
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192) throw new Error('이미지는 한 변 8192px 이하로 준비해 주세요.');
      const ref = { id, name, width: image.naturalWidth, height: image.naturalHeight };
      return { image, texture: new Texture({ source: new ImageSource({ resource: image, autoGenerateMipmaps: true, scaleMode: 'linear' }) }), url, owned, ref };
    } catch (error) { if (owned) URL.revokeObjectURL(url); if (error instanceof DOMException) throw new Error('이미지를 읽을 수 없습니다. 올바른 PNG/WebP/JPG 파일인지 확인해 주세요.'); throw error; }
  }
  async file(file: File, id: string = crypto.randomUUID()) {
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) throw new Error('PNG, WebP 또는 JPG 이미지를 선택해 주세요.');
    if (file.size > 32 * 1024 * 1024) throw new Error('이미지는 32MB 이하로 준비해 주세요.');
    return this.decode(URL.createObjectURL(file), file.name, id, true);
  }
  put(asset: Asset) { this.remove(asset.ref.id); this.entries.set(asset.ref.id, asset); }
  release(asset: Asset) { asset.texture.destroy(true); if (asset.owned) URL.revokeObjectURL(asset.url); }
  private remove(id: string) { const asset = this.entries.get(id); if (asset) { this.release(asset); this.entries.delete(id); } }
  prune(rig: CharacterRigData) { const used = new Set(imageRefs(rig).map(r => r.id)); for (const id of this.entries.keys()) if (!used.has(id)) this.remove(id); }
  missing(rig: CharacterRigData) { return imageRefs(rig).filter(ref => !this.get(ref.id)); }
  destroy() { for (const id of this.entries.keys()) this.remove(id); }
}
