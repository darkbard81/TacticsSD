"""Audit generated class deliverables, merge measured sockets and create review contact sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json
root=Path(__file__).resolve().parents[2]
assets=root/'game/assets/classes'
out=root/'docs/game/evidence/classes';out.mkdir(parents=True,exist_ok=True)
names=['warrior','archer','wizard','cleric','spellblade','knight','terror-knight','berserker']
semantics=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
reports={};sockets={}
for name in names:
 folder=assets/name;im=Image.open(folder/'sheet.png');assert im.mode=='RGBA' and im.size==(1792,1024),(name,im.mode,im.size)
 sockets[name]=json.loads((folder/'sockets.json').read_text())
 hashes=[];bounds={};errors=[]
 for view,row in [('front',0),('back',1)]:
  for i,semantic in enumerate(semantics):
   x=(i if i<7 else i-7)*256;y=(row if i<7 else row+2)*256
   frame=im.crop((x,y,x+256,y+256));alpha=frame.getchannel('A');box=alpha.point(lambda x:255 if x>32 else 0).getbbox();bounds[view+'_'+semantic]=box
   hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
   if not box or box[0]<8 or box[1]<8 or box[2]>248 or box[3]>248:errors.append(view+'_'+semantic+': gutter')
   hx,hy=sockets[name][view][semantic]
   if alpha.getpixel((round(hx),round(hy)))<100:errors.append(view+'_'+semantic+': empty socket')
 for row in [2,3]:
  if im.crop((1536,row*256,1792,row*256+256)).getchannel('A').getbbox():errors.append('nonempty blank')
 if len(set(hashes))!=26:errors.append('duplicate poses')
 reports[name]={'dimensions':im.size,'mode':im.mode,'uniquePoses':len(set(hashes)),'bounds':bounds,'errors':errors,'sha256':hashlib.sha256((folder/'sheet.png').read_bytes()).hexdigest()}
(out/'alpha-audit.json').write_text(json.dumps(reports,indent=2)+'\n')
assert not any(x['errors'] for x in reports.values()),{n:r['errors'] for n,r in reports.items() if r['errors']}
(assets/'sockets.json').write_text(json.dumps(sockets,indent=2)+'\n')
contact=Image.new('RGB',(1536,640),'#152d34');d=ImageDraw.Draw(contact)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,name in enumerate(names):
 x=i%4*384;y=i//4*320
 d.rectangle((x+6,y+6,x+377,y+313),fill='#203e44',outline='#66756b',width=1)
 d.text((x+20,y+20),name.replace('-',' ').title(),fill='#f1e3bc',font=font)
 im=Image.open(assets/name/'sheet.png')
 for j,row in enumerate([0,1]):
  frame=im.crop((0,row*256,256,row*256+256)).resize((230,230),Image.Resampling.LANCZOS)
  contact.paste(frame,(x+j*160-6,y+46),frame)
 d.text((x+26,y+288),'FRONT / BACK  •  26 generated poses',fill='#bbc9c7',font=small)
contact.save(out/'TacticsSD-eight-class-contact.png')
print(json.dumps({n:{'unique':r['uniquePoses'],'errors':r['errors']} for n,r in reports.items()},indent=2))
# Full-size stride evidence makes thigh occlusion and support-foot exchange reviewable.
gait=Image.new('RGB',(1164,2104),'#20343e');d=ImageDraw.Draw(gait)
for j,title in enumerate(['FRONT: knee forward','FRONT: trailing tuck','BACK: knee forward','BACK: trailing tuck']):d.text((145+j*256,14),title,fill='#f1e3bc',font=small)
for i,name in enumerate(names):
 y=50+i*256;d.text((8,y+105),name.replace('-',' ').title(),fill='#f1e3bc',font=small)
 im=Image.open(assets/name/'sheet.png')
 for j,(col,row) in enumerate([(1,0),(2,0),(1,1),(2,1)]):
  frame=im.crop((col*256,row*256,col*256+256,row*256+256));gait.paste(frame,(140+j*256,y),frame)
gait.save(out/'gait-phase-review.png')
