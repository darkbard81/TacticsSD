"""Deterministic assembly from real generated pose grids; no invented poses."""
from PIL import Image, ImageDraw
from pathlib import Path
import json, hashlib
P=Path(__file__).parent
N=234 # All source cells normalized to 512 before this shared uniform scale.
S=N/512
sem=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
groups={'locomotion':(3,2),'walk-near-forward':(2,2),'walk-opposite':(2,2),'jump-final':(3,2),'attack-front':(3,2),'attack-back':(3,2),'damage-512cells':(2,2)}
raw={k:Image.open(P/'processed'/k/'raw-sheet-clean.png').convert('RGBA') for k in groups}
sheet=Image.new('RGBA',(1792,1024)); contact=Image.new('RGB',(1792,1104),'#333b42'); d=ImageDraw.Draw(contact)
poses=[]; transforms={}
(P/'frames').mkdir(exist_ok=True)
for di,direction in enumerate(['front','back']):
 for si,name in enumerate(sem):
  if si==1: group='walk-near-forward';idx=di*2
  elif si==2: group='walk-opposite';idx=di*2
  elif si<3: group='locomotion'; idx=di*3+si
  elif si==3: group='damage-512cells';idx=di*2
  elif si<7: group='jump-final';idx=di*3+si-4
  elif si==7: group='damage-512cells';idx=di*2+1
  else: group='attack-'+direction;idx=si-8
  cols,rows=groups[group]; cell=raw[group].crop(((idx%cols)*512,(idx//cols)*512,(idx%cols+1)*512,(idx//cols+1)*512))
  size=216 if group in ['walk-opposite','walk-near-forward'] else N
  small=cell.resize((size,size),Image.Resampling.LANCZOS)
  bbox=small.getbbox();ground=210 if name=='jump2' else 200 if name=='jump3' else 230
  xy=((256-size)//2,ground-bbox[3]); out=Image.new('RGBA',(256,256));out.alpha_composite(small,xy)
  box=out.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<256 and box[3]<256,(direction,name,box)
  col=si if si<7 else si-7; row=di if si<7 else di+2
  sheet.alpha_composite(out,(col*256,row*256));out.save(P/'frames'/f'{direction}-{name}.png')
  contact.paste(out,(col*256,row*276+20),out);d.text((col*256+8,row*276+3),direction+' '+name,fill='white')
  transforms[direction+'-'+name]={'group':group,'sourceIndex':idx,'scale':size/512,'translation':xy}
  poses.append({'direction':direction,'semantic':name,'cell':[col,row],'bounds':box,'sha256':hashlib.sha256(out.tobytes()).hexdigest()})
sheet.save(P/'sheet.png');contact.save(P/'contact-sheet.png')
qa={'size':sheet.size,'mode':sheet.mode,'poseCount':26,'uniqueHashes':len(set(p['sha256'] for p in poses)),'blankCells':[[6,2],[6,3]],'blankCellsAlphaZero':all(sheet.getpixel((x,y))[3]==0 for y in range(512,1024) for x in range(1536,1792)),'edgeTouchFrames':[],'sharedSourceCellScale':S,'poses':poses,'transforms':transforms,'visualReview':{'reviewed':False,'notes':[]},'pipelineNotes':['Raw ImageGen groups retain originals and prompts. Processor chroma-key cleanup reused; its aligned outputs were rejected where foot detector caused clamping. Final assembly uses unclipped clean source cells at one uniform scale.','Damage source normalized uniformly from 1254-square to 1024-square for 512-square cell contract. No per-frame fit, mirroring, rotation, or synthesized actions.','Ground line 230; airborne jump2 210 and jump3 200.']}
(P/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps({k:qa[k] for k in ['size','poseCount','uniqueHashes','blankCellsAlphaZero']}))
