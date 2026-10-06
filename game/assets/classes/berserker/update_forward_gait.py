from PIL import Image,ImageDraw
import numpy as np,json,hashlib,sys
from pathlib import Path
sys.path.insert(0,'/home/deck/.codex/skills/generate2dsprite/scripts')
import generate2dsprite as processor
P=Path(__file__).parent
source=Image.open(P/'raw/forward-gait.png').convert('RGBA')
clean=Image.open(P/'raw/forward-gait-clean.png').convert('RGBA') if (P/'raw/forward-gait-clean.png').exists() else processor.remove_bg_magenta(source,100,170)
a=np.array(clean);r,g,b=a[:,:,0].astype(float),a[:,:,1].astype(float),a[:,:,2].astype(float);a[(r>90)&(b>65)&(b>r*.5)&(g<r*.68)&(g<b*.72)]=0
clean=Image.fromarray(a);clean.save(P/'raw/forward-gait-clean.png');cw,ch=clean.width//2,clean.height//2
raw=[clean.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch)) for r in range(2) for c in range(2)]
boxes=[f.getbbox() for f in raw];scale=190/float(np.median([b[3]-b[1] for b in boxes]))
sheet=Image.open(P/'sheet.png').convert('RGBA');q=json.loads((P/'qa.json').read_text())
q['groups']['forward-gait']={'rawSize':list(source.size),'grid':[2,2],'scale':scale,'referenceFrames':[0,1,2,3],'rawBounds':boxes,'poseReference':'../knight/raw/gait3.png; pose geometry only'}
for row,idx in [(0,0),(1,2)]:
 f=raw[idx];box=boxes[idx];crop=f.crop(box);a=np.asarray(f.getchannel('A'));ys,xs=np.nonzero(a>0);low=ys>np.percentile(ys,82);anchor=float(np.median(xs[low]))
 scaled=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS);px=round(128-(anchor-box[0])*scale);py=230-scaled.height
 frame=Image.new('RGBA',(256,256));frame.alpha_composite(scaled,(px,py));name=('front' if row==0 else 'back')+'_walk_right';frame.save(P/'frames'/f'{name}.png')
 sheet.paste((0,0,0,0),(256,row*256,512,(row+1)*256));sheet.alpha_composite(frame,(256,row*256));bounds=frame.getbbox()
 updated={'pose':name,'source':'forward-gait','index':idx,'bounds':bounds,'scale':scale,'placement':[px,py],'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),'edgeTouch':bool(bounds[0]<8 or bounds[1]<8 or bounds[2]>248 or bounds[3]>248)}
 q['frames']=[updated if x['pose']==name else x for x in q['frames']]
sheet.save(P/'sheet.png');backdrop=Image.new('RGBA',sheet.size,(38,46,56,255));backdrop.alpha_composite(sheet);backdrop.convert('RGB').save(P/'contact-sheet.jpg',quality=94);backdrop.convert('RGB').save(P/'forward-gait-review.jpg',quality=94)
q['edgeTouchFrames']=[x['pose'] for x in q['frames'] if x['edgeTouch']];q['uniqueHashes']=len(set(x['sha256'] for x in q['frames']));q['visualReview']['walk']='Near foreground knee raised forward across far straight support leg (new ImageGen forward-gait) pairs with near boot tucked behind from opposite ImageGen group; pending integration confirmation.'
before=json.loads((P/'pre-forward-gait-hashes.json').read_text());changed=[]
for rr in range(4):
 for cc in range(7):
  h=hashlib.sha256(sheet.crop((cc*256,rr*256,(cc+1)*256,(rr+1)*256)).tobytes()).hexdigest()
  if before[f'{rr},{cc}']!=h:changed.append([rr,cc])
q['forwardGaitChangedCells']=changed
assert changed==[[0,1],[1,1]],changed
(P/'qa.json').write_text(json.dumps(q,indent=2));print(json.dumps({'changed':changed,'gutterFailures':q['edgeTouchFrames'],'scale':scale}))
