import {readFileSync,writeFileSync} from 'node:fs';
const rig=JSON.parse(readFileSync(new URL('../../tools/characterRig/assets/default-rig.json',import.meta.url),'utf8'));
rig.id='dawn-adult-elf';
const rects={Front:[[5,200,278,313],[283,128,285,448],[586,134,122,450],[750,134,130,450],[905,127,155,468],[1080,127,163,468]],Back:[[5,742,278,318],[284,671,290,447],[584,682,127,458],[750,682,136,458],[905,678,155,467],[1078,678,165,467]]};
for(const side of ['Front','Back']){const view=rig.views[side];view.image={id:'dawn-parts',name:'dawn-parts.png',width:1254,height:1254};view.width=1254;view.height=1254;view.referenceSize=960;view.displayScale=1;view.ground={x:627,y:1210};view.parts.forEach((p,i)=>{const [x,y,width,height]=rects[side][i];p.rect={x,y,width,height};p.restTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0,skewX:0,skewY:0};p.visible=true;delete p.replacement;
 const mirrored=side==='Back'; const sockets=[{x:142,y:30},{x:0,y:-662},{x:mirrored?50:233,y:55},{x:mirrored?233:50,y:55},{x:mirrored?96:195,y:350},{x:mirrored?195:96,y:350}];
 p.pivot=i===0?{x:139,y:285}:i===1?{x:142,y:35}:i<4?{x:61,y:30}:{x:78,y:28};p.attachment={parentId:i===1?null:'body',socket:sockets[i]};if(i>1)p.restTransform.scaleX=p.restTransform.scaleY=.75;p.zIndex=(side==='Front'?[6,3,4,5,1,1]:[6,3,4,2,1,1])[i];
 });}
rig.motion={...rig.motion,duration:.8,bounce:.006,lean:.012,headRecoil:.001,armSwing:.14,stride:.018,lift:.012};
writeFileSync(new URL('../assets/dawn-rig.json',import.meta.url),JSON.stringify(rig,null,2)+'\n');
