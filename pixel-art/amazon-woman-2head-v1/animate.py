"""Derive four walk key poses from the finished Base; export with pixel_tool."""
import copy
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'tools/pixel_sprite_tool'))
import pixel_tool as tool

project = tool.load(HERE / 'amazon.json')
base = copy.deepcopy(project['frames'][0])
project['frames'] = [base]
left_arm = {18:(7,9),19:(6,9),20:(6,8),21:(6,8),22:(5,7),23:(5,7)}
right_arm = {18:(16,17),19:(16,17),20:(16,17),21:(16,18),22:(18,20),23:(18,20)}
core = [list(row) for row in base['rows']]
for limb in (left_arm, right_arm):
    for y,(x0,x1) in limb.items():
        for x in range(x0,x1+1): core[y][x] = '.'
for y in range(25,32): core[y] = ['.']*24

poses = [
 {'name':'walk_00_left_contact', 'duration':160, 'bob':0,
  'arms':[(7,18,'OTT'),(6,19,'OST'),(6,20,'OGB'),(6,21,'OBD'),(7,22,'OTF'),
          (16,18,'OT'),(17,19,'TT'),(17,20,'OGB'),(18,21,'OBD'),(18,22,'OGB'),(19,23,'TFO'),(19,24,'TTO')],
  'legs':[(8,25,'OTTBO'),(8,26,'FTTO'),(7,27,'OGYBO'),(7,28,'OBCDO'),(6,29,'OBCDDO'),(6,30,'OOOOOO'),
          (14,25,'OSTO'),(14,26,'STBO'),(14,27,'OGBO'),(13,28,'OBDO'),(13,29,'OOOO')]},
 {'name':'walk_01_right_pass', 'duration':120, 'bob':-1,
  'arms':[(7,18,'OTT'),(6,19,'OTT'),(6,20,'OGB'),(6,21,'OBD'),(6,22,'OTF'),(6,23,'OTO'),
          (16,18,'OT'),(17,19,'TTO'),(17,20,'OGB'),(17,21,'OBD'),(18,22,'TFO'),(18,23,'TTO')],
  'legs':[(9,24,'OTTO'),(9,25,'FTTO'),(9,26,'OGBO'),(9,27,'OBCO'),(9,28,'OBDO'),(9,29,'OBCDO'),(9,30,'OOOOO'),
          (14,24,'OSTO'),(15,25,'TTO'),(16,26,'OGBO'),(16,27,'OBDO'),(15,28,'OOOO')]},
 {'name':'walk_02_right_contact', 'duration':160, 'bob':0,
  'arms':[(7,18,'OTT'),(6,19,'FTT'),(5,20,'OGB'),(4,21,'OBD'),(4,22,'OGB'),(4,23,'OTF'),(5,24,'OTT'),
          (16,18,'ST'),(16,19,'TTO'),(17,20,'OGB'),(16,21,'OBD'),(16,22,'OTT')],
  'legs':[(8,25,'OSTO'),(8,26,'STBO'),(9,27,'OGBO'),(9,28,'OBDO'),(9,29,'OOOO'),
          (14,25,'OTTBO'),(14,26,'FTTO'),(15,27,'OGYBO'),(15,28,'OBCDO'),(15,29,'OBCDDO'),(15,30,'OOOOOO')]},
 {'name':'walk_03_left_pass', 'duration':120, 'bob':-1,
  'arms':[(7,18,'OTT'),(6,19,'OTT'),(6,20,'OGB'),(5,21,'OBD'),(5,22,'OTF'),(5,23,'OTO'),
          (16,18,'OT'),(17,19,'TTO'),(17,20,'OGB'),(17,21,'OBD'),(17,22,'TFO'),(17,23,'TTO')],
  'legs':[(8,24,'OSTO'),(7,25,'TTO'),(7,26,'OGBO'),(8,27,'OBDO'),(8,28,'OOOO'),
          (14,24,'OTTO'),(14,25,'FTTO'),(14,26,'OGBO'),(14,27,'OBCO'),(14,28,'OBDO'),(13,29,'OBCDO'),(13,30,'OOOOO')]},
]

for pose in poses:
    rows = [['.']*24 for _ in range(32)]
    dy = pose['bob']
    for y,row in enumerate(core):
        for x,c in enumerate(row):
            if c != '.': rows[y+dy][x] = c
    for x,y,run in pose['arms']:
        rows[y+dy][x:x+len(run)] = list(run)
    for x,y,run in pose['legs']:
        rows[y][x:x+len(run)] = list(run)
    frame = copy.deepcopy(base)
    frame.update(name=pose['name'], duration_ms=pose['duration'])
    project['frames'].append(frame)
    edits = [[x,y,c] for y,row in enumerate(rows) for x,c in enumerate(row)
             if c != frame['rows'][y][x]]
    (HERE / (pose['name']+'-edits.json')).write_text(json.dumps(edits, indent=2)+'\n')
    project = tool.paint(project, pose['name'], edits)

tool.save(HERE / 'amazon.json', project)
print(json.dumps(tool.render(project, HERE / 'sprite-sheet', columns=5, scale=10)))
frames = [tool.frame_image(project, f) for f in project['frames'][1:]]
durations = [f['duration_ms'] for f in project['frames'][1:]]
preview = []
for img in frames:
    backdrop = Image.new('RGBA', img.size, '#e4e7df')
    backdrop.alpha_composite(img)
    preview.append(backdrop.convert('RGB').resize((240,320), Image.Resampling.NEAREST))
preview[0].save(HERE / 'walk-preview.gif', save_all=True, append_images=preview[1:],
                duration=durations, loop=0, disposal=2)
silhouettes = Image.new('RGB',(240*5,320),'#e4e7df')
for i,frame in enumerate(project['frames']):
    img = tool.frame_image(project,frame)
    silhouette = Image.new('RGBA',img.size)
    silhouette.paste((34,38,47,255),mask=img.getchannel('A'))
    silhouettes.paste(silhouette.resize((240,320),Image.Resampling.NEAREST),(i*240,0),
                      silhouette.getchannel('A').resize((240,320),Image.Resampling.NEAREST))
silhouettes.save(HERE / 'silhouette-review.png')
(HERE / 'animations.json').write_text(json.dumps({
    'direction':'front_three_quarter_right', 'base':'base',
    'walk':{'frames':[f['name'] for f in project['frames'][1:]],'loop':True,
            'duration_ms':durations}, 'anchor_px':[12,30],
    'proportion':'head 15 px, body and legs 15 px', 'palette_opaque':16},indent=2)+'\n')
