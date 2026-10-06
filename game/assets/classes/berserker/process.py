from PIL import Image,ImageDraw
import numpy as np,json,hashlib
from pathlib import Path
import sys
sys.path.insert(0,'/home/deck/.codex/skills/generate2dsprite/scripts')
import generate2dsprite as processor
P=Path(__file__).parent
(P/'frames').mkdir(exist_ok=True)
def group(name,cols,rows,refids):
    src=Image.open(P/'raw'/f'{name}.png').convert('RGBA')
    # Skill processor performs chroma key and edge-aware flood cleanup only.
    clean=Image.open(P/'raw'/f'{name}-clean.png').convert('RGBA') if (P/'raw'/f'{name}-clean.png').exists() else processor.remove_bg_magenta(src,100,170)
    arr=np.array(clean)
    r,g,b=arr[:,:,0].astype(float),arr[:,:,1].astype(float),arr[:,:,2].astype(float)
    fringe=(r>90)&(b>65)&(b>r*.5)&(g<r*.68)&(g<b*.72)
    arr[fringe]=0
    clean=Image.fromarray(arr)
    clean.save(P/'raw'/f'{name}-clean.png')
    cw,ch=clean.width//cols,clean.height//rows
    frames=[clean.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch)) for r in range(rows) for c in range(cols)]
    if name=='jump':
        cut=500
        frames=[clean.crop((c*cw,y0,(c+1)*cw,y1)) for y0,y1 in [(0,cut),(cut,clean.height)] for c in range(cols)]
    if name=='injury':
        cut=int(clean.width*.44)
        frames=[clean.crop((x0,r*ch,x1,(r+1)*ch)) for r in range(rows) for x0,x1 in [(0,cut),(cut,clean.width)]]
    boxes=[f.getbbox() for f in frames]
    heights=[boxes[i][3]-boxes[i][1] for i in refids]
    # One scalar per generated action grid; never resize individual poses.
    scale=190/float(np.median(heights))
    if name=='jump':scale=base_scale*.92
    info={'rawSize':list(src.size),'grid':[cols,rows],'scale':scale,'referenceFrames':refids,'rawBounds':boxes}
    return frames,scale,info
allgroups={}; infos={}
for name,cols,rows,ids in [('locomotion',3,2,[0,3]),('walk2',2,2,[0,1,2,3]),('alternate',2,2,[0,1,2,3]),('opposite',2,2,[0,1,2,3]),('attack',5,2,[0,2,4,5,7,9]),('jump',3,2,[1,4]),('injury',2,2,[0,2])]:
    frames,scale,info=group(name,cols,rows,ids)
    if name=='locomotion':base_scale=scale
    allgroups[name]=(frames,scale);infos[name]=info
poses=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
out=Image.new('RGBA',(1792,1024));qa=[]
for direction in range(2):
    mappings=[('locomotion',direction*3),('walk2',direction*2),('opposite',direction*2+1),('injury',direction*2),('jump',direction*3),('jump',direction*3+1),('jump',direction*3+2),('injury',direction*2+1)]+[('attack',direction*5+i) for i in range(5)]
    for pi,(name,idx) in enumerate(mappings):
        f,scale=allgroups[name][0][idx],allgroups[name][1]
        box=f.getbbox();crop=f.crop(box)
        a=np.asarray(f.getchannel('A'));ys,xs=np.nonzero(a>0)
        low=ys>np.percentile(ys,82)
        anchorx=float(np.median(xs[low])) if pi!=7 else (box[0]+box[2])/2
        if name in ('attack','jump'):anchorx=f.width/2
        scaled=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        feet=210 if pi==5 else 200 if pi==6 else 230
        px=round(128-(anchorx-box[0])*scale);py=feet-scaled.height
        frame=Image.new('RGBA',(256,256));frame.alpha_composite(scaled,(px,py))
        basename=('front' if direction==0 else 'back')+'_'+poses[pi]
        frame.save(P/'frames'/f'{basename}.png')
        col=pi if pi<7 else pi-7;row=direction if pi<7 else direction+2
        out.alpha_composite(frame,(col*256,row*256))
        b=frame.getbbox(); qa.append({'pose':basename,'source':name,'index':idx,'bounds':b,'scale':scale,'placement':[px,py],'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),'edgeTouch':bool(b[0]<8 or b[1]<8 or b[2]>248 or b[3]>248)})
out.save(P/'sheet.png')
background=Image.new('RGBA',out.size,(38,46,56,255));background.alpha_composite(out);background.convert('RGB').save(P/'contact-sheet.jpg',quality=92)
summary={'size':list(out.size),'mode':out.mode,'poseCount':len(qa),'uniqueHashes':len(set(x['sha256'] for x in qa)),'blankCells':[(6,2),(6,3)],'blankCellsAlphaZero':all(out.crop((1536,y*256,1792,(y+1)*256)).getbbox() is None for y in (2,3)),'edgeTouchFrames':[x['pose'] for x in qa if x['edgeTouch']],'groups':infos,'frames':qa,'visualReview':'pending'}
(P/'qa.json').write_text(json.dumps(summary,indent=2));print(json.dumps({k:summary[k] for k in ['poseCount','uniqueHashes','edgeTouchFrames','size']}))
