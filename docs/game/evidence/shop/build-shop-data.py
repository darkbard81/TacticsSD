from pathlib import Path
import json,shutil,hashlib
from PIL import Image
r=Path('/home/deck/Documents/TacticsSD'); src=Path('/tmp/tacticssd-repair/catalog-source');out=r/'docs/game/reference';out.mkdir(exist_ok=True);ev=r/'docs/game/evidence/shop';ev.mkdir(exist_ok=True)
for f in ['weapons.json','armor.json','sundries.json','data_abilities.json']:
 shutil.copy2(src/f,out/f)
ids={'weapons':[313,314,315],'armor':[397,398,443,444,445,446,447,448,488,489,490,537,539,541,543,545,547,551,553,555],'sundries':[1000,1004,1008,1012,1013]}
names=['전쟁 활','단궁','장궁','버클러','카이트 방패','로브','가죽 조끼','사슬 갑옷','마법사 로브','누비 갑옷','발두르 갑옷','가죽 장갑','강철 건틀릿','룬 장갑','전사의 반지','수호자의 반지','힘의 반지','활력의 반지','기교의 반지','민첩의 반지','지성의 반지','지혜의 반지','결계의 반지','치유의 잎','치유의 씨앗','치유 연고','마력의 잎','인삼']
items=[];catalog=[]
for group in ids:
 rows=json.load(open(src/(group+'.json')))
 for row in rows:
  catalog.append({'sourceId':row['id'],'group':group,'name':row['name'],'type':row['typ'],'price':row['price'],'registered':row['id'] in ids[group],'url':f'https://ogre-db.github.io/one-vision/{group}.html','reason':'원문 효과를 축소 캠페인에 명시적으로 적용' if row['id'] in ids[group] else '현재 무기군·5슬롯·회복효과 범위 밖 또는 후속 콘텐츠. 구매 불가'})
 for id in ids[group]:
  raw=next(x for x in rows if x['id']==id); slot='weapon' if group=='weapons' else 'consumable' if group=='sundries' else {182:'offhand',24:'armor',25:'armguard',29:'accessory'}[raw['typ']]
  stats={k:(v if v<128 else v-256) for k in ['str','vit','dex','agi','avd','int','mnd','res'] if (v:=raw.get(k,0))}
  from math import ceil
  scaled=lambda v:ceil(v/4) if v>=0 else -ceil(-v/4)
  applied={'stats':{k:scaled(v) for k,v in stats.items()},'defense':ceil(raw.get('def',0)/6),'attack':ceil(raw.get('atk',0)/(8 if slot=='weapon' else 4)),'hp':ceil(raw.get('hp',0)/4),'mp':ceil(raw.get('mp',0)/4),'resistance':ceil(raw.get('resphys',0)/5),'move':0}
  items.append({'id':'mend-leaf' if id==1000 else 'ov-'+str(id),'name':names[len(items)],'sourceName':raw['name'],'sourceId':id,'slot':slot,'price':ceil(raw['price']/10),'unlock':1 if raw.get('lvlreq',1)>5 else 0,'source':{'url':f'https://ogre-db.github.io/one-vision/{group}.html','dataUrl':f'https://ogre-db.github.io/one-vision/data/{group}.json','price':raw['price'],'level':raw.get('lvlreq',0),'type':raw['typ'],'effectId':raw.get('effect',0),'pdfPages': [115] if id in [1000,1004,1008,1012] else [77,78] if id==1013 else [1], 'raw':raw},'applied':applied})
(r/'game/source-items.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n');(r/'game/source-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
# Unique source art frames, 256x256 with >=12 px alpha border; technical crop/normalize only.
groups=[['travel-mail','silver-mail','wooden-shield','silver-bracers','warrior-ring','scholar-ring','aether-draught','valor-draught','ov-313','ov-314','ov-315','ov-397','ov-398','ov-443','ov-444','ov-445'],['ov-446','ov-447','ov-448','ov-488','ov-489','ov-490','ov-537','ov-539','ov-541','ov-543','ov-545','ov-547','ov-551','ov-553','ov-555'],['mend-leaf','ov-1004','ov-1008','ov-1012','ov-1013']]
atlas=Image.new('RGBA',(2048,2048));manifest={};n=0
for g,ids2 in zip('abc',groups):
 im=Image.open('/tmp/tacticssd-repair/items-'+g+'-original.png').convert('RGBA');shutil.copy2('/tmp/tacticssd-repair/items-'+g+'-original.png',ev)
 for j,id in enumerate(ids2):
  if g=='c':
   rect=[(0,0,465,630),(465,0,820,630),(820,0,1280,630),(0,630,455,1280),(455,630,905,1280)][j]
  else:
   cw=im.width/4;ch=im.height/4;rect=(int(j%4*cw),int(j//4*ch),int((j%4+1)*cw),int((j//4+1)*ch))
  icon=im.crop(rect);bbox=icon.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();assert bbox
  icon=icon.crop(bbox);icon.thumbnail((228,228),Image.Resampling.LANCZOS)
  x=n%8*256;y=n//8*256;atlas.alpha_composite(icon,(x+(256-icon.width)//2,y+(256-icon.height)//2));manifest[id]={'assetId':'item-'+id,'x':x,'y':y,'w':256,'h':256,'anchorX':128,'anchorY':128,'sourceAtlas':g,'sourceCell':j,'sourceCrop':rect};n+=1
atlas.save(r/'game/assets/items.png');(r/'game/assets/items.json').write_text(json.dumps(manifest,indent=2)+'\n');shutil.copy2('/tmp/tacticssd-repair/item-prompts.json',ev)
(out/'SOURCE_MANIFEST.json').write_text(json.dumps({'retrieved':'2026-10-04','rawRows':len(catalog),'registeredSource':len(items),'unregistered':len(catalog)-len(items),'pdf':'Readme v1.11d.pdf (138 pages), historical changes distinct from current URL tables','files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in out.glob('*.json')}},indent=2))
print('Catalog',len(catalog),'source registered',len(items),'newart',len(manifest))
