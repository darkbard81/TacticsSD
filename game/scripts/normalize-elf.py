"""Normalize full ImageGen strips with shared scale, foot anchor and authored hand sockets.
Uses alpha connected components because generated gestures can cross nominal cell borders.
No independent per-frame scale/stretch is used. Source RGBA is preserved.
"""
from PIL import Image
import numpy as np
from collections import deque
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'game/assets/elf-sd'
STATES=['idle','walk','melee','bow','cast','hurt']
def extract(im):
 a=np.array(im)[:,:,3]>32; h,w=a.shape; result=[]
 for y,x in zip(*np.where(a)):
  if not a[y,x]:continue
  q=deque([(int(x),int(y))]);a[y,x]=False;xs=[];ys=[]
  while q:
   xx,yy=q.popleft();xs.append(xx);ys.append(yy)
   for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
    if 0<=nx<w and 0<=ny<h and a[ny,nx]:a[ny,nx]=False;q.append((nx,ny))
  if len(xs)>2000:
   mask=np.zeros((h,w),dtype=bool);mask[ys,xs]=True
   for _ in range(2):mask=mask|np.roll(mask,1,0)|np.roll(mask,-1,0)|np.roll(mask,1,1)|np.roll(mask,-1,1)
   pixels=np.array(im);pixels[:,:,3]=np.where(mask,pixels[:,:,3],0)
   result.append((min(xs),min(ys),max(xs)+1,max(ys)+1,Image.fromarray(pixels)))
 ordered=sorted(result,key=lambda b:(b[1]+b[3])/2)
 return [b for i in range(0,len(ordered),4) for b in sorted(ordered[i:i+4],key=lambda b:b[0])]
hands={
 'front': [[(100,190),(344,190),(589,190),(832,191)],[],[(130,657),(367,526),(726,606),(956,704)],[(235,863),(480,863),(735,863),(987,862)],[(97,1200),(462,1105),(590,1052),(846,1200)],[(102,1458),(380,1404),(640,1407),(844,1455)]],
 'back': [[(220,180),(469,180),(714,180),(964,180)],[],[(215,630),(397,516),(758,605),(976,701)],[(273,855),(508,856),(766,855),(989,857)],[(218,1193),(479,1092),(618,1038),(958,1190)],[(210,1436),(452,1435),(713,1441),(965,1436)]]}
walkhands=[[(177,292),(585,295),(1134,270),(1480,298)],[(374,669),(815,672),(1256,690),(1680,670)]]
rears={'front':[(107,903),(344,855),(590,855),(838,874)],'back':[(148,895),(377,851),(623,852),(882,891)]}
allmeta={}; report=[]
walk=extract(Image.open(OUT/'source/walk.png').convert('RGBA'))
bowback=extract(Image.open(OUT/'source/bow-back.png').convert('RGBA'))
for vi,view in enumerate(['front','back']):
 comps=extract(Image.open(OUT/'source'/(view+'.png')).convert('RGBA'))
 assert len(comps)==24
 atlas=Image.new('RGBA',(1024,1536));allmeta[view]={}
 for row,state in enumerate(STATES):
  allmeta[view][state]=[]
  for col in range(4):
   isbow=view=='back' and state=='bow'
   comp=bowback[col] if isbow else walk[vi*4+col] if state=='walk' else comps[row*4+col]
   x0,y0,x1,y1,isolated=comp
   scale=.33 if isbow else .5 if state=='walk' else .82
   a=np.array(isolated)[:,:,3]; yy,xx=np.where((a>64)&(np.indices(a.shape)[0]>y1-(60 if state=='walk' else 38)))
   rootx=(int(xx.min())+int(xx.max()))/2
   crop=isolated.crop((x0-2,y0-2,x1+2,y1+2))
   ox=round(128+(x0-2-rootx)*scale);oy=round(240+(y0-2-y1)*scale)
   frame=Image.new('RGBA',(256,256));frame.alpha_composite(crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS),(ox,oy))
   atlas.alpha_composite(frame,(col*256,row*256))
   hx,hy=[(492,243),(1035,243),(1578,243),(2127,243)][col] if isbow else walkhands[vi][col] if state=='walk' else hands[view][row][col]
   meta={'hand':[round(128+(hx-rootx)*scale,2),round(240+(hy-y1)*scale,2)],'behind':view=='back' and state in ['idle','walk','hurt'],'angle':0}
   if state=='bow':
    rx,ry=[(215,309),(740,213),(1278,216),(1803,225)][col] if isbow else rears[view][col];meta['rear']=[round(128+(rx-rootx)*scale,2),round(240+(ry-y1)*scale,2)]
   allmeta[view][state].append(meta)
   bbox=frame.getchannel('A').point(lambda x:255 if x>32 else 0).getbbox()
   report.append({'view':view,'state':state,'frame':col,'bbox':bbox,'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),'scale':scale,'anchor':[128,240]})
 atlas.save(OUT/(view+'.png'))
 bg=Image.new('RGBA',atlas.size,'#19353b');bg.alpha_composite(atlas);bg.resize((768,1152)).save(ROOT/'docs/game/evidence/elf-sd'/(view+'-sheet.png'))
(OUT/'frames.json').write_text(json.dumps(allmeta,indent=2)+'\n')
(ROOT/'docs/game/evidence/elf-sd/alpha-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print('Saved 48 normalized frames; shared scale per source, anchor [128,240].')
