from pathlib import Path
import sys
from PIL import Image

sys.path.insert(0, '/home/deck/.codex/skills/pixel-art-studio/scripts')
from pixelstudio import Sprite

ROOT = Path(__file__).resolve().parent
source = Image.open(ROOT / 'generated.png').convert('RGBA')
sheet = Image.new('RGBA', (448, 384))
for row, count in enumerate([7, 7, 6, 6, 3, 3]):
    for col in range(count):
        box = (round(col * source.width / 7), round(row * source.height / 6),
               round((col + 1) * source.width / 7), round((row + 1) * source.height / 6))
        frame = source.crop(box)
        frame.putalpha(frame.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
        bounds = frame.getbbox()
        if bounds is None:
            raise ValueError(f'Missing frame {row}, {col}')
        frame = frame.crop(bounds)
        scale = min(56 / frame.height, 60 / frame.width)
        frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.NEAREST)
        sheet.alpha_composite(frame, (col * 64 + (64 - frame.width) // 2, row * 64 + 62 - frame.height))
sheet.save(ROOT / 'normalized.png')
for colors in [48, 32]:
    sprite = Sprite.from_png(str(ROOT / 'normalized.png'), scale=1)
    sprite.clean(max_colors=colors, harden=True, despeckle_min=12, dedupe_tol=0)
    sprite.save_png(str(ROOT / f'pass-{colors}.png'))
    sprite.preview(str(ROOT / f'preview-{colors}.png'), scale=3)
    if colors == 32:
        destination = ROOT.parent.parent / 'docs/Ref/sprite/Iuria Wolph_highres.png'
        sprite.save_png(str(destination))
        sprite.save_png(str(ROOT / 'display-4x.png'), scale=4)
        sprite.stats()
        print(destination)
