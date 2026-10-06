from pathlib import Path
from PIL import Image
R=Path(__file__).parent
seq=['walk_right','idle','walk_left','idle']
frames=[]
for pose in seq:
 im=Image.new('RGB',(512,256),(44,49,64))
 for i,d in enumerate(['front','back']):
  f=Image.open(R/'frames'/f'{d}_{pose}.png');im.paste(f,(i*256,0),f)
 frames.append(im)
frames[0].save(R/'idle-walk-preview.gif',save_all=True,append_images=frames[1:],duration=180,loop=0)
