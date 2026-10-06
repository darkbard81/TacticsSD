from PIL import Image
import numpy as np
from collections import deque

def components(image):
 a=np.array(image); mask=a[:,:,3]>8;h,w=mask.shape; out=[]
 for y,x in zip(*np.where(mask)):
  if not mask[y,x]:continue
  q=[(int(x),int(y))]; mask[y,x]=False; pts=[]
  while q:
   px,py=q.pop();pts.append((px,py))
   for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
    if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;q.append((nx,ny))
  if len(pts)>500:
   xx,yy=zip(*pts);bbox=(min(xx),min(yy),max(xx)+1,max(yy)+1)
   out.append((len(pts),bbox,pts))
 return out
if __name__=='__main__':
 for name in ['generated','walk-contacts','actions']:
  cs=components(Image.open('/tmp/elf-sheet-v2/'+name+'.png'))
  print(name,len(cs));print([(n,b) for n,b,p in sorted(cs,key=lambda c:(c[1][1],c[1][0]))])
