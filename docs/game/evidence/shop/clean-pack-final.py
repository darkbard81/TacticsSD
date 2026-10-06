from PIL import Image
from pathlib import Path
import json
r=Path('/home/deck/Documents/TacticsSD');manifest=json.loads((r/'game/assets/items.json').read_text());atlas=Image.new('RGBA',(2048,2048));evidence=[]
A=[(0,0,320,328),(320,0,640,328),(640,0,960,328),(960,0,1280,328),(20,350,310,598),(345,350,620,601),(660,325,940,635),(970,325,1275,635),(80,600,270,932),(425,610,570,937),(720,638,845,938),(965,648,1260,920),(55,932,305,1260),(350,941,625,1260),(660,953,935,1260),(968,934,1265,1260)]
B=[(0,0,320,320),(320,0,640,320),(640,0,960,320),(960,0,1280,320),(0,323,320,625),(320,323,640,625),(640,335,960,612),(960,325,1280,615),(0,630,320,918),(320,630,640,918),(640,628,960,917),(960,628,1280,918),(0,926,320,1260),(320,926,640,1260),(640,926,960,1260)]
C=[(0,0,465,630),(465,0,820,630),(820,0,1280,630),(0,630,455,1280),(455,630,905,1280)]
for g,rects in zip('abc',[A,B,C]):
 im=Image.open('/tmp/tacticssd-repair/items-'+g+'-original.png').convert('RGBA')
 for id,f in manifest.items():
  if f['sourceAtlas']!=g:continue
  rect=tuple(round(v*im.width/1280) for v in rects[f['sourceCell']]);icon=im.crop(rect);w,h=icon.size;alpha=icon.getchannel('A').tobytes();seen=bytearray(w*h);cs=[]
  for start,a in enumerate(alpha):
   if a<=8 or seen[start]:continue
   seen[start]=1;todo=[start];points=[]
   while todo:
    n=todo.pop();points.append(n);x=n%w;y=n//w
    for z in ([n-1] if x else [])+([n+1] if x<w-1 else [])+([n-w] if y else [])+([n+w] if y<h-1 else []):
     if not seen[z] and alpha[z]>8:seen[z]=1;todo.append(z)
   cs.append(points)
  largest=max(map(len,cs));cs=sorted(cs,key=len,reverse=True)[:2 if id in ['silver-bracers','ov-488','ov-489','ov-490'] else 1];cs=[c for c in cs if len(c)>=largest*.10];mask=Image.new('L',(w,h));m=mask.load()
  for c in cs:
   for n in c:m[n%w,n//w]=alpha[n]
  icon.putalpha(mask);bbox=mask.getbbox();icon=icon.crop(bbox);icon.thumbnail((228,228),Image.Resampling.LANCZOS);atlas.alpha_composite(icon,(f['x']+(256-icon.width)//2,f['y']+(256-icon.height)//2));f['sourceCrop']=rect;evidence.append({'id':id,'sourceBox':rect,'components':len(cs),'alphaPixels':sum(map(len,cs))})
atlas.save(r/'game/assets/items.png');(r/'game/assets/items.json').write_text(json.dumps(manifest,indent=2)+'\n');(r/'docs/game/evidence/shop/atlas-inspection.json').write_text(json.dumps(evidence,indent=2));print('SUCCESS: packed',len(evidence),'icons; disconnected neighboring fragments removed')
