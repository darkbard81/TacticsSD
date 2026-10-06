"""Deterministic chroma cleanup, uniform group scaling, atlas packing (no art synthesis)."""
from pathlib import Path
import sys, json, hashlib, importlib.util
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

spec=importlib.util.spec_from_file_location('sprite_processor','/home/deck/.codex/skills/generate2dsprite/scripts/generate2dsprite.py')
processor=importlib.util.module_from_spec(spec); spec.loader.exec_module(processor)
root=Path(sys.argv[1])
groups={'walk':(['idle','walk_right','walk_left'],3),'jump':(['jump1','jump2','jump3'],3),'attack':(['attack1','attack2','attack3','attack4','attack5'],5),'reaction':(['hurt','collapse'],2),'opposite':(['walk_left','unused'],2),'gait-forward':(['walk_right','unused'],2)}
sources={}; groupmeta={}
for group,(poses,cols) in groups.items():
 im=Image.open(root/'raw'/f'{group}.png').convert('RGBA')
 a=np.array(im); rgb=a[:,:,:3].astype(np.int16)
 # Pure and antialiased hot-magenta removal; violet cloth/hair is low saturation.
 mag=(rgb[:,:,0]>rgb[:,:,1]+65)&(rgb[:,:,2]>rgb[:,:,1]+65)&(rgb[:,:,0]>135)&(rgb[:,:,2]>110)
 mag |= (rgb[:,:,0]>rgb[:,:,1]+85)&(rgb[:,:,2]>rgb[:,:,1]+85)
 a[mag]=0
 clean=Image.fromarray(a)
 # Despill only a two-pixel alpha silhouette edge, preserving violet interior.
 alpha=clean.getchannel('A'); inner=alpha.filter(ImageFilter.MinFilter(5))
 edge=(np.array(alpha)>0)&(np.array(inner)==0)
 a=np.array(clean); rgb=a[:,:,:3].astype(np.int16)
 spill=edge&(rgb[:,:,0]>rgb[:,:,1]+45)&(rgb[:,:,2]>rgb[:,:,1]+45)
 a[spill,0]=np.minimum(a[spill,0],a[spill,1]+32)
 a[spill,2]=np.minimum(a[spill,2],a[spill,1]+40)
 clean=Image.fromarray(a); clean.save(root/'raw'/f'{group}-clean.png')
 cw,ch=im.width/cols,im.height/2
 frames=[]
 for r,direction in enumerate(['front','back']):
  for c,pose in enumerate(poses):
   if group=='reaction':
    # Collapse toe in Cleric source extends left of nominal grid midline;
    # the empty source gutter at x=0.43W safely separates complete figures.
    bounds=(0 if c==0 else round(im.width*.43),round(r*ch),round(im.width*.43) if c==0 else im.width,round((r+1)*ch))
   else: bounds=(round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch))
   frame=clean.crop(bounds)
   comps=processor.connected_components(frame,min_area=15)
   bbox=comps[0]['bbox']
   frame=frame.crop(bbox)
   frames.append((direction,pose,frame,list(bounds),list(bbox)))
 # Use one magnification per generated group, never normalize pose bboxes.
 if group=='walk':
  scale=190/np.mean([f[2].height for f in frames if f[1]=='idle'])
  walkscale=scale
 elif group=='jump': scale=walkscale
 elif group=='attack': scale=190/np.mean([f[2].height for f in frames if f[1]=='attack5'])
 elif group=='reaction': scale=min(190/np.mean([f[2].height for f in frames if f[1]=='hurt']),236/max(f[2].width for f in frames))
 else: scale=190/np.mean([f[2].height for f in frames])
 if group=='jump': scale=min(scale,192/max(f[2].height for f in frames))
 groupmeta[group]={'rawDimensions':list(im.size),'uniformScale':float(scale)}
 for direction,pose,frame,sourcebounds,sourcebbox in frames:
  if pose=='unused': continue
  size=(round(frame.width*scale),round(frame.height*scale)); frame=frame.resize(size,Image.Resampling.LANCZOS)
  ybottom=210 if pose=='jump2' else 200 if pose=='jump3' else 230
  x=128-frame.width//2; y=ybottom-frame.height
  out=Image.new('RGBA',(256,256));out.alpha_composite(frame,(x,y))
  pixels=np.array(out);hot=(pixels[:,:,0].astype(int)>pixels[:,:,1].astype(int)+85)&(pixels[:,:,2].astype(int)>pixels[:,:,1].astype(int)+85);pixels[hot]=0;out=Image.fromarray(pixels)
  sources[f'{direction}_{pose}']=(out,{'group':group,'sourceBounds':sourcebounds,'sourceContentBounds':sourcebbox,'scale':float(scale),'destination':[x,y],'bottom':ybottom})
 (root/'frames').mkdir(exist_ok=True)
sequence=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
sheet=Image.new('RGBA',(1792,1024));records=[]
for r,direction in enumerate(['front','back']):
 for n,pose in enumerate(sequence):
  out,meta=sources[f'{direction}_{pose}'];out.save(root/'frames'/f'{direction}_{pose}.png')
  col=n if n<7 else n-7; row=r if n<7 else r+2
  sheet.alpha_composite(out,(col*256,row*256))
  bbox=out.getchannel('A').point(lambda x:255 if x>32 else 0).getbbox()
  rec={'name':f'{direction}_{pose}','bbox':list(bbox),'hash':hashlib.sha256(out.tobytes()).hexdigest(),**meta}
  records.append(rec)
sheet.save(root/'sheet.png')
bg=Image.new('RGBA',sheet.size,(31,43,51,255));bg.alpha_composite(sheet)
bg.convert('RGB').save(root/'contact-sheet.jpg',quality=94)
qa={'dimensions':list(sheet.size),'mode':sheet.mode,'poseCount':26,'uniqueHashes':len(set(r['hash'] for r in records)),'transparentPixels':int((np.array(sheet)[:,:,3]==0).sum()),'blankCells':['r3c7','r4c7'],'edgeMarginPx':min(min(r['bbox'][0],r['bbox'][1],256-r['bbox'][2],256-r['bbox'][3]) for r in records),'groups':groupmeta,'frames':records,'processing':'Actual ImageGen source grids; chroma key + silhouette despill + largest body extraction + one uniform scale per source group; translation only, no mirroring/rotation/pose synthesis. Reaction gutter adjusted to capture complete toes.','visualReview':{'identityFrontBack':'review pending','alternatingLegs':'accepted opposite stride source switches near-leg from forward extension to backward bent push-off','allPoses':'review pending'}}
(root/'qa.json').write_text(json.dumps(qa,indent=2))
print(json.dumps({k:v for k,v in qa.items() if k not in ['frames','groups']},indent=2))
