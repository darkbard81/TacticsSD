from PIL import Image,ImageDraw,ImageFilter
import numpy as np,json,hashlib
from pathlib import Path
P=Path(__file__).parent
poses=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
scales={'locomotion':.405,'gait3':.33,'tucked':.405,'reaction':.405,'jump':.38,'attack':.51,'collapse':.34}
grid={'locomotion':(3,2),'gait3':(2,2),'tucked':(2,2),'reaction':(2,2),'jump':(3,2),'attack':(5,2),'collapse':(2,2)}
raw={}
for n in scales:
 im=Image.open(P/'raw'/f'{n}.png').convert('RGBA'); a=np.array(im);rgb=a[:,:,:3].astype('int16');r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];key=(r-g>52)&(b-g>52)&(r>110)&(b>110);a[:,:,3][key]=0
 # Suppress magenta interpolation fringe only on pixels neighboring keyed background.
 edge=np.array(Image.fromarray((key*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0
 fringe=edge&~key&(r>g+20)&(b>g+20)
 a[:,:,0][fringe]=np.minimum(r[fringe],g[fringe]+20);a[:,:,2][fringe]=np.minimum(b[fringe],g[fringe]+35)
 a[key,:3]=0;raw[n]=Image.fromarray(a)
frames={};meta={}
for d,row in [('front',0),('back',1)]:
 for pose in poses:
  if pose=='idle':n,c='locomotion',0
  elif pose=='walk_right':n,c='gait3',0
  elif pose=='walk_left':n,c='tucked',1
  elif pose=='hurt':n,c='reaction',0
  elif pose.startswith('jump'):n,c='jump',int(pose[-1])-1
  elif pose=='collapse':n,c='collapse',0
  else:n,c='attack',int(pose[-1])-1
  im=raw[n];cols,rows=grid[n];x0=round(c*im.width/cols);x1=round((c+1)*im.width/cols);y0=round(row*im.height/rows);y1=round((row+1)*im.height/rows)
  crop=im.crop((x0,y0,x1,y1));bb=crop.getbbox();scale=scales[n]
  root={'locomotion':270,'gait3':375,'tucked':445,'reaction':375,'jump':275,'attack':200}.get(n,(bb[0]+bb[2])/2)
  if n=='attack' and c==3:root=200
  cut=crop.crop(bb);cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.LANCZOS)
  baseline=210 if pose=='jump2' else 200 if pose=='jump3' else 230
  px=round(128+(bb[0]-root)*scale);py=baseline-cut.height
  out=Image.new('RGBA',(256,256));out.alpha_composite(cut,(px,py));name=f'{d}_{pose}';out.save(P/'frames'/f'{name}.png');frames[name]=out
  meta[name]={'source':f'raw/{n}.png','source_cell':[c,row],'source_bbox':bb,'uniform_group_scale':scale,'offset':[px,py],'bounds':out.getbbox(),'sha256':hashlib.sha256(out.tobytes()).hexdigest()}
sheet=Image.new('RGBA',(1792,1024))
for d,row in [('front',0),('back',1)]:
 for i,pose in enumerate(poses):
  target=(i,row) if i<7 else(i-7,row+2)
  sheet.alpha_composite(frames[f'{d}_{pose}'],(target[0]*256,target[1]*256))
sheet.save(P/'sheet.png')
contact=Image.new('RGB',(1792,1104),(38,43,55));dr=ImageDraw.Draw(contact)
for d,row in [('front',0),('back',1)]:
 for i,pose in enumerate(poses):
  c,r=(i,row) if i<7 else(i-7,row+2);x,y=c*256,r*276
  contact.paste(frames[f'{d}_{pose}'],(x,y),frames[f'{d}_{pose}']);dr.text((x+12,y+256),f'{d} {pose}',fill='white')
contact.save(P/'contact.png')
qa={'class':'Knight','dimensions':[1792,1024],'mode':sheet.mode,'alpha':{'transparent':int(np.sum(np.array(sheet)[:,:,3]==0)),'opaque':int(np.sum(np.array(sheet)[:,:,3]==255))},'blank_cells':[[6,2],[6,3]],'unique_pose_hashes':len(set(x['sha256'] for x in meta.values())),'frames':meta,'visual_review':{'status':'pending','notes':[]}}
(P/'qa.json').write_text(json.dumps(qa,indent=2))
print(json.dumps({k:v['bounds'] for k,v in meta.items()},indent=2))
