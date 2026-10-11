"""Authored cleanup of the ImageGen downsample, using the registered tool API."""
import json
import sys
import shutil
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'tools/pixel_sprite_tool'))
import pixel_tool as tool

draft = HERE / 'amazon-quantized.json'
if not draft.exists():
    shutil.copyfile(HERE / 'amazon.json', draft)
project = tool.load(draft)
# Per-row pixel runs traced from the generated silhouette. Head: y1..15;
# torso/legs: y16..30. Clear face, bronze band, olive armor, leather skirt.
runs = {
 1: (9, 'OOOOOO'),
 2: (8, 'OBCCCCBOOO'),
 3: (6, 'OBCHHHCCCBBO'),
 4: (5, 'OBCHHLHHCCBBBO'),
 5: (5, 'OCHHHHCCCBGYOBO'),
 6: (5, 'OCHHCCCBGYYIGBO'),
 7: (4, 'OBCHCCCBGYYYGCCBO'),
 8: (4, 'OBCCCCBTTFFFTTBCO'),
 9: (4, 'OBCCCBTOOTFFOTBCO'),
10: (3, 'OBCCBCTEOFFFOEBCBO'),
11: (3, 'OBCCBCTFOFFFOFBCO'),
12: (3, 'OBCCBCTFFFFFFTBCO'),
13: (4, 'OBCCBCTFFFTFTBCO'),
14: (5, 'OBBBBCSTTTTBBO'),
15: (7, 'OOOBSTTBOOO'),
16: (7, 'OGYGBTTBGYO'),
17: (7, 'OYIGVTTMGYO'),
18: (7, 'OTTVMNMVVTO'),
19: (6, 'OTTOVMNMOFTO'),
20: (6, 'OBDOOVVVOOTO'),
21: (6, 'OGBOBDYGOBDBO'),
22: (5, 'OTFOBVMDBVMOBO'),
23: (5, 'OTTOBVMGBVMOTFO'),
24: (8, 'OBVDBDVBO'),
25: (8, 'OTTBOOTTBO'),
26: (8, 'OSTO..OSTO'),
27: (8, 'OGBO..OGBO'),
28: (8, 'OBDO..OBDO'),
29: (7, 'OBCDO..OBCDO'),
30: (7, 'OOOOO..OOOOO'),
}
rows = [['.']*24 for _ in range(32)]
for y, (x, run) in runs.items():
    rows[y][x:x+len(run)] = list(run)
for x,y in [(9,20),(9,21),(8,22),(8,23),(17,22),(17,23)]:
    rows[y][x] = '.'
rows[22][18:21] = list('OBO')
rows[23][18:21] = list('TFO')
rows[13][14] = 'S'
edits = [[x,y,c] for y,row in enumerate(rows) for x,c in enumerate(row)
         if c != project['frames'][0]['rows'][y][x]]
(HERE / 'base-cleanup-edits.json').write_text(json.dumps(edits, indent=2)+'\n')
project = tool.paint(project, 'base', edits)
tool.save(HERE / 'amazon.json', project)
tool.render(project, HERE / 'base-review', columns=1, scale=16)
base = tool.frame_image(project, project['frames'][0])
base.save(HERE / 'base.png')
base.resize((240,320), Image.Resampling.NEAREST).save(HERE / 'base-preview.png')
silhouette = Image.new('RGBA', base.size, (0,0,0,0))
silhouette.paste((34,38,47,255), mask=base.getchannel('A'))
silhouette.resize((384,512), Image.Resampling.NEAREST).save(HERE / 'silhouette.png')
print(f'Base cleaned: {len(edits)} pixel edits, {len(project["palette"])-1} opaque colors')
