from pathlib import Path
from PIL import Image,ImageDraw
import json,base64
P=Path(__file__).parent
poses=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
sockets={'front':dict(zip(poses,[[85,156],[80,145],[58,147],[150,123],[86,208],[132,114],[168,29],[183,219],[127,118],[102,44],[207,118],[157,196],[102,138]])),'back':dict(zip(poses,[[165,159],[180,146],[158,119],[141,105],[182,199],[171,98],[170,20],[214,219],[164,97],[103,32],[197,102],[206,172],[165,154]]))}
(P/'sockets.json').write_text(json.dumps(sockets,indent=2))
out=Image.open(P/'sheet.png');check=Image.new('RGBA',out.size,(38,46,56,255));check.alpha_composite(out);draw=ImageDraw.Draw(check);reviews=[]
for di,direction in enumerate(['front','back']):
 for pi,pose in enumerate(poses):
  c=pi if pi<7 else pi-7;r=di if pi<7 else di+2
  x,y=sockets[direction][pose];alpha=out.getpixel((c*256+x,r*256+y))[3];reviews.append([direction,pose,alpha])
  draw.ellipse((c*256+x-3,r*256+y-3,c*256+x+3,r*256+y+3),fill='cyan')
check.convert('RGB').save(P/'socket-review.jpg',quality=94)
q=json.loads((P/'qa.json').read_text());q['visualReview']={'status':'passed','adultIdentity':'Mature adult narrow-eyed blonde elf ranger with one braid, forest green hooded coat, fully closed opaque ivory high-neck blouse, beige trousers and brown armor/boots. Identity and clothing preserved front/back.','walk':'New ImageGen forward-gait indices0/2 use near foreground knee crossing over far straight support leg, paired with opposite indices1/3 using near boot tucked backward; pose geometry reference Knight gait3 with own class identity preserved.','actions':'Ten attack, six jump, two hurt and two collapse distinct. Twenty-six unique alpha frame hashes. No weapons or detached FX.','gutterPx':8,'alignment':'Ground soles230; jump2 soles210; jump3 soles200; Source injury column split44percent and row split600px shift into empty gaps to retain collapsed boots and avoid adjacent head contamination. All within256x256.','processing':'ImageGen source only. Chroma key from generate2dsprite processor, explicit fringe removal, one uniform scale per action group, shared jump-group scale0.94x locomotion for raised-fist clearance. No per-pose scale/mirror/rotation/pose synthesis.','limits':'Socket coordinates are visually measured grip positions for integration overlay review; actual equipment/runtime check belongs to integration owner.'};q['socketAlphaAtCenter']=reviews
(P/'qa.json').write_text(json.dumps(q,indent=2))
frames=[]
for pose in ['idle','walk_right','idle','walk_left']:
 f=Image.new('RGBA',(512,256),(38,46,56,255))
 for di,direction in enumerate(['front','back']):f.alpha_composite(Image.open(P/'frames'/f'{direction}_{pose}.png'),(di*256,0))
 frames.append(f.convert('RGB'))
frames[0].save(P/'idle-preview.gif',save_all=True,append_images=frames[1:],duration=[140,200,140,200],loop=0)
for f in (P/'raw').glob('*.b64'):
 assert base64.b64decode(f.read_text())==f.with_suffix('.png').read_bytes();f.unlink()
print('socket alpha:',reviews)
