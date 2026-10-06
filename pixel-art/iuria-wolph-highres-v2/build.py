"""Deterministic original-pixel reconstruction, no generative model.

Scale2x refines diagonal corners using only neighboring source colors.
Frames retain their vertical position within original 32-pixel row windows.
"""
from pathlib import Path
import json
import sys
from PIL import Image

sys.path.insert(0, '/home/deck/.codex/skills/pixel-art-studio/scripts')
from pixelstudio import Sprite

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent
SOURCE = PROJECT / 'docs/Ref/sprite/Iuria Wolph.png'
DESTINATION = PROJECT / 'docs/Ref/sprite/Iuria Wolph_highres_v2.png'
source = Image.open(SOURCE).convert('RGBA')
background = source.getpixel((0, 0))
CLEAR = (0, 0, 0, 0)


def scale2x(image):
    result = Image.new('RGBA', (image.width * 2, image.height * 2))
    def at(x, y):
        return image.getpixel((max(0, min(x, image.width - 1)),
                               max(0, min(y, image.height - 1))))
    for y in range(image.height):
        for x in range(image.width):
            b, d, e, f, h = at(x, y-1), at(x-1, y), at(x, y), at(x+1, y), at(x, y+1)
            values = [e, e, e, e]
            if b != h and d != f:
                values = [d if d == b else e, f if b == f else e,
                          d if d == h else e, f if h == f else e]
            for index, color in enumerate(values):
                result.putpixel((x*2 + index % 2, y*2 + index // 2), color)
    return result


baseline = Image.new('RGBA', (448, 384))
refined = Image.new('RGBA', baseline.size)
frames = []
for row, count in enumerate([7, 7, 6, 6, 3, 3]):
    top = 8 + row * 32
    strip = source.crop((0, top, 148, top + 32))
    strip.putdata([CLEAR if p == background else p for p in strip.getdata()])
    alpha = strip.getchannel('A')
    spans, start = [], None
    for x in range(149):
        occupied = x < 148 and alpha.crop((x, 0, x+1, 32)).getbbox() is not None
        if occupied and start is None:
            start = x
        if not occupied and start is not None:
            spans.append((start, x))
            start = None
    assert len(spans) == count, (row, spans)
    for col, (left, right) in enumerate(spans):
        # Original colors, pose, and vertical animation offsets are retained.
        frame = strip.crop((left, 0, right, 32))
        canvas = Image.new('RGBA', (32, 32))
        offset = (32 - frame.width) // 2
        canvas.alpha_composite(frame, (offset, 0))
        nearest = canvas.resize((64, 64), Image.Resampling.NEAREST)
        smooth = scale2x(canvas)
        baseline.alpha_composite(nearest, (col*64, row*64))
        refined.alpha_composite(smooth, (col*64, row*64))
        frames.append({'index': len(frames), 'row': row, 'column': col,
                       'source': [left, top, right-left, 32],
                       'destination': [col*64, row*64, 64, 64]})

baseline.save(ROOT / 'pass-1-nearest.png')
refined.save(ROOT / 'pass-2-scale2x.png')
sprite = Sprite.from_png(str(ROOT / 'pass-2-scale2x.png'), scale=1)
sprite.save_png(str(DESTINATION))
sprite.preview(str(ROOT / 'preview.png'), scale=3)
sprite.save_png(str(ROOT / 'display-4x.png'), scale=4)
palette = {p for p in strip.getdata() if p[3]}
source_colors = {p for p in source.crop((0, 8, 148, 200)).getdata() if p != background}
result_colors = {p for p in refined.getdata() if p[3]}
assert result_colors <= source_colors
assert set(refined.getchannel('A').getdata()) == {0, 255}
assert len(frames) == 32
assert all(refined.crop(tuple([f['destination'][0], f['destination'][1],
                              f['destination'][0]+64, f['destination'][1]+64])).getbbox()
           for f in frames)
(ROOT / 'frames.json').write_text(json.dumps({'cell': [64,64], 'sheet': [448,384],
    'method': 'original palette Scale2x; no generated detail', 'frames': frames}, indent=2))
print(f'Validated: {len(frames)} frames; {len(result_colors)} original colors; binary alpha')
print(DESTINATION)
