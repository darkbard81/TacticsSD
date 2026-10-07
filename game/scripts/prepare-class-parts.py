"""Pack native ImageGen pixels and fit six rigid bones to a 2.5-head anatomy.
Inputs are front.png/back.png plus artist-authored manifest.json landmarks.
Packing never resamples image pixels. Head H excludes hats and hanging hair.
"""
from PIL import Image
from pathlib import Path
import json, math, shutil, argparse
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
IDS = ['head', 'body', 'armL', 'armR', 'legL', 'legR']
H = 400
HEIGHT = 2.5 * H
# Below the chin: body ends at -280; each 373.333-unit leg overlaps it by 25%.
BODY_TOP, BODY_BOTTOM = -615, -280
LEG_HEIGHT = -BODY_BOTTOM / .75
ARM_HEIGHT = 350

def ident():
    return dict(x=0, y=0, scaleX=1, scaleY=1, rotation=0, skewX=0, skewY=0)

report = {}
for folder in sorted(args.source.iterdir()):
    source_spec = folder/'source-landmarks.json' if (folder/'source-landmarks.json').is_file() else folder/'manifest.json'
    if not source_spec.is_file():
        continue
    source_manifest = json.loads(source_spec.read_text())
    if 'views' not in source_manifest:
        raise ValueError(f'{folder.name}: views landmarks required')
    crops, landmarks, source_sizes = {}, {}, {}
    for name in ['Front', 'Back']:
        source_view = source_manifest['views'][name]
        source = folder / source_view.get('file', name.lower() + '.png')
        image = Image.open(source).convert('RGBA')
        source_sizes[name] = list(image.size)
        crops[name] = {}
        for id in IDS:
            clean = folder / 'crops' / name / (id + '.png')
            crops[name][id] = Image.open(clean).convert('RGBA') if clean.is_file() else image.crop(source_view['bounds'][id])
        landmarks[name] = source_view
    # Exact 16:9, with roomy 6-column/2-row cells; all crops retain native resolution.
    max_width = max(im.width for view in crops.values() for im in view.values())
    max_height = max(im.height for view in crops.values() for im in view.values())
    atlas_width = max(3072, math.ceil((max_width + 24) * 6 / 16) * 16,
                      math.ceil((max_height + 24) * 32 / 9 / 16) * 16)
    atlas_height = atlas_width * 9 // 16
    atlas = Image.new('RGBA', (atlas_width, atlas_height))
    target = args.output / folder.name
    target.mkdir(parents=True, exist_ok=True)
    views, fit = {}, {}
    image_ref = dict(id=f'{folder.name}-parts', name='parts.png', width=atlas_width, height=atlas_height)
    for vi, name in enumerate(['Front', 'Back']):
        native = landmarks[name]
        hb = native['bounds']['head']
        head = native['head']
        head_h = head['chin'][1] - head['crown'][1]
        if head_h <= 0:
            raise ValueError(f'{folder.name} {name}: invalid anatomical head landmarks')
        head_scale = H / head_h
        body_image = crops[name]['body']
        body_scale = (BODY_BOTTOM - BODY_TOP) / body_image.height
        body_width = body_image.width * body_scale
        body_bounds = native['bounds']['body']
        body_anchors = native.get('body_anchors', native.get('joints', {}).get('body', native.get('body', {})))
        def attachment(id, kind):
            return native.get('limb_anchors', {}).get(id+'_'+kind, native.get('joints', {}).get(id, {}).get(kind, native.get('partAttachmentCenters', {}).get(id)))
        leg_width = max(crops[name][id].width * LEG_HEIGHT / crops[name][id].height for id in ['legL','legR'])
        parts = []
        metrics = {}
        for index, id in enumerate(IDS):
            crop = crops[name][id]
            x = round((index + .5) * atlas_width / 6 - crop.width / 2)
            y = round((vi + .5) * atlas_height / 2 - crop.height / 2)
            atlas.alpha_composite(crop, (x, y))
            rect = dict(x=x, y=y, width=crop.width, height=crop.height)
            if id == 'head':
                scale = head_scale
                # Chin pivot puts the anatomical crown exactly at -1000 and chin at -600.
                pivot = dict(x=head.get('neck', head['chin'])[0] - hb[0], y=head['chin'][1] - hb[1])
                px, py = 0, -HEIGHT + H
            elif id == 'body':
                scale = body_scale
                pivot = dict(x=crop.width * .5, y=crop.height * .4)
                px, py = 0, BODY_TOP + pivot['y'] * scale
            elif id.startswith('arm'):
                scale = ARM_HEIGHT / crop.height
                anchor = attachment(id, 'shoulder'); bounds = native['bounds'][id]
                pivot = dict(x=anchor[0]-bounds[0], y=anchor[1]-bounds[1]) if anchor else dict(x=crop.width*.5,y=crop.height*.2)
                sign = (1 if id == 'armL' else -1) * (1 if name == 'Front' else -1)
                # Shoulder cap overlaps the torso's upper edge instead of touching its silhouette.
                shoulder = body_anchors.get('shoulder'+id[-1])
                px = (shoulder[0]-body_bounds[0]-body_image.width*.5)*body_scale if shoulder else sign*body_width*.35
                py = BODY_TOP+(shoulder[1]-body_bounds[1])*body_scale if shoulder else BODY_TOP+70
            else:
                scale = LEG_HEIGHT / crop.height
                anchor = attachment(id, 'hip'); bounds = native['bounds'][id]
                pivot = dict(x=anchor[0]-bounds[0], y=anchor[1]-bounds[1]) if anchor else dict(x=crop.width*.5,y=crop.height*.2)
                sign = (1 if id == 'legL' else -1) * (1 if name == 'Front' else -1)
                px = sign * max(body_width*.23, leg_width*.48)
                py = -(crop.height - pivot['y']) * scale
            parts.append(dict(id=id, rect=rect, pivot=pivot,
                              restTransform={**ident(), 'scaleX': scale, 'scaleY': scale},
                              attachment=dict(parentId=None, socket=dict(x=px, y=py)),
                              zIndex={'head':4, 'body':2, 'armL':3, 'armR':3, 'legL':1, 'legR':1}[id], visible=True))
            metrics[id] = dict(nativePixels=[crop.width, crop.height], absoluteScale=scale,
                               opaqueBoundsRig=[px-pivot['x']*scale, py-pivot['y']*scale,
                                                px+(crop.width-pivot['x'])*scale, py+(crop.height-pivot['y'])*scale])
        body = parts[1]
        bs, bp, socket = body['restTransform']['scaleX'], body['pivot'], body['attachment']['socket']
        for part in parts:
            if part['id'] == 'body':
                continue
            point = part['attachment']['socket']
            part['attachment'] = dict(parentId='body', socket=dict(x=bp['x']+(point['x']-socket['x'])/bs,
                                                                 y=bp['y']+(point['y']-socket['y'])/bs))
            part['restTransform']['scaleX'] /= bs
            part['restTransform']['scaleY'] /= bs
        views[name] = dict(image=image_ref, width=atlas_width, height=atlas_height,
                           ground=dict(x=atlas_width/2, y=atlas_height-1), displayScale=1,
                           referenceSize=HEIGHT, parts=parts)
        fit[name] = dict(anatomicalHeadNative=head_h, anatomicalHeadRig=H, crownRig=-HEIGHT,
                         chinRig=-HEIGHT+H, soleRig=0, anatomyHeads=2.5,
                         legTorsoOverlapRig=LEG_HEIGHT+BODY_BOTTOM, legTorsoOverlapFraction=.25,
                         parts=metrics)
    directions = {}
    for direction in ['Front','Back','SE','SW','NE','NW']:
        back = direction in ['Back','NE','NW']; iso = direction not in ['Front','Back']; west = direction.endswith('W')
        directions[direction] = dict(view='Back' if back else 'Front', flip=iso and west,
            vector=dict(x=(-.866 if west else .866) if iso else 0, y=-.5 if back else .5 if iso else 1),
            motionSign=-1 if back else 1, swapLimbs=False, parts={id:{**ident(),'zOffset':0} for id in IDS})
    rig = dict(schemaVersion=2, id=f'{folder.name}-standee', rigType='humanoid', views=views,
               motion=dict(presetId='SD_Walk',duration=.95,bounce=.005,lean=.009,headRecoil=.001,
                           armSwing=.10,stride=.012,lift=.009,footScale=0,stance=.6,depthOrder=.2), directions=directions)
    atlas.save(target / 'parts.png')
    (target / 'rig.json').write_text(json.dumps(rig, ensure_ascii=False, indent=2)+'\n')
    for source in folder.iterdir():
        if source.name in ['front.png','back.png','manifest.json','prompts.txt'] or source.name.endswith('-prompt.txt'):
            shutil.copy2(source, target / ('source-landmarks.json' if source.name == 'manifest.json' else source.name))
    portable = json.loads(json.dumps(source_manifest))
    for name, value in portable['views'].items():
        value['file'] = name.lower()+'.png'
        value['crops'] = {id:'crops/'+name+'/'+id+'.png' for id in IDS}
    (target/'source-landmarks.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n')
    if (folder/'crops').is_dir():
        shutil.copytree(folder/'crops', target/'crops', dirs_exist_ok=True)
    report[folder.name] = dict(partsPerView=6,views=2,generatedParts=12,sourceSize=source_sizes,
                              atlasSize=[atlas_width,atlas_height],nativePixelsPreserved=True,anatomy=fit)
    print(folder.name, 'atlas', atlas.size, 'native H', [fit[v]['anatomicalHeadNative'] for v in fit])
args.output.mkdir(parents=True, exist_ok=True)
(args.output/'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
