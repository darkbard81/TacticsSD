from pathlib import Path
import json
from PIL import Image,ImageDraw
R=Path(__file__).parent
tr=json.loads((R/'transforms.json').read_text())
source={
 'front':{'idle':(229,351),'walk_right':(274,410),'walk_left':(319,275),'hurt':(349,368),'jump1':(195,376),'jump2':(249,230),'jump3':(343,46),'collapse':(468,545),'attack1':(280,255),'attack2':(248,70),'attack3':(446,238),'attack4':(452,345),'attack5':(202,289)},
 'back':{'idle':(389,301),'walk_right':(537,300),'walk_left':(583,198),'hurt':(438,267),'jump1':(420,325),'jump2':(375,163),'jump3':(356,41),'collapse':(473,447),'attack1':(374,219),'attack2':(293,60),'attack3':(446,210),'attack4':(447,330),'attack5':(369,239)}}
out={}
for direction,poses in source.items():
 out[direction]={}
 for pose,(x,y) in poses.items():
  t=tr[direction+'_'+pose];s=t['scale'];dx,dy=t['translate'];out[direction][pose]=[round(x*s+dx),round(y*s+dy)]
(R/'sockets.json').write_text(json.dumps(out,indent=2))
im=Image.open(R/'contact-sheet.png');d=ImageDraw.Draw(im);sem=list(source['front'])
order=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
for di,direction in enumerate(out):
 for pose,(x,y) in out[direction].items():
  i=order.index(pose);row=di+(2 if i>=7 else 0);col=i if i<7 else i-7;x+=col*256;y+=row*256
  d.ellipse((x-3,y-3,x+3,y+3),fill=(255,64,32))
im.save(R/'socket-review.png')
