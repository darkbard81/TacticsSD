"""Hand-authored elf warrior, native 64px pixels; no image model."""
from pathlib import Path
import math
import json
import sys
from PIL import Image
sys.path.insert(0, '/home/deck/.codex/skills/pixel-art-studio/scripts')
from pixelstudio import Sprite

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent
P = ['#202533', '#374256', '#596c79', '#a5bdbe', '#eff4d8',
     '#8a5d50', '#bc8663', '#edba87', '#ffdfac',
     '#24453e', '#36765b', '#69a46d', '#a6ce86',
     '#755237', '#bc9146', '#eed286']
D, STEEL, SS, SL, WHITE, SKD, SKS, SK, SKL, GD, G, GL, GH, LEATHER, GOLD, LIGHT = P

def character(back=False, phase=0, action='walk', revision=2):
    s = Sprite(64, 64, palette=P)
    bob = [0, -1, 0, 1, 0, -1, 0][phase % 7] if action == 'walk' else 0
    dx = -2 if action == 'recoil' else 0
    dy = bob + (1 if action == 'crouch' else -3 if action == 'cheer' else 0)
    def poly(points, c): s.polygon([(x+dx,y+dy) for x,y in points],c)
    def rect(x0,y0,x1,y1,c): s.rect(x0+dx,y0+dy,x1+dx,y1+dy,c)
    def line(x0,y0,x1,y1,c): s.line(x0+dx,y0+dy,x1+dx,y1+dy,c)
    def ell(x0,y0,x1,y1,c): s.ellipse(x0+dx,y0+dy,x1+dx,y1+dy,c)
    def limb(a,b,width,color):
        vx,vy=b[0]-a[0],b[1]-a[1];length=max(1,math.hypot(vx,vy))
        ox,oy=round(-vy/length*width),round(vx/length*width)
        poly([(a[0]+ox,a[1]+oy),(b[0]+ox,b[1]+oy),
              (b[0]-ox,b[1]-oy),(a[0]-ox,a[1]-oy)],D)
        line(*a,*b,color)
        line(a[0]-1,a[1],b[0]-1,b[1],color)
    stride=[-3,-2,0,3,2,0,-1][phase%7] if action=='walk' else 1
    # Long silver hair and green mantle silhouette.
    poly([(21,15),(26,9),(37,9),(44,16),(43,31),(47,42),
          (39,45),(33,39),(23,44),(19,35)],D)
    poly([(23,17),(27,11),(36,11),(41,17),(41,31),(44,40),
          (39,42),(32,36),(24,41),(22,32)],SS)
    poly([(25,16),(28,12),(34,12),(30,26),(26,38),(23,39)],SL)
    line(26,17,24,33,WHITE)
    poly([(24,33),(37,32),(43,46),(34,48),(22,46)],GD)
    poly([(24,34),(34,34),(37,44),(25,44)],G)
    # Two independently articulated legs; contact pivot remains y60.
    for side, x, step in [('far',35,-stride),('near',27,stride)]:
        lift = -3 if action=='walk' and step>1 else 0
        knee=(x+step//2,51+lift//2); foot=(x+step,58+lift)
        limb((x,44),knee,3,GD)
        limb(knee,foot,3,LEATHER)
        poly([(foot[0]-3,54+lift),(foot[0]+2,54+lift),(foot[0]+3,58+lift),
              (foot[0]+5,59+lift),(foot[0]+5,61+lift),(foot[0]-4,61+lift)],D)
        rect(foot[0]-2,55+lift,foot[0]+1,58+lift,LEATHER)
        rect(foot[0]-2,54+lift,foot[0]+2,55+lift,GOLD)
        line(foot[0]-2,59+lift,foot[0]+3,59+lift,SKD)
    # Breastplate, waist, split tunic and leaf-shaped pauldrons.
    poly([(25,30),(35,30),(40,35),(37,42),(24,42),(21,35)],D)
    poly([(26,31),(34,31),(38,35),(35,40),(25,40),(23,35)],STEEL)
    poly([(26,32),(32,32),(34,35),(31,38),(25,37)],SL)
    line(25,33,29,32,WHITE)
    poly([(23,42),(36,42),(39,48),(33,48),(30,45),(27,49),(21,48)],D)
    poly([(24,43),(29,43),(26,47),(23,47)],GL)
    poly([(32,43),(35,43),(37,47),(33,47)],G)
    rect(24,40,36,42,LEATHER);rect(29,40,32,42,GOLD);rect(30,40,31,41,LIGHT)
    left=(20-stride//2,43);right=(42+stride//2,42)
    if action=='guard':left=(19,36);right=(42,30)
    if action=='raise':left=(19,37);right=(42,17)
    if action=='recoil':left=(17,32);right=(43,38)
    if action=='cheer':left=(15,23);right=(46,22)
    if action=='slash':left=(20,42);right=(47,36)
    if action=='crouch':left=(20,44);right=(44,43)
    # Far arm, then head; near arm is redrawn above hair below.
    limb((24,34),left,3,SS)
    ell(left[0]-2,left[1]-2,left[0]+2,left[1]+2,SKS)
    poly([(21,32),(25,31),(27,35),(22,37),(19,35)],D)
    poly([(22,32),(25,32),(25,34),(21,35)],GL)
    # Angular pointed ears give the race a readable silhouette.
    poly([(22,22),(14,18),(18,27),(23,29)],D)
    poly([(21,23),(16,20),(19,26),(22,27)],SK)
    line(17,22,20,25,SKS)
    poly([(40,22),(48,18),(44,27),(39,28)],D)
    poly([(41,23),(46,20),(43,26),(40,27)],SKS)
    if not back:
        poly([(24,16),(35,14),(41,19),(41,27),(36,32),(27,31),(23,26)],D)
        poly([(25,17),(35,16),(39,20),(39,26),(35,30),(28,29),(25,25)],SK)
        poly([(25,18),(30,17),(30,24),(27,26),(25,24)],SKL)
        poly([(36,23),(40,24),(40,27),(35,29)],SKS)
        # Eyes occupy coherent 2x3 clusters, brows and a single nose highlight.
        rect(27,22,30,24,WHITE);rect(34,21,37,24,WHITE)
        rect(29,22,30,24,GD);rect(35,21,36,24,GD)
        line(27,20,30,20,SKD);line(34,19,37,20,SKD)
        line(32,25,33,25,SKL);line(32,28,35,28,SKD)
        # Swept bangs, ponytail roots and gold diadem.
        poly([(22,20),(23,14),(28,10),(37,11),(42,17),(37,18),
              (33,15),(28,20),(26,24),(24,22)],D)
        poly([(24,18),(25,14),(29,12),(36,12),(39,16),(35,15),
              (31,14),(27,19),(26,21)],SL)
        line(27,14,32,12,WHITE)
        line(30,16,36,16,GOLD);rect(33,16,34,18,LIGHT)
        poly([(23,22),(25,24),(24,33),(27,38),(24,40),(21,35)],SS)
        line(23,25,23,33,SL)
    else:
        poly([(23,18),(27,12),(37,12),(42,18),(40,31),(35,38),
              (27,37),(23,30)],D)
        poly([(25,18),(28,14),(36,14),(40,18),(38,29),(33,35),
              (28,33),(25,28)],SS)
        poly([(26,18),(29,15),(33,15),(31,27),(28,31),(26,26)],SL)
        line(28,17,27,25,WHITE);line(35,17,35,27,SL)
        rect(29,29,35,31,GOLD)
        poly([(30,32),(34,32),(37+stride//2,43),(31,46),(28,42)],SS)
        line(31,33,32,42,SL)
    limb((37,34),right,3,SL)
    ell(right[0]-2,right[1]-2,right[0]+2,right[1]+2,D)
    ell(right[0]-1,right[1]-1,right[0]+1,right[1]+1,SK)
    poly([(35,32),(39,31),(43,34),(41,38),(36,36)],D)
    poly([(36,33),(39,32),(41,34),(39,36)],GL)
    line(37,33,39,33,GH)
    # Short elven blade is held in the near hand, entirely within the cell.
    hx,hy=right
    if action in ('raise','cheer'):
        tip=(hx-1,3-dy)
    elif action=='slash':tip=(60-dx,hy-7)
    elif action=='guard':tip=(hx+7,9)
    else:tip=(hx+6,hy+13)
    vx,vy=tip[0]-hx,tip[1]-hy;n=max(1,math.hypot(vx,vy));ox,oy=round(-vy/n*2),round(vx/n*2)
    poly([(hx+ox,hy+oy),(tip[0],tip[1]),(hx-ox,hy-oy)],D)
    line(hx,hy,tip[0],tip[1],SL)
    line(hx-1,hy,tip[0]-1,tip[1]+1,WHITE)
    line(hx+ox*2,hy+oy*2,hx-ox*2,hy-oy*2,GOLD)
    if revision>=2:
        # Leaf engraving follows armor planes, not the outer silhouette.
        if not back:line(29,34,31,36,G);line(31,36,32,34,GL)
        line(24,45,25,44,GH)
    if revision>=3:
        # Clusters define flowing silver locks rather than a helmet-like cap.
        if not back:
            line(24,15,23,21,SL);line(22,27,22,33,SL)
            line(23,34,25,37,SL)
            line(38,13,40,16,SL)
            rect(37,25,38,26,SKL)
            line(32,29,34,29,SKS)
        else:
            line(38,20,37,29,SL);line(36,30,34,34,SL)
            line(31,16,29,24,WHITE)
        line(24,34,25,35,WHITE)
        line(36,34,38,35,GH)
        rect(25,38,27,39,SS)
        rect(33,38,35,39,SS)
    return s


metadata=[]
for revision in [1,2,3]:
    sheet=Image.new('RGBA',(448,256))
    for row,count in enumerate([7,7,6,6]):
        actions=['crouch','raise','guard','recoil','cheer','slash']
        for col in range(count):
            action='walk' if row<2 else actions[col]
            sprite=character(back=row%2==1,phase=col,action=action,revision=revision)
            frame=sprite.composite(1)
            assert frame.size==(64,64)
            assert not any(frame.getpixel((x,y))[3] for x,y in
                [(x,0) for x in range(64)]+[(x,63) for x in range(64)]+
                [(0,y) for y in range(64)]+[(63,y) for y in range(64)])
            sheet.alpha_composite(frame,(col*64,row*64))
            if revision==3:
                metadata.append({'row':row,'column':col,'view':'back' if row%2 else 'front',
                                 'action':action,'rect':[col*64,row*64,64,64],'pivot':[32,61]})
    sheet.save(ROOT/f'pass-{revision}.png')
    sheet.resize((1344,768),Image.Resampling.NEAREST).save(ROOT/f'preview-{revision}.png')
final=Sprite.from_png(str(ROOT/'pass-3.png'),scale=1)
final.despeckle(min_cluster=2)
final.save_png(str(PROJECT/'docs/Ref/sprite/Elf Warrior woman.png'))
final.save_png(str(ROOT/'display-4x.png'),scale=4)
final.save_silhouette(str(ROOT/'silhouette.png'))
(ROOT/'frames.json').write_text(json.dumps({'cell':[64,64],'sheet':[448,256],
    'rows':[7,7,6,6],'palette':P,'frames':metadata},indent=2))
final.stats()
