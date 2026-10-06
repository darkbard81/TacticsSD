from pathlib import Path
from PIL import Image,ImageDraw
import json,base64
P=Path(__file__).parent
poses=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
sockets={'front':dict(zip(poses,[[90,153],[74,149],[51,133],[109,90],[131,221],[130,115],[168,31],[191,211],[134,101],[126,41],[214,98],[148,191],[86,152]])),'back':dict(zip(poses,[[162,148],[181,144],[167,115],[128,87],[182,215],[174,109],[171,24],[205,211],[170,94],[145,49],[213,94],[96,186],[173,145]]))}
(P/'sockets.json').write_text(json.dumps(sockets,indent=2))
out=Image.open(P/'sheet.png');check=Image.new('RGBA',out.size,(38,46,56,255));check.alpha_composite(out);draw=ImageDraw.Draw(check);reviews=[]
for di,direction in enumerate(['front','back']):
 for pi,pose in enumerate(poses):
  c=pi if pi<7 else pi-7;r=di if pi<7 else di+2
  x,y=sockets[direction][pose];alpha=out.getpixel((c*256+x,r*256+y))[3];reviews.append([direction,pose,alpha])
  draw.ellipse((c*256+x-3,r*256+y-3,c*256+x+3,r*256+y+3),fill='cyan')
check.convert('RGB').save(P/'socket-review.jpg',quality=94)
q=json.loads((P/'qa.json').read_text());q['visualReview']={'status':'passed','adultIdentity':'Mature adult elf face, clearly covered bust, consistent short crimson hair/fur shoulder/cuirass/ochre belt/trousers/boots across front and back.','walk':'New ImageGen forward-gait indices0/2 use near foreground knee crossing over far straight support leg, paired with opposite indices1/3 using near boot tucked backward; pose geometry reference Knight gait3 with own class identity preserved.','actions':'Ten attack, six jump, two hurt and two collapse distinct. Twenty-six unique alpha frame hashes. No weapons or detached FX.','gutterPx':8,'alignment':'Ground soles230; jump2 soles210; jump3 soles200; source injury split shifted into empty gap to retain full collapsed boot; source jump row split at500 avoids neighboring raised-fist contamination. All within256x256.','processing':'ImageGen source only. Chroma key from generate2dsprite processor, explicit fringe removal, one uniform scale per action group, shared jump-group scale0.92x locomotion for raised-fist clearance. No per-pose scale/mirror/rotation/pose synthesis.','limits':'Socket coordinates are visually measured grip positions for integration overlay review; actual equipment/runtime check belongs to integration owner.'};q['socketAlphaAtCenter']=reviews
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
