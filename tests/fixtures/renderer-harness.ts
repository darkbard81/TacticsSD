import { Container, Sprite, Rectangle } from 'pixi.js';
import {createRig,makeView,updateGeometry,resetPlacement} from '../../src/domain/rig';
import {RigAssets} from '../../src/runtime/assets';
import {PixiRigRenderer} from '../../src/runtime/renderer';
export async function verifyPixels() {
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=500;
    const ctx=canvas.getContext('2d')!;
    // Six disjoint colored pieces, with transparent space between all partitions.
    const pieces=[['#edc46a',140,20,120,110],['#6ac9e3',170,170,55,130],['#e78472',95,175,45,110],['#b3cf68',250,175,40,110],['#ac8ce8',165,350,25,140],['#ed9dbe',210,350,25,140]] as const;
    for(const [color,x,y,w,h] of pieces){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
    const file=new File([await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!)))],'separable.png',{type:'image/png'});
    const assets=new RigAssets(),asset=await assets.file(file,'fixture');assets.put(asset);
    const rig=createRig();rig.views.Front=makeView('Front',asset.ref);
    const regions = {head:[130,10,140,130],body:[160,160,70,150],armL:[240,165,60,130],armR:[85,165,65,130],footL:[200,340,45,160],footR:[155,340,40,160]};
    for(const p of rig.views.Front.parts){ const [x,y,width,height]=regions[p.id as keyof typeof regions];p.rect={x,y,width,height};p.pivot={x:width/2,y:15};resetPlacement(p,rig.views.Front); }
    const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:400px;height:500px';document.body.append(host);
    let frames=0;const renderer=new PixiRigRenderer(host,()=>frames++);await renderer.init();renderer.app.stop();
    renderer.sync(rig,assets,['Front'],null);renderer.render(0,'Rest');
    const frame=new Rectangle(0,0,400,500);
    const extractActual=()=>{
      renderer.app.stage.children[0].visible=false;
      const root=renderer.app.stage.children[1];root.position.set(rig.views.Front.ground.x,rig.views.Front.ground.y);root.scale.set(1);
      return renderer.app.renderer.extract.pixels({target:renderer.app.stage,frame,resolution:1}).pixels;
    };
    const actual=extractActual();
    const original=new Container();original.addChild(new Sprite(asset.texture));
    const expected=renderer.app.renderer.extract.pixels({target:original,frame,resolution:1}).pixels;
    const differences=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>{let count=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d>1)count++;max=Math.max(max,d);}return {count,max};};
    const initial=differences(actual,expected);
    const p=rig.views.Front.parts[1];updateGeometry(p,p.rect,{x:p.pivot.x+3,y:p.pivot.y+5});
    renderer.sync(rig,assets,['Front'],null);renderer.render(2,'Rest');const afterPivot=differences(extractActual(),expected);
    const initialListeners=renderer.diagnostics().listeners;
    original.destroy({children:true});renderer.app.start();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const activeFrames=frames;
    renderer.destroy();assets.destroy();host.remove();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    return {initial,afterPivot,initialListeners,remainingAssets:assets.count,framesAfterDestroy:frames-activeFrames,activeFrames};
}
