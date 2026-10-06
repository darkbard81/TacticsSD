from PIL import Image,ImageDraw
from pathlib import Path
import json
P=Path(__file__).parent
names=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
points={'front':[(100,156),(94,159),(88,128),(82,133),(143,203),(100,105),(76,107),(182,218),(116,103),(93,40),(219,104),(159,194),(102,133)],'back':[(176,151),(193,154),(207,111),(190,109),(185,184),(173,102),(209,103),(195,218),(182,97),(107,47),(207,73),(206,142),(174,111)]}
socks={direction:dict(zip(names,pts)) for direction,pts in points.items()}
(P/'sockets.json').write_text(json.dumps(socks,indent=2)+'\n')
a=Image.open(P/'sheet.png');b=Image.new('RGBA',a.size,'#363c43');b.alpha_composite(a);d=ImageDraw.Draw(b)
for di,dr in enumerate(['front','back']):
 for i,n in enumerate(names):
  x,y=socks[dr][n];col=i if i<7 else i-7;row=di if i<7 else di+2;x+=col*256;y+=row*256
  d.ellipse((x-3,y-3,x+3,y+3),fill='cyan');d.line((x-7,y,x+7,y),fill='white');d.line((x,y-7,x,y+7),fill='white')
b.save(P/'socket-review.png')
q=json.load(open(P/'qa.json'));q['visualReview']={'reviewed':True,'notes':['All 26 poses inspected in contact-sheet.png; consistent copper braids, bronze armor, covered high collar, red tabard front/back; no baked weapons/wings.','Walk-right regenerated from cropped Warrior torso identity plus compact Knight gait3 pose-only reference. Foreground thigh crosses pelvis forward with lifted boot. Walk-left retains foreground shin folded behind, making opposing anatomical phases visible. Bronze boots remain flat and fur-free.','Jump1 crouched; jump2 and jump3 bent airborne poses distinct. Five body attacks distinct in both views. Collapse lies low, with front/back differentiated.','Uniform .45703125 scale for main groups; both corrected gait groups use one .421875 group scale after source cells normalized to512. No per-frame scaling.','No output clipping, 26 unique hashes, two transparent blank cells.'], 'sockets':'Coordinates manually measured from final 256-pixel frames; socket-review.png records visual placement.'}
q['pipelineNotes'][1]='Damage raw uniformly resized from1254-square to1024-square. Opposite raw1536x1024 cropped into512-square cells without deformation, scaled once uniformly as a group. No mirrored, rotated, duplicate or synthesized poses.'
(P/'qa.json').write_text(json.dumps(q,indent=2)+'\n')
for f in (P/'raw').glob('*.b64'):
 png=f.with_suffix('.png')
 if png.exists():
  Image.open(png).verify();f.unlink()
# Transparent walk loop, no world movement, shows front then rear separately in two columns.
frames=[]
for n in ['idle','walk_right','idle','walk_left']:
 out=Image.new('RGBA',(512,256))
 for i,dr in enumerate(['front','back']):out.alpha_composite(Image.open(P/'frames'/f'{dr}-{n}.png'),(i*256,0))
 frames.append(out)
frames[0].save(P/'walk-preview.gif',save_all=True,append_images=frames[1:],duration=180,loop=0,disposal=2)
print('finalized')
