"""Pixelize the saved ImageGen original once; author subsequent frames in JSON."""
import json
import sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'tools/pixel_sprite_tool'))
import pixel_tool as tool

# Shared material ramps: outline, leather/hair, bronze, skin, olive cloth.
COLORS = {
    '.': [0, 0, 0, 0],
    'O': [43, 33, 34, 255],
    'D': [76, 47, 35, 255],
    'B': [112, 64, 38, 255],
    'C': [151, 85, 43, 255],
    'H': [191, 119, 61, 255],
    'L': [222, 163, 92, 255],
    'G': [146, 117, 49, 255],
    'Y': [206, 172, 76, 255],
    'I': [247, 215, 137, 255],
    'S': [173, 111, 76, 255],
    'T': [224, 157, 104, 255],
    'F': [253, 198, 141, 255],
    'E': [255, 229, 184, 255],
    'V': [53, 65, 38, 255],
    'M': [89, 108, 48, 255],
    'N': [144, 153, 68, 255],
}

source = Image.open(HERE / 'base-imagegen.png').convert('RGBA')
mask = source.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
bbox = mask.getbbox()
assert bbox, 'Empty generated original'
crop = source.crop(bbox)
ratio = min(22 / crop.width, 30 / crop.height)
size = (round(crop.width * ratio), round(crop.height * ratio))
small = crop.resize(size, Image.Resampling.LANCZOS)
offset = ((24 - size[0]) // 2, 31 - size[1])
rows = [['.'] * 24 for _ in range(32)]
for y in range(small.height):
    for x in range(small.width):
        r, g, b, a = small.getpixel((x, y))
        if a < 128:
            continue
        symbol = min((k for k in COLORS if k != '.'), key=lambda k:
            2*(r-COLORS[k][0])**2 + 3*(g-COLORS[k][1])**2 + (b-COLORS[k][2])**2)
        rows[y + offset[1]][x + offset[0]] = symbol
project = {'version': 1, 'size': [24, 32], 'anchor': [12, 30],
           'palette': COLORS, 'frames': [{'name': 'base', 'duration_ms': 400,
           'rows': [''.join(row) for row in rows]}]}
tool.save(HERE / 'amazon.json', project)
tool.render(project, HERE / 'base-review', columns=1, scale=16)
tool.frame_image(project, project['frames'][0]).save(HERE / 'base.png')
(HERE / 'conversion.json').write_text(json.dumps({'source_size': source.size,
    'source_bbox': bbox, 'pixel_size': size, 'offset': offset,
    'palette_opaque': len(COLORS)-1}, indent=2) + '\n')
silhouette = tool.frame_image(project, project['frames'][0])
silhouette.paste((34, 38, 47, 255), mask=silhouette.getchannel('A'))
silhouette.resize((384, 512), Image.Resampling.NEAREST).save(HERE / 'silhouette.png')
print(json.dumps({'bbox': bbox, 'size': size, 'offset': offset}))
for y, row in enumerate(rows):
    print(f'{y:02d} {"".join(row)}')
