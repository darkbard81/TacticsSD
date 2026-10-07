"""Recrop native ImageGen sheets; requires Pillow. Run from any directory."""
from PIL import Image
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1] / 'assets' / 'terrain-painted'
registry = json.loads((root / 'registry.json').read_text())
top = Image.open(root / 'sources' / 'tops-source.png')
side = Image.open(root / 'sources' / 'sides-source.png')
for material in registry['materials']:
    top.crop(material['topBox']).save(root / material['top'])
    side_source = Image.open(root / 'sources' / material['sideSource']) if 'sideSource' in material else side
    side_source.crop(material['sideBox']).save(root / material['side'])
    if 'baseFoam' in material:
        side_source.crop(material['baseFoamBox']).save(root / material['baseFoam'])
print(f"Recropped {len(registry['materials'])} tops and paired long sides; native texels preserved.")

