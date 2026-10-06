"""Custom game geometry adapter for hatch-pet's generated-output extraction.

Only removes key background, extracts existing figures, resizes and assembles.
No drawing, mirroring, warping, or synthesized character pixels.
"""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, '/home/deck/.codex/skills/hatch-pet/scripts')
from extract_strip_frames import remove_chroma_background, connected_components, component_group_image
from make_contact_sheet import checker

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
sheet = Image.new('RGBA', (448, 256))
qa = {'contract':'64x64 custom game sheet; not Codex pet atlas', 'rows':[], 'errors':[]}
for row,count in enumerate([7,7,6,6],1):
    path = ROOT / f'decoded/game-row-{row}.png'
    strip = remove_chroma_background(Image.open(path), (255,0,255), 110)
    # Key-colored antialias contamination is background, not elf colors.
    strip.putdata([(0,0,0,0) if r>110 and b>110 and g<min(r,b)*0.65 else (r,g,b,255 if a>=128 else 0)
                   for r,g,b,a in strip.getdata()])
    components=connected_components(strip)
    largest=max(c['area'] for c in components)
    major=[c for c in components if c['area']>=max(120,largest*0.18)]
    assert len(major)==count, f'row{row}: expected {count} complete sprites; got {len(major)}'
    seeds=sorted(major,key=lambda c:c['center_x'])
    ids={id(c) for c in seeds};groups=[[c] for c in seeds]
    for component in components:
        if id(component) in ids or component['area']<max(12,largest*.002):continue
        idx=min(range(count),key=lambda i:abs(seeds[i]['center_x']-component['center_x']))
        groups[idx].append(component)
    images=[component_group_image(strip,g,padding=0) for g in groups]
    normal=images[0 if row<=2 else 2]
    scale=52/normal.height
    # A single row scale preserves relative size of crouch/prone/jump sprites.
    scale=min(scale, min(60/im.width for im in images),min(59/im.height for im in images))
    rowqa={'row':row,'count':count,'scale':scale,'frames':[]}
    folder=ROOT/f'frames/game-row-{row}';folder.mkdir(parents=True,exist_ok=True)
    for col,image in enumerate(images,1):
        cellscale=scale
        replacement=ROOT/'decoded/game-row-1-cell-3.png'
        if row==1 and col==3 and replacement.exists():
            one=remove_chroma_background(Image.open(replacement),(255,0,255),110)
            one.putdata([(0,0,0,0) if r>110 and b>110 and g<min(r,b)*0.65 else (r,g,b,255 if a>=128 else 0)
                         for r,g,b,a in one.getdata()])
            cs=connected_components(one);largest_one=max(cs,key=lambda c:c['area'])
            image=component_group_image(one,[c for c in cs if c['area']>=largest_one['area']*.002],padding=0)
            cellscale=min(52/image.height,60/image.width)
        size=(max(1,round(image.width*cellscale)),max(1,round(image.height*cellscale)))
        sprite=image.resize(size,Image.Resampling.NEAREST)
        frame=Image.new('RGBA',(64,64))
        # Jump is explicitly airborne; other poses retain the common ground line.
        bottom=52 if row<=2 and col==6 else 61
        origin=((64-size[0])//2,bottom-size[1])
        assert origin[0]>=2 and origin[1]>=2,(row,col,size,origin)
        frame.alpha_composite(sprite,origin)
        frame.save(folder/f'{col:02}.png')
        sheet.alpha_composite(frame,((col-1)*64,(row-1)*64))
        rowqa['frames'].append({'column':col,'bbox':frame.getbbox(),'sourceSize':image.size})
    qa['rows'].append(rowqa)

# One shared palette for all views. Binary alpha remains intact.
alpha=sheet.getchannel('A')
rgb=sheet.convert('RGB').quantize(colors=32,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
sheet=rgb.convert('RGBA');sheet.putalpha(alpha)
dest=PROJECT/'docs/Ref/sprite/Elf Woman Warrior_hatch.png'
sheet.save(dest)
sheet.save(ROOT/'final-game-sheet.png')
display=sheet.resize((1792,1024),Image.Resampling.NEAREST)
display.save(ROOT/'display-4x.png')
contact=checker(display.size,16);contact.paste(display,(0,0),display)
contact.save(ROOT/'contact-sheet.png')
original=json.loads((ROOT/'action-source.json').read_text())
original['image']=dest.name;original['sheet']={'width':448,'height':256};original['grid']['rows']=4
original['cells']=[c for c in original['cells'] if c['row']<=4]
original['generation']={'skill':'hatch-pet','referenceIdentity':'Elf Woman Warrior canonical base',
                       'sourceActions':'Iuria Wolph_highres_v2.json','customGameGeometry':True,
                       'delegatedRows':[1,2,3,4],'mirroredRows':[]}
original['generation']['repairs']=['행별 동작·빈손·손발 자세 수정','1행 3열 걷기 셀 별도 생성']
original['notes']=[n for n in original['notes'] if '사용자 표현' not in n]
original['notes'].append('bodyPose는 원본 JSON에서 가져온 목표 손발 자세다. 생성 결과의 해부학적 좌우가 모두 독립 검증되었다는 뜻은 아니다. 걷기 두 자세의 다리 실루엣은 서로 구별되도록 수정했다.')
original['generation']['qaNotes']=['기준 외형과 모든 행을 시각 검수했다.',
    '손의 정확한 좌우 배정은 대각 시점과 가림 때문에 일부 불확실하다.',
    '각 행의 검수 영상은 포즈를 순서대로 보여주는 슬라이드이며 실제 게임 애니메이션 타이밍이 아니다.']
dest.with_suffix('.json').write_text(json.dumps(original,ensure_ascii=False,indent=2)+'\n')
for cell in original['cells']:
    rect=cell['rect'];crop=sheet.crop((rect['x'],rect['y'],rect['x']+64,rect['y']+64))
    assert (crop.getbbox() is None)==cell['empty']
assert set(alpha.getdata())=={0,255}
assert sheet.size==(448,256)
qa.update({'sheet':list(sheet.size),'occupiedCells':26,'emptyCells':2,'alpha':'binary','colors':len(set(sheet.convert('RGB').getdata())),'output':str(dest)})
qa['visualReview']={'identity':'checked','poseCount':'checked','frontBack':'checked',
    'walkLegDifference':'checked','handAnatomy':'partially_occluded','mirroring':'none',
    'reviewVideos':'pose slides, not gameplay timing'}
(ROOT/'validation-game.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps(qa,indent=2))
