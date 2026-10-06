from pathlib import Path
import json,sys
from PIL import Image
sys.path.insert(0,'/home/deck/.codex/skills/hatch-pet/scripts')
from prepare_pet_run import create_layout_guide
root=Path(__file__).resolve().parent
project=root.parents[2]
source=project/'docs/Ref/sprite/Iuria Wolph_highres_v2.json'
data=json.loads(source.read_text());(root/'action-source.json').write_text(source.read_text())
request=json.loads((root/'pet_request.json').read_text())
request['output_contract']={'type':'isometric-game-spritesheet','cell':[64,64],'sheet':[448,256],'rows':[7,7,6,6],'pet_installation':False}
request['chroma_key']={'hex':'#FF00FF','name':'magenta'}
(root/'pet_request.json').write_text(json.dumps(request,indent=2))
base='''Create ONE full-body canonical pixel-art sprite of an adult female ELF WARRIOR for an isometric tactical RPG. Compact chibi proportions matching a 64x64 game cell: head about 40% of body height, body about 50 pixels tall at native scale. Three-quarter front view facing screen bottom-right, high camera angle so top of head and shoulders are visible. Pointed long elf ears, silver-white hair tied in one short low ponytail, emerald fitted tunic with dark steel chest armor and shoulder guards, small gold belt clasp, brown boots and brown wrist guards. Empty hands, no weapons or shields: action sheet will be weapon-independent. Calm neutral standing pose, both arms and legs readable. Small readable clusters, limited 24-color palette, hard stepped pixel edges, 1 pixel dark outlines, flat cel shading, top-left light. No realistic rendering, no painting, no smooth vector curves, no tiny ornate accessories. One single complete sprite, ample clear margin, solid flat MAGENTA #FF00FF chroma-key background. No pink or magenta in character, no ground shadows, no effects, no text, no grids, no labels, no scenery. This exact identity will be used for all later pose rows.'''
(root/'prompts/base-pet.md').write_text(base)
manifest=json.loads((root/'imagegen-jobs.json').read_text());manifest['jobs']=manifest['jobs'][:1]
image=Image.open(project/'docs/Ref/sprite/Iuria Wolph_highres_v2.png')
for row,count in enumerate([7,7,6,6],1):
 id=f'game-row-{row}';guide=f'references/layout-guides/{id}.png'
 create_layout_guide(root/guide,id,count)
 pose=f'references/pose-row-{row}.png';image.crop((0,(row-1)*64,count*64,row*64)).save(root/pose)
 cells=[c for c in data['cells'] if c['row']==row and not c['empty']]
 entries=[]
 for cell in cells:
  bp=cell['bodyPose']
  entries.append(f"Slot {cell['column']}: {cell['action']}. {cell['description']} Left hand: {bp['leftHand']} Right hand: {bp['rightHand']} Left foot: {bp['leftFoot']} Right foot: {bp['rightFoot']}")
 view='THREE-QUARTER FRONT facing screen bottom-right' if row%2 else 'THREE-QUARTER BACK facing screen top-left, actual back of same outfit and ponytail; not a horizontal flip of front'
 prompt=f'''Generate exactly {count} distinct full-body pixel-art poses in ONE horizontal row of equal-width invisible slots. This is custom game row {row}, not a default pet animation. Every sprite must be the EXACT SAME elf woman warrior as attached canonical base: identical face, silver-white ponytail, ears, emerald tunic, dark steel armor, gold belt clasp, brown boots and wrist guards, same proportions and palette. DO NOT redesign. Hands empty, no added weapon/props. View: {view}, isometric tactical RPG elevated camera. Keep this direction in every slot. Reference pose-row is BODY POSE ONLY: transfer hands/feet/body gestures, do not copy that character, brown hair, purple clothing, wings, or identity. Layout guide is only spacing/frame-count guidance, never copy its marks. Match native64x64 pixel-art density, 1px dark outline, compact chibi silhouette, body approx50px tall. Head/body size identical across all slots; do NOT inflate head or change height to fit different gestures. Keep stable body origin: normal feet land near cell bottom, airborne sprite stays visibly elevated, collapsed body stays low. Feet anchors consistent, no frame touching slot boundaries. Use full image width for evenly separated {count} poses; include exactly one complete figure per slot.\nLeft-to-right action specifications (left/right refer to CHARACTER anatomy, not image left/right):\n'''+ '\n'.join(entries)+'''\nThe uncertain third slot of row3/4 must follow the modest bent open-arm reference, not a dramatic gesture. For ranged preparation keep left hand forward and right hand drawn back but EMPTY; for finish extend right hand forward. Damage is involuntary recoil, not a victory pose. Immobilized is static lowered head, not gray petrification. No duplicated idle poses substituted for required actions. No wings, no detached effects, trails, sparkles, dust, shadows, floor cues, text, labels, grids, blur or gradients. Perfectly flat opaque MAGENTA #FF00FF background everywhere outside sprites. No magenta shades in sprite. Crisp pixel clusters, exact same palette and lighting. Each pose separated by clear chroma-key padding.'''
 (root/f'prompts/rows/{id}.md').write_text(prompt)
 manifest['jobs'].append({'id':id,'kind':'row-strip','status':'pending','prompt_file':f'prompts/rows/{id}.md','output_path':f'decoded/{id}.png','depends_on':['base'],'input_images':[{'path':'references/canonical-base.png','role':'canonical identity reference'},{'path':'decoded/base.png','role':'approved base'},{'path':pose,'role':'body pose only, NOT character identity'},{'path':guide,'role':'layout only, never copy guide marks'}],'generation_skill':'$imagegen','allow_prompt_only_generation':False,'requires_grounded_generation':True,'recording_owner':'parent','frame_count':count})
(root/'imagegen-jobs.json').write_text(json.dumps(manifest,indent=2))
print(root);print(base)
