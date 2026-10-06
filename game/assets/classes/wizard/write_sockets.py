from pathlib import Path
from PIL import Image,ImageDraw
import json
base=Path(__file__).parent.parent
names=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
data={
'wizard':{
'front':[[99,162],[88,165],[81,134],[88,137],[86,173],[87,134],[80,60],[194,221],[120,120],[92,59],[198,117],[165,204],[92,158]],
'back':[[173,161],[169,158],[183,128],[184,98],[170,188],[173,118],[170,32],[206,218],[165,121],[94,72],[195,110],[170,204],[172,160]]},
'cleric':{
'front':[[94,161],[80,156],[76,130],[79,135],[100,184],[85,125],[89,39],[200,220],[123,117],[101,51],[198,114],[180,197],[90,158]],
'back':[[174,158],[169,158],[178,127],[180,99],[182,187],[179,105],[167,33],[222,218],[168,119],[92,59],[197,105],[189,186],[175,153]]}}
for cls,dirs in data.items():
 root=base/cls
 sockets={d:dict(zip(names,pts)) for d,pts in dirs.items()}
 (root/'sockets.json').write_text(json.dumps(sockets,indent=2)+'\n')
 image=Image.open(root/'contact-sheet.jpg').convert('RGB');draw=ImageDraw.Draw(image)
 for r,(d,pts) in enumerate(dirs.items()):
  for i,(x,y) in enumerate(pts):
   row=r if i<7 else r+2; col=i if i<7 else i-7;x+=col*256;y+=row*256
   draw.ellipse((x-3,y-3,x+3,y+3),fill='#44ffff',outline='#001111')
 image.save(root/'sockets-review.jpg',quality=95)
 qa=json.loads((root/'qa.json').read_text())
 qa['visualReview'].update({'identityFrontBack':'Accepted after viewing all26pose contact sheet. Stable class silhouette, outfit, ears and mature elf identity front/back. Small generated hair/cloth detail variation occurs during high movement.','allPoses':'Accepted: front/back idle, opposite near-leg strides, hurt, crouch and two airborne poses, horizontal collapse, five distinct attack phases. No clipping, labels, weapons, wings or scenery.','sockets':'Hand centres manually measured on final256px cells and marked in sockets-review.jpg. Cyan dot represents runtime equipment anchor.'})
 (root/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
 # Compact rooted gait preview, empty magenta fully removed.
 for direction in ['front','back']:
  frames=[]
  for pose in ['idle','walk_right','idle','walk_left']:
   frame=Image.new('RGBA',(256,256),(31,43,51,255));frame.alpha_composite(Image.open(root/'frames'/f'{direction}_{pose}.png'))
   frames.append(frame.convert('RGB'))
  frames[0].save(root/f'idle-{direction}.gif',save_all=True,append_images=frames[1:],duration=180,loop=0)
 print(cls,'complete')
