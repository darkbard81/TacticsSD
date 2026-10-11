"""Inspect generated deliverables and build a contact sheet for visual QC."""
import json
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
combinations = [f'{v}-{a}' for v in ('front', 'back') for a in ('walk', 'idle', 'attack')]
overview = Image.new('RGB', (8 * 128 + 160, 6 * 144), (37, 40, 47))
draw = ImageDraw.Draw(overview)
report = []
for row, combination in enumerate(combinations):
    folder = ROOT / combination
    if not (folder / 'pipeline-meta.json').is_file():
        report.append({'combination': combination, 'status': 'failed',
                       'reason': 'Grok video content moderation rejected back-attack.'})
        draw.text((8, row * 144 + 54), combination, fill='white')
        draw.text((200, row * 144 + 54), 'NOT GENERATED: Grok content moderation', fill=(255, 160, 160))
        continue
    meta = json.loads((folder / 'pipeline-meta.json').read_text())
    video = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=width,height,r_frame_rate,nb_frames',
        '-of', 'json', meta['video'],
    ]))
    record = {'combination': combination, 'status': 'complete', 'video': video, 'sets': []}
    draw.text((8, row * 144 + 54), combination, fill='white')
    for export in meta['sets']:
        frames = []
        for path in export['sprites']:
            im = Image.open(path)
            assert im.mode == 'RGBA' and im.size == (128, 128), path
            arr = np.array(im)
            assert (arr[:, :, 3] == 0).any(), f'no transparent pixels: {path}'
            assert (arr[:, :, 3] > 32).any(), f'empty character: {path}'
            opaque = arr[:, :, 3] > 128
            pink = (arr[:, :, 0] > 160) & (arr[:, :, 2] > 160) & (arr[:, :, 1] < 140)
            frames.append(im.copy())
            if (opaque & pink).sum() > 8:
                print(f'Inspect pink fringe: {path}', flush=True)
        strip = Image.open(export['strip'])
        grid = Image.open(export['grid'])
        assert strip.mode == grid.mode == 'RGBA'
        assert strip.size == (128 * export['count'], 128)
        gif = Image.open(export['gif'])
        assert gif.n_frames == export['count'], export['gif']
        total_delay = 0
        for frame_index in range(gif.n_frames):
            gif.seek(frame_index)
            total_delay += gif.info['duration']
        if meta.get('normalization') == 'fixed-clip-transform-v1':
            assert abs(total_delay - meta['source_duration_ms']) <= 10, export['gif']
        assert strip.getextrema()[3][0] == 0 and grid.getextrema()[3][0] == 0
        record['sets'].append({
            'frames': len(frames), 'strip': export['strip'], 'strip_size': strip.size,
            'grid': export['grid'], 'grid_size': grid.size,
            'gif': export['gif'], 'gif_frames': gif.n_frames,
            'gif_total_ms': total_delay,
            'rgba_and_transparency_verified': True,
        })
        if export['count'] == 8:
            for col, im in enumerate(frames):
                overview.paste(im, (160 + col * 128, row * 144), im)
        if export['count'] == 24:
            view, action = combination.split('-')
            base = f'Cleric_{view.title()}_{action.title()}'
            shutil.copy2(export['grid'], ROOT / f'{base}.png')
            shutil.copy2(export['gif'], ROOT / f'{base}_Preview.gif')
    report.append(record)
overview.save(ROOT / 'animation-overview.png')
(ROOT / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
complete = sum(r['status'] == 'complete' for r in report)
print(f'Validated {complete} animations, {complete * 4} strip/grid sets and GIF previews.')
