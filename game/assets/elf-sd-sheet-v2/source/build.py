from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import json, hashlib
import numpy as np
from components import components

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent
OUT.mkdir(exist_ok=True)
(OUT/'frames').mkdir(exist_ok=True)
base=Image.open(ROOT/'generated.png').convert('RGBA')
walk=Image.open(ROOT/'walk-contacts.png').convert('RGBA')
actions=Image.open(ROOT/'actions.png').convert('RGBA')
CELL=256
sheet=Image.new('RGBA',(1792,1024))
records=[]
frames={}
# Calibrate each coherent generation group once to the same ~190px standing
# body scale. Never fit individual bounding boxes, stretch, rotate or mirror.
group_scales={'base':0.72,'walk':0.324,'actions':0.49}
groups={}
for gn,im,split in [('base',base,275),('walk',walk,610),('actions',actions,407)]:
    cs=components(im)
    if gn=='base': cs=[c for c in cs if (c[1][1]+c[1][3])/2<542]
    groups[gn]=[sorted([c for c in cs if ((c[1][1]+c[1][3])/2<split)==(r==0)],key=lambda c:c[1][0]) for r in range(2)]
semantics=[['idle','walk_right','walk_left','hurt','jump1','jump2','jump3']]*2+[['collapse','attack1','attack2','attack3','attack4','attack5']]*2
def clean(im):
    a=np.array(im)
    a[a[:,:,3]<=8]=0
    return Image.fromarray(a)
for row,names in enumerate(semantics):
    facing='front' if row%2==0 else 'back'
    for col,name in enumerate(names):
        group='base'
        airborne=20 if name=='jump2' else 30 if name=='jump3' else 0
        if row<2:
            xs=[0,300,532,754,983,1193,1440,1659]
            ys=[0,275,542]
            rect=(xs[col],ys[row],xs[col+1],ys[row+1])
            src=base
            # Horizontal registration at the midpoint of ground contacts,
            # not the changing hand/ponytail silhouette.
            centers=[153,402,630,867,1080,1296,1550]
            center=centers[col]-xs[col]
            if name.startswith('walk'):
                group='walk';src=walk
                wc=col-1
                wx=[0,635,1269];wy=[0,610,1240]
                rect=(wx[wc],wy[row],wx[wc+1],wy[row+1])
                center=[370,975][wc]-wx[wc]
        else:
            group='actions';src=actions
            ax=[0,487,755,1066,1424,1704,1942]
            ay=[0,407,809]
            ar=row-2
            rect=(ax[col],ay[ar],ax[col+1],ay[ar+1])
            center=[249,610,913,1220,1540,1815][col]-ax[col]
        source_center=rect[0]+center
        sr=row if row<2 else row-2
        sc=col-1 if group=='walk' else col
        _,rect,pts=groups[group][sr][sc]
        center=source_center-rect[0]
        raw=clean(src.crop(rect))
        mask=Image.new('L',raw.size)
        ma=np.zeros((raw.height,raw.width),dtype=np.uint8)
        for px,py in pts: ma[py-rect[1],px-rect[0]]=255
        mask=Image.fromarray(ma).filter(ImageFilter.MaxFilter(3))
        arr=np.array(raw);arr[np.array(mask)==0]=0;raw=Image.fromarray(arr)
        box=raw.getbbox()
        assert box, (row,col)
        scale=group_scales[group]
        crop=raw.crop(box)
        size=(round(crop.width*scale),round(crop.height*scale))
        resized=crop.resize(size,Image.Resampling.LANCZOS)
        x=round(128-(center-box[0])*scale)
        y=230-airborne-size[1]
        assert x>=8 and y>=8 and x+size[0]<=248 and y+size[1]<=248,(row,col,x,y,size)
        canvas=Image.new('RGBA',(256,256))
        canvas.alpha_composite(resized,(x,y))
        ident=f'{facing}_{name}'
        frames[ident]=canvas
        canvas.save(OUT/'frames'/f'{ident}.png')
        sheet.alpha_composite(canvas,(col*256,row*256))
        records.append({'id':ident,'semantic':name,'facing':facing,'row':row+1,'column':col+1,'rect':{'x':col*256,'y':row*256,'w':256,'h':256},'anchor':{'x':128,'y':230},'airborneOffsetY':-airborne,'alphaBounds':list(canvas.getbbox()),'sourceGroup':group,'sourceRect':list(rect),'groupScale':scale})
sheet.save(OUT/'elf-adult-26pose-sheet.png')
seq={'idle':['idle'],'walk':['idle','walk_right','idle','walk_left'],'hurt':['idle','hurt','idle'],'jump':['idle','jump1','jump2','jump3','jump2','jump1','idle'],'collapse':['idle','hurt','collapse','collapse'],'common_attack':['idle','attack1','attack2','attack3','attack4','attack5','idle'],'item':['idle','jump3','jump2','idle']}
manifest={'schema':'tacticssd.sprite-sheet.v2','image':'elf-adult-26pose-sheet.png','width':1792,'height':1024,'cell':{'width':256,'height':256},'columns':7,'rows':4,'poseCount':26,'blankCells':[{'row':3,'column':7},{'row':4,'column':7}],'character':{'identity':'adult silver-haired elf woman','flying':False},'normalization':{'sharedAnchor':[128,230],'groupScales':group_scales,'method':'One uniform scale per source generation group, calibrated to approximately 190px standing height. No per-frame bounding-box fit, rotation, mirroring, or anatomy warp. Preserve crouch/collapse size and explicit jump height.','alphaThreshold':8},'frames':records,'sequences':{face:{k:[f'{face}_{s}' for s in v] for k,v in seq.items()} for face in ['front','back']},'actionAliases':{'melee':'common_attack','bow':'common_attack','spell':'common_attack'},'semanticsProvenance':'User-defined intended game semantics; not a verified historical PSP animation sequence.'}
(OUT/'frames.json').write_text(json.dumps(manifest,indent=2)+'\n')
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(font,17)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
review=Image.new('RGB',(1792,1200),'#172333')
d=ImageDraw.Draw(review)
for r in range(4):
    for c in range(7):
        x=c*256;y=r*300
        for ty in range(0,256,16):
            for tx in range(0,256,16):
                d.rectangle((x+tx,y+ty,x+tx+15,y+ty+15),fill='#344459' if (tx//16+ty//16)%2 else '#2c3b50')
        tile=sheet.crop((c*256,r*256,c*256+256,r*256+256))
        review.paste(tile,(x,y),tile)
        d.line((x+14,y+230,x+242,y+230),fill='#73899f',width=1)
        d.line((x+124,y+230,x+132,y+230),fill='#8de0bd',width=2)
        label=f'{r+1}.{c+1}  '+(('front ' if r%2==0 else 'back ')+semantics[r][c] if c<len(semantics[r]) else 'EMPTY')
        d.text((x+12,y+268),label,fill='white',font=font)
review.save(OUT/'elf-26pose-labelled-review.png')
# Compact exact-pose preview: front/back side by side, every requested motion.
movie=[];durations=[]
for action,steps in seq.items():
    for step in steps:
        im=Image.new('RGB',(576,328),'#1d2938');draw=ImageDraw.Draw(im)
        draw.text((18,12),f'{action.replace("_"," ").upper()}  /  {step}',font=font,fill='white')
        for i,face in enumerate(['front','back']):
            x=24+i*280
            draw.line((x+10,276,x+246,276),fill='#74879b')
            tile=frames[f'{face}_{step}'];im.paste(tile,(x,46),tile)
            draw.text((x+104,305),face,font=small,fill='#b4c6d8')
        movie.append(im);durations.append(320 if step!='idle' else 480)
movie[0].save(OUT/'elf-motion-preview.gif',save_all=True,append_images=movie[1:],duration=durations,loop=0,disposal=2)
movie[0].save(OUT/'elf-motion-preview.webp',save_all=True,append_images=movie[1:],duration=durations,loop=0,lossless=True)
flight={'schema':'tacticssd.optional-flight-extension.v1','status':'specification-only; no flying elf art produced','imageSize':[1792,1536],'cellSize':[256,256],'columns':7,'rows':6,'baseRows':'Rows1-4 identical to 26-pose base','extraPoseCount':6,'totalPoseCount':32,'flightRows':[{'row':5,'facing':'front','poses':['flight1','flight2','flight3',None,None,None,None]},{'row':6,'facing':'back','poses':['flight1','flight2','flight3',None,None,None,None]}],'frames':[{'id':f'{face}_flight{c+1}','rect':{'x':c*256,'y':r*256,'w':256,'h':256},'anchor':{'x':128,'y':230}} for r,face in [(4,'front'),(5,'back')] for c in range(3)],'suggestedSequence':['flight1','flight2','flight3','flight2'],'reference':'Additional paired three-pose flight/wing rows visually inspected in Divine Knight and Iuria Wolph. Phase labels are intended game semantics, not verified original playback order.','ordinaryElf':'flying=false; do not append wings or manufacture frames; enable extension only for a separately requested flying unit.'}
(OUT/'optional-flight-extension.json').write_text(json.dumps(flight,indent=2)+'\n')
stats={'dimensions':list(sheet.size),'mode':sheet.mode,'poseCount':len(records),'transparentPixels':int((np.array(sheet)[:,:,3]==0).sum()),'uniqueFrameHashes':len({hashlib.sha256(v.tobytes()).hexdigest() for v in frames.values()}),'allFrameMarginsAtLeast8px':all(min(*r['alphaBounds'][:2],256-r['alphaBounds'][2],256-r['alphaBounds'][3])>=8 for r in records),'blankCellAlphaMax':[sheet.crop((1536,r*256,1792,(r+1)*256)).getchannel('A').getextrema()[1] for r in [2,3]],'validationScope':'Asset-level inspection and exact sequence preview; no game runtime integration or change.'}
(OUT/'validation.json').write_text(json.dumps(stats,indent=2)+'\n')
print(json.dumps(stats,indent=2))
