"""Deterministic extraction of ImageGen action groups, no invented art/poses."""
from pathlib import Path
import importlib.util,json,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFilter

ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('sprite_processor','/home/deck/.codex/skills/generate2dsprite/scripts/generate2dsprite.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
# Uniform scale per raw generation group. Actual generator returned different canvas geometries.
# No individual frame fit, rotation, mirror or neutral-pose duplication.
groups={
 'neutral':('locomotion-v2', [0,512,1024],[0,512,1024,1536],.47),
 'walk':('walkguide',[0,627,1254],[0,627,1254],.39),
 'gait3':('gait3',[0,627,1254],[0,627,1254],.335),
 'opposite':('opposite',[0,512,1024],[0,768,1536],.43),
 'jump':('jump',[0,512,1024],[0,512,1024,1536],.47),
 'jumpfix':('jumpfix',[0,627,1254],[0,627,1254],.39),
 'attack':('attack',[0,334,642,944,1254],[0,418,836,1254],.61),
 'reaction':('reaction',[0,627,1254],[0,627,1254],.365)
}
cache={};meta=[]
for group,(raw,ys,xs,scale) in groups.items():
 clean=p.remove_bg_magenta(Image.open(ROOT/'raw'/f'{raw}.png').convert('RGBA'))
 clean.save(ROOT/'raw'/f'{raw}-clean.png')
 frames=[]
 for row in range(len(ys)-1):
  for col in range(len(xs)-1):
   frame=p.clean_edges(clean.crop((xs[col],ys[row],xs[col+1],ys[row+1])),depth=1)
   mask=np.asarray(frame.getchannel('A'))>80
   fy,fx=np.where(mask)
   assert len(fx), (group,row,col)
   box=(max(0,int(fx.min())-1),max(0,int(fy.min())-1),min(frame.width,int(fx.max())+2),min(frame.height,int(fy.max())+2));crop=frame.crop(box)
   # Keep body and attached hair/cape. Tiny detached chroma debris outside body bbox is excluded.
   crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
   frames.append((crop,{'group':group,'raw':raw,'source_cell':[row,col],'source_crop':box,'uniform_scale':scale}))
 cache[group]=frames

names=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
atlas=Image.new('RGBA',(1792,1024)); final={}
for facing in ['front','back']:
 back=facing=='back';offset=1 if back else 0
 mapping=[('neutral',3*offset),('gait3',2*offset),('opposite',2*offset),('reaction',2*offset),('jump',3*offset),('jumpfix',2*offset),('jumpfix',2*offset+1),('reaction',2*offset+1)]+[('attack',6*offset+i) for i in range(5)]
 for n,(group,index) in zip(names,mapping):
  crop,info=cache[group][index]; cell=Image.new('RGBA',(256,256));a=np.asarray(crop.getchannel('A'))
  # Root at midpoint of bottom two boots, with collapse centered horizontally.
  yy,xx=np.where(a[max(0,a.shape[0]-12):]>32)
  anchorx=(float(xx.min()+xx.max())/2) if len(xx) else crop.width/2
  if n=='collapse':anchorx=crop.width/2
  ybase=210 if n=='jump2' else 200 if n=='jump3' else 230
  x=round(128-anchorx);y=ybase-crop.height
  # Hair can spread farther than feet; shift only if envelope otherwise clips.
  x=max(8,min(248-crop.width,x))
  assert y>=8 and x>=8 and x+crop.width<=248,(facing,n,crop.size,x,y)
  cell.alpha_composite(crop,(x,y))
  arr=np.array(cell);rgb=arr[:,:,:3].astype(np.int16)
  original_edge=(np.array(cell.getchannel('A').filter(ImageFilter.MinFilter(5)))<arr[:,:,3])
  purple=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]
  # COLOR-only edge despill: never erase alpha from fine lavender hair strands.
  # Strong residual chroma is recolored too, while interior lavender shadows stay intact.
  slight=(original_edge|(purple>90))&(purple>20)&(rgb[:,:,2]>rgb[:,:,0]*.6)
  arr[slight,1]=np.minimum(arr[slight,0],arr[slight,2])
  arr[arr[:,:,3]==0,:3]=0
  cell=Image.fromarray(arr); final[f'{facing}_{n}']=cell
  cell.save(ROOT/'frames'/f'{facing}_{n}.png')
  i=names.index(n); row=offset if i<7 else offset+2;col=i if i<7 else i-7
  atlas.alpha_composite(cell,(col*256,row*256))
  bounds=cell.getbbox();meta.append({**info,'name':f'{facing}_{n}','bounds':bounds,'paste':[x,y],'hand_socket':None,'hash':hashlib.sha256(cell.tobytes()).hexdigest()})
atlas.save(ROOT/'sheet.png')
contact=Image.new('RGB',atlas.size,'#28323c');contact.paste(atlas,mask=atlas.getchannel('A'));d=ImageDraw.Draw(contact)
for r in range(4):
 for c in range(7):
  d.rectangle((c*256,r*256,c*256+255,r*256+255),outline='#59636d')
  if c<6 or r<2:d.text((c*256+8,r*256+8),('front' if r%2==0 else 'back')+' '+(names[c] if r<2 else names[c+7]),fill='white')
contact.save(ROOT/'contact-sheet.png')
qa={'class':'terror-knight','dimensions':atlas.size,'mode':atlas.mode,'pose_count':len(meta),'unique_hashes':len(set(m['hash'] for m in meta)),'transparent_pixels':int(np.sum(np.asarray(atlas.getchannel('A'))==0)),'blank_cells':[[2,6],[3,6]],'blank_cells_alpha_zero':all(atlas.crop((1536,r*256,1792,r*256+256)).getbbox() is None for r in [2,3]),'no_output_edge_contact':all(0<m['bounds'][0]<m['bounds'][2]<256 and 0<m['bounds'][1]<m['bounds'][3]<256 for m in meta),'frames':meta,'processing_note':'Used generate2dsprite chroma-key/edge primitives. Standard default foot anchoring failed edge gates; custom deterministic assembly aligns full-body bbox to explicit footline230. Attack raw row bounds recovered from visible gutters. One uniform scale per raw action group, no individual pose fitting. Original failed processor metadata retained honestly.','visual_review':{}}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2))
print(json.dumps({k:v for k,v in qa.items() if k not in ['frames','visual_review']},indent=2))
