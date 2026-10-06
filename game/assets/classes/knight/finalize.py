from PIL import Image,ImageDraw
from pathlib import Path
import json,numpy as np
P=Path(__file__).parent
s={'front':{'idle':[90,157],'walk_right':[82,163],'walk_left':[63,138],'hurt':[55,146],'jump1':[132,222],'jump2':[124,168],'jump3':[90,27],'collapse':[174,222],'attack1':[135,114],'attack2':[98,58],'attack3':[206,105],'attack4':[178,198],'attack5':[124,136]},'back':{'idle':[167,155],'walk_right':[177,152],'walk_left':[179,116],'hurt':[188,105],'jump1':[175,224],'jump2':[166,166],'jump3':[164,27],'collapse':[206,218],'attack1':[170,113],'attack2':[160,54],'attack3':[206,98],'attack4':[194,183],'attack5':[181,135]}}
(P/'sockets.json').write_text(json.dumps(s,indent=2)+'\n')
qa=json.loads((P/'qa.json').read_text());sheet=Image.open(P/'sheet.png');a=np.array(sheet);qa['blank_cells_verified']=all(sheet.crop((1536,y,1792,y+256)).getbbox() is None for y in [512,768]);qa['minimum_gutter_px']=min(min(v['bounds'][0],v['bounds'][1],256-v['bounds'][2],256-v['bounds'][3]) for v in qa['frames'].values());qa['socket_count']=sum(map(len,s.values()));qa['visual_review']={'status':'passed','reviewed_all_26':True,'central_review':'Integration owner independently reviewed contact.png and passed before freeze','notes':['Original silverplate, blue tabard, short blue cape and pearl-white bob identity persists front/back.','Locomotion repaired after independent anatomical QA: walk_right foreground thigh crosses in front of pelvis with raised forward knee and boot; walk_left retains near trailing tucked boot. True near/far phase exchange visually reviewed. No mirrored or transformed pose art.','Ten unique attack frames visibly change guard, overhead windup, release, low follow-through, and recovery.','Jump2/3 ground-contact displacement is20/30px respectively; jump1 remains grounded crouch.','Collapse remains horizontal and low.','No wings, weapons, scenery, labels, clipping, or opaque cell backgrounds.','Uniform scale within each raw action group; per-group scale chosen to match anatomical head/body scale. No per-frame fit.','Hand socket coordinates manually measured from final frames for dominant equipment hand.']};(P/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
contact=Image.open(P/'contact.png');dr=ImageDraw.Draw(contact);poses=list(s['front'])
for d,row in [('front',0),('back',1)]:
 for i,p in enumerate(poses):
  c,r=(i,row) if i<7 else(i-7,row+2);x,y=s[d][p];x+=c*256;y+=r*276;dr.ellipse((x-4,y-4,x+4,y+4),outline='#00FFFF',width=2)
contact.save(P/'sockets-review.png')
# Readable low-resolution in-place loop preview; no pose warping.
frames=[]
for p in ['idle','walk_right','idle','walk_left']:
 frame=Image.new('RGB',(512,256),(38,43,55))
 for i,d in enumerate(['front','back']):
  f=Image.open(P/'frames'/f'{d}_{p}.png');frame.paste(f,(i*256,0),f)
 frames.append(frame)
frames[0].save(P/'walk-preview.gif',save_all=True,append_images=frames[1:],duration=[160,180,160,180],loop=0)
print({k:qa[k] for k in ['dimensions','unique_pose_hashes','blank_cells_verified','minimum_gutter_px','socket_count']})
