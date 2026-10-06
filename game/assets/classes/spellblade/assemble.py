"""Deterministic keying/extraction/registration only; all body art is ImageGen."""
from pathlib import Path
import importlib.util,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('spriteproc','/home/deck/.codex/skills/generate2dsprite/scripts/generate2dsprite.py')
proc=importlib.util.module_from_spec(spec);spec.loader.exec_module(proc)
GROUPS={'locomotion':(3,2,.445),'attack-front':(3,2,.445),'attack-back':(3,2,.445),'jump':(3,2,.395),'damage':(2,2,.48),'opposite':(2,2,.42),'near-forward-compact':(2,2,.345)}
cache={}
for group,(cols,rows,scale) in GROUPS.items():
    p=ROOT/'raw'/f'{group}.png'
    if not p.exists(): continue
    keyed=ROOT/'raw'/f'{group}-keyed.png'
    im=Image.open(keyed).convert('RGBA') if keyed.exists() else proc.remove_bg_magenta(Image.open(p).convert('RGBA'))
    arr=np.asarray(im).copy();r,g,b=arr[:,:,0].astype(int),arr[:,:,1].astype(int),arr[:,:,2].astype(int)
    mag=(r>g+25)&(b>g+25)&(r>b*.65)
    arr[mag,3]=0;arr[arr[:,:,3]==0,:3]=0
    im=Image.fromarray(arr);im.save(ROOT/'raw'/f'{group}-keyed.png')
    w,h=im.width//cols,im.height//rows
    cache[group]=([im.crop((c*w,r*h,(c+1)*w,(r+1)*h)) for r in range(rows) for c in range(cols)],scale)
SEM=['idle','walk_right','walk_left','hurt','jump1','jump2','jump3','collapse','attack1','attack2','attack3','attack4','attack5']
MAP={}
for back in (False,True):
    d='back' if back else 'front';off=3 if back else 0
    MAP[d]={
        'idle':('locomotion',off), 'walk_right':('near-forward-compact',2 if back else 0),
        'walk_left':('opposite',2 if back else 0),
        'hurt':('damage',2 if back else 0),'collapse':('damage',3 if back else 1),
        **{f'jump{i+1}':('jump',off+i) for i in range(3)},
        **{f'attack{i+1}':('attack-back' if back else 'attack-front',i) for i in range(5)}}
sheet=Image.new('RGBA',(1792,1024));report=[];transforms={}
for di,(direction,poses) in enumerate(MAP.items()):
    for pose in SEM:
        group,idx=poses[pose];raw,scale=cache[group];im=raw[idx];a=np.asarray(im.getchannel('A'));ys,xs=np.where(a>32)
        box=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
        lower=ys>box[3]-(box[3]-box[1])*.17
        cx=(xs[lower].min()+xs[lower].max())/2
        if pose=='collapse': cx=(box[0]+box[2])/2
        if group=='opposite': cx=(box[0]+box[2])/2+30
        if group=='near-forward-compact': cx=(box[0]+box[2])/2+30
        if pose=='hurt': cx=(box[0]+box[2])/2+10
        target_y=210 if pose=='jump2' else 200 if pose=='jump3' else 230
        left=round(128-cx*scale);top=round(target_y-box[3]*scale)
        resized=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(256,256));frame.alpha_composite(resized,(left,top))
        fa=np.asarray(frame.getchannel('A'));fy,fx=np.where(fa>32)
        bounds=[int(fx.min()),int(fy.min()),int(fx.max()+1),int(fy.max()+1)]
        assert min(bounds[0],bounds[1],256-bounds[2],256-bounds[3])>=8,(direction,pose,bounds)
        name=direction+'_'+pose;frame.save(ROOT/'frames'/f'{name}.png')
        if SEM.index(pose)<7:row=di;col=SEM.index(pose)
        else:row=di+2;col=SEM.index(pose)-7
        sheet.alpha_composite(frame,(col*256,row*256))
        report.append({'id':name,'source':f'raw/{group}.png','source_cell':idx,'bounds':bounds,'scale':scale,'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),'alpha_pixels':int((fa>0).sum())})
        transforms[name]={'source_cell':idx,'source_group':group,'scale':scale,'translate':[left,top]}
sheet.save(ROOT/'sheet.png')
(ROOT/'transforms.json').write_text(json.dumps(transforms,indent=2))
qa={'dimensions':[1792,1024],'mode':'RGBA','cell':[256,256],'poses':26,'unique_hashes':len(set(x['sha256'] for x in report)),'blank_cells':[[6,2],[6,3]],'blank_alpha_sum':[int(np.asarray(sheet.crop((1536,r*256,1792,(r+1)*256)).getchannel('A')).sum()) for r in (2,3)],'minimum_alpha32_gutter':min(min(x['bounds'][0],x['bounds'][1],256-x['bounds'][2],256-x['bounds'][3]) for x in report),'frames':report,'processing':'Actual ImageGen action groups, magenta key and fringe cleanup, uniform per-group scale; translation registers feet, no frame-specific resize/mirroring/rotation/pose fabrication.'}
if (ROOT/'visual-review.json').exists(): qa['visual_review']=json.loads((ROOT/'visual-review.json').read_text())
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2))
contact=Image.new('RGB',sheet.size,(44,49,64));contact.paste(sheet,mask=sheet.getchannel('A'));draw=ImageDraw.Draw(contact)
for x in report:
    dire,pose=x['id'].split('_',1);i=SEM.index(pose);row=(0 if dire=='front' else 1)+(2 if i>=7 else 0);col=i if i<7 else i-7
    draw.text((col*256+10,row*256+240),x['id'],fill=(230,230,230))
contact.save(ROOT/'contact-sheet.png')
print(json.dumps({k:qa[k] for k in ('poses','unique_hashes','minimum_alpha32_gutter','blank_alpha_sum')}))
