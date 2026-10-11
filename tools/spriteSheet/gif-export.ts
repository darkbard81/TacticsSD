import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export function createAnimationGif(image: HTMLImageElement, row: 0 | 1, fps: number): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D unavailable');
  const frames = Array.from({ length: 4 }, (_, column) => {
    context.clearRect(0, 0, 256, 256);
    context.drawImage(image, column * 256, row * 256, 256, 256, 0, 0, 256, 256);
    return context.getImageData(0, 0, 256, 256).data;
  });
  // One shared palette avoids color changes across frames. Reserve index 0 for transparency.
  const opaque = new Uint8Array(4 * 256 * 256 * 4);
  let count = 0;
  for (const rgba of frames) {
    for (let offset = 0; offset < rgba.length; offset += 4) {
      if (rgba[offset + 3] <= 127) continue;
      opaque.set(rgba.subarray(offset, offset + 4), count);
      count += 4;
    }
  }
  const colors = count ? quantize(opaque.subarray(0, count), 255) : [[0, 0, 0]];
  const palette = [[0, 0, 0], ...colors];
  const gif = GIFEncoder();
  // GIF delays are stored in hundredths of a second.
  const delay = Math.max(1, Math.round(100 / fps)) * 10;
  frames.forEach((rgba, frame) => {
    const index = applyPalette(rgba, colors);
    for (let pixel = 0; pixel < index.length; pixel++) {
      index[pixel] = rgba[pixel * 4 + 3] <= 127 ? 0 : index[pixel] + 1;
    }
    gif.writeFrame(index, 256, 256, {
      ...(frame === 0 ? { palette } : {}),
      transparent: true, transparentIndex: 0, delay, repeat: 0, dispose: 2,
    });
  });
  gif.finish();
  return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
}
