"""Run the video2dsprite processor and name exports by their actual action."""
import argparse
import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent
PROCESSOR = Path('/home/deck/.codex/skills/video2dsprite/scripts/video2dsprite.py')
spec = importlib.util.spec_from_file_location('video2dsprite_processor', PROCESSOR)
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


def rebuild_exports(folder, meta):
    paths = sorted((folder / 'frames-clean').glob('clean_*.png'))
    boxes = [pipeline.content_bbox(Image.open(path)) for path in paths]
    valid = [box for box in boxes if box]
    if not valid:
        raise ValueError(f'No visible character: {folder}')
    reference = valid[0]
    union = (min(b[0] for b in valid), min(b[1] for b in valid),
             max(b[2] for b in valid), max(b[3] for b in valid))
    anchor_x = (reference[0] + reference[2]) / 2
    anchor_y = reference[3]
    cell, foot_y = meta['cell_size'], meta['foot_y']
    # One affine transform for the entire clip. Hair/robe silhouette changes
    # must never change the position or scale of the body in subsequent frames.
    scale = meta['body_height'] / (reference[3] - reference[1])
    scale = min(scale,
                (cell / 2 - 2) / max(anchor_x - union[0], union[2] - anchor_x),
                (foot_y - 2) / max(1, anchor_y - union[1]))
    if union[3] > anchor_y:
        scale = min(scale, (cell - foot_y - 2) / (union[3] - anchor_y))
    source_size = Image.open(paths[0]).size
    resized_size = tuple(max(1, round(v * scale)) for v in source_size)
    scale_x, scale_y = (resized_size[i] / source_size[i] for i in (0, 1))
    destination = (round(cell / 2 - anchor_x * scale_x), round(foot_y - anchor_y * scale_y))
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=r_frame_rate', '-of', 'json', meta['video'],
    ]))
    numerator, denominator = map(int, probe['streams'][0]['r_frame_rate'].split('/'))
    duration_ms = len(paths) * 1000 * denominator / numerator
    action = meta['action']
    results = []
    for count in (8, 16, 24, 48):
        indices = pipeline.sample_indices(len(paths), count)
        frames = []
        for index in indices:
            im = Image.open(paths[index]).convert('RGBA')
            if im.size != source_size:
                raise ValueError('Source frame dimensions changed within the clip')
            canvas = Image.new('RGBA', (cell, cell))
            canvas.alpha_composite(im.resize(resized_size, Image.Resampling.LANCZOS), destination)
            frames.append(canvas)
        export = pipeline.build_exports(frames, folder / 'sprite',
                                        '' if count == 8 else f'x{count}', count)
        if count == 8:
            x8 = folder / 'sprite' / 'x8'
            x8.mkdir(exist_ok=True)
            for i, im in enumerate(frames):
                im.save(x8 / f'sprite_{i + 1:02d}.png')
        for key in ('strip', 'grid', 'gif'):
            old = Path(export[key])
            new = old.with_name(old.name.replace('run-', f'{action}-', 1))
            old.replace(new)
            export[key] = str(new)
        strip = Image.new('RGBA', (cell * count, cell))
        cols = 8 if count >= 16 else 4
        grid = Image.new('RGBA', (cell * cols, cell * ((count + cols - 1) // cols)))
        gif_frames = []
        for i, im in enumerate(frames):
            strip.alpha_composite(im, (cell * i, 0))
            grid.alpha_composite(im, (cell * (i % cols), cell * (i // cols)))
            preview = Image.new('RGBA', im.size, (30, 30, 40, 255))
            preview.alpha_composite(im)
            gif_frames.append(preview.convert('RGB').convert('P', palette=Image.Palette.ADAPTIVE, colors=255))
        strip.save(export['strip'])
        grid.save(export['grid'])
        # GIF delays are multiples of 10ms. Distribute rounding so every
        # density preserves the source clip's total duration.
        delays = [10 * (round((i + 1) * duration_ms / count / 10) -
                        round(i * duration_ms / count / 10)) for i in range(count)]
        gif_frames[0].save(export['gif'], save_all=True, append_images=gif_frames[1:],
                           duration=delays, loop=0, disposal=2)
        if count == 8:
            import shutil
            shutil.copy2(export['gif'], folder / 'sprite' / f'{action}-preview.gif')
        export.update(indices=indices, gif_ms=duration_ms / count,
                      gif_durations_ms=delays, gif_total_ms=sum(delays))
        results.append(export)
    for old in (folder / 'sprite').glob('run-*'):
        old.unlink()
    meta.update(sets=results, normalization='fixed-clip-transform-v1',
                source_anchor=[anchor_x, anchor_y], reference_bbox=reference,
                clip_union_bbox=union, resized_source_size=resized_size,
                scale_xy=[scale_x, scale_y], destination_xy=destination,
                source_duration_ms=duration_ms)
    (folder / 'pipeline-meta.json').write_text(json.dumps(meta, indent=2) + '\n')
    pipeline.write_readme(folder, meta)
    readme = folder / 'README.txt'
    readme.write_text(readme.read_text().replace('run-', f'{action}-') +
                      '\nFixed source-coordinate transform across the clip; source-duration GIF playback.\n')
    print(f'{folder.name}: rebuilt with fixed coordinates and {duration_ms / 1000:.3f}s playback', flush=True)


def process(combination, rebuild=False):
    folder = ROOT / combination
    video = folder / 'video' / f'cleric-{combination}-6s.mp4'
    if not video.is_file():
        print(f'{combination}: video not available', flush=True)
        return
    meta_path = folder / 'pipeline-meta.json'
    if meta_path.exists():
        existing = json.loads(meta_path.read_text())
        if rebuild or existing.get('normalization') != 'fixed-clip-transform-v1':
            rebuild_exports(folder, existing)
            return
        print(f'{combination}: already processed', flush=True)
        return
    subprocess.run([
        sys.executable, str(PROCESSOR), 'process', '--video', str(video),
        '--out-dir', str(folder), '--name', f'cleric-{combination}',
        '--frame-counts', '8,16,24,48', '--cell-size', '128',
        '--body-height', '100', '--foot-y', '118', '--fps', '0',
    ], check=True)
    action = combination.split('-')[1]
    for path in (folder / 'sprite').glob('run-*'):
        path.rename(path.with_name(path.name.replace('run-', f'{action}-', 1)))
    meta_text = meta_path.read_text().replace('/run-', f'/{action}-')
    meta = json.loads(meta_text)
    meta.update(view=combination.split('-')[0], action=action)
    # Alpha-composite cells so antialiased edge alpha is preserved in sheets.
    for export in meta['sets']:
        frames = [Image.open(p).convert('RGBA') for p in export['sprites']]
        strip = Image.new('RGBA', (128 * len(frames), 128))
        cols = 8 if export['count'] >= 16 else 4
        grid = Image.new('RGBA', (128 * cols, 128 * ((len(frames) + cols - 1) // cols)))
        for i, frame in enumerate(frames):
            strip.alpha_composite(frame, (128 * i, 0))
            grid.alpha_composite(frame, (128 * (i % cols), 128 * (i // cols)))
        strip.save(export['strip'])
        grid.save(export['grid'])
    meta_path.write_text(json.dumps(meta, indent=2) + '\n')
    readme = folder / 'README.txt'
    readme.write_text(readme.read_text().replace('run-', f'{action}-'))
    rebuild_exports(folder, meta)
    print(f'{combination}: complete', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('combinations', nargs='*')
    parser.add_argument('--rebuild-exports', action='store_true')
    args = parser.parse_args()
    for combination in args.combinations or [
        f'{view}-{action}' for view in ('front', 'back') for action in ('walk', 'idle', 'attack')
    ]:
        with (ROOT / combination / '.postprocess.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            process(combination, args.rebuild_exports)
