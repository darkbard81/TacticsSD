from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,importlib.util
import numpy as np
p=Path(__file__).parent
qa=json.load(open(p/'qa.json'));s=json.load(open(p/'sockets.json'))
sheet=Image.open(p/'sheet.png');contact=Image.open(p/'contact-sheet.png');draw=ImageDraw.Draw(contact)
names=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
for m in qa['frames']:
 face,n=m['name'].split('_',1);x,y=s[face][n];frame=Image.open(p/'frames'/f'{face}_{n}.png')
 alpha=frame.getpixel((x,y))[3];assert alpha>=100,(face,n,alpha)
 m['hand_socket']=[x,y];m['socket_alpha']=alpha
 i=names.index(n);r=int(face=='back')+(2 if i>=7 else 0);c=i-7 if i>=7 else i
 draw.ellipse((c*256+x-3,r*256+y-3,c*256+x+3,r*256+y+3),fill='cyan')
 assert min(m['bounds'][0],m['bounds'][1],256-m['bounds'][2],256-m['bounds'][3])>=8,m['name']
contact.save(p/'socket-review.png')
for color,name in [('#101820','dark'),('#f3efe5','light')]:
 proof=Image.new('RGB',sheet.size,color);proof.paste(sheet,mask=sheet.getchannel('A'));proof.save(p/f'contact-{name}.png')
a=np.array(sheet);rgb=a[:,:,:3].astype(np.int16)
qa['min_gutter_px']=min(min(m['bounds'][0],m['bounds'][1],256-m['bounds'][2],256-m['bounds'][3]) for m in qa['frames'])
qa['all_sockets_alpha_100']=True
qa['hard_magenta_pixels']=int(np.sum((a[:,:,3]>0)&(np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]>90)&(rgb[:,:,2]>rgb[:,:,0]*.6)))
qa['sheet_sha256']=hashlib.sha256((p/'sheet.png').read_bytes()).hexdigest()
qa['visual_review']={'identity':'Adult armored elf woman with silver-lavender hair, angular gunmetal gothic armor, garnet accents, compact ragged red waist cape; front/back identity consistent.','actions':'26 source-generated poses. Distinct hurt, low full collapse, crouched anticipation, two tucked airborne poses, 5 body attacks in both views.','walk':'Initial gait attempts rejected for repeated lower legs. Final walk_left uses near boot tucked behind hip; final walk_right regenerated from Knight gait3 pose-only reference with near foreground knee lifted forward across the far straight planted support leg. Front and back verify opposite knee/hip overlap, not merely different foot height. No mirrors or body transformations.','coverage':'Fully covered outfit, no wings, horns, baked weapons or FX.','alpha':'Inspected on dark and light backgrounds; COLOR-only chroma despill preserves original keyed alpha and fine lavender strands. Interior lavender hair shadows are not keyed.','scale':'One uniform group scale compensates for ImageGen-returned different canvas/grid geometry, never per-frame fitting; rooted at x128 and ground230, airborne210/200.','limitations':'No class runtime or hardware tests within this isolated artwork subtask; integration owner runs centralized gate. Standard processor edge-gate failures retained in processed/ for audit; final explicit-footline/gutter checks pass.'}
(p/'qa.json').write_text(json.dumps(qa,indent=2))
spec=importlib.util.spec_from_file_location('sp','/home/deck/.codex/skills/generate2dsprite/scripts/generate2dsprite.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
frames=[Image.open(p/'frames'/f'front_{n}.png') for n in ['walk_right','idle','walk_left','idle']]
mod.save_transparent_gif(frames,p/'idle-preview.gif',150)
print(json.dumps({k:qa[k] for k in ['pose_count','unique_hashes','min_gutter_px','all_sockets_alpha_100','hard_magenta_pixels','sheet_sha256']}))
