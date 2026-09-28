// Recreate the hand-authored preset without editing the source artwork (Node 24+).
import { writeFile } from 'node:fs/promises';
import { createRig, identity, serializeRig } from '../domain/rig.ts';
const rig = createRig();
rig.id = 'elf-parts-sheet';
const image = { id: 'sample-elf-parts-sheet', name: 'elf-parts-sheet.png', width: 1254, height: 1254 };
const region = {
  frontHead: [70, 10, 542, 502], backHead: [675, 10, 486, 514],
  frontBody: [540, 510, 338, 381], backBody: [879, 518, 344, 388],
  screenLeftArm: [28, 547, 208, 305], screenRightArm: [338, 547, 204, 305],
  frontRightFoot: [119, 900, 177, 329], frontLeftFoot: [331, 900, 179, 329],
  backLeftFoot: [742, 904, 178, 329], backRightFoot: [940, 904, 177, 329],
};
// id, source rectangle, local pivot, assembled anchor relative to the soles, layer.
const placements = {
  Front: [
    ['head', 'frontHead', [250, 380], [0, -667], 5],
    ['body', 'frontBody', [167, 25], [0, -625], 3],
    ['armL', 'screenRightArm', [50, 40], [120, -602], 2],
    ['armR', 'screenLeftArm', [151, 40], [-120, -602], 2],
    ['footL', 'frontLeftFoot', [90, 30], [72, -291], 1],
    ['footR', 'frontRightFoot', [85, 30], [-72, -291], 1],
  ],
  Back: [
    ['head', 'backHead', [245, 390], [0, -655], 5],
    ['body', 'backBody', [173, 28], [0, -627], 3],
    // The supplied sheet has ONE pair of arms. Reuse it; do not imply rear artwork exists.
    ['armL', 'screenLeftArm', [151, 40], [-120, -602], 2],
    ['armR', 'screenRightArm', [50, 40], [120, -602], 2],
    ['footL', 'backLeftFoot', [111, 35], [-72, -285], 1],
    ['footR', 'backRightFoot', [64, 35], [72, -285], 1],
  ],
};
for (const view of ['Front', 'Back']) {
  rig.views[view] = {
    image: structuredClone(image), width: 1254, height: 1254,
    ground: { x: 627, y: 1224 }, referenceSize: 1100, displayScale: 1,
    parts: placements[view].map(([id, name, pivot, anchor, zIndex]) => {
      const [x, y, width, height] = region[name];
      return { id, rect: { x, y, width, height }, pivot: { x: pivot[0], y: pivot[1] },
        restTransform: { ...identity(), x: anchor[0], y: anchor[1] }, zIndex, visible: true };
    }),
  };
}
Object.assign(rig.motion, { duration: 1.2, bounce: 0.004, lean: 0.008, headRecoil: 0.002, armSwing: 0.08, stride: 0.018, lift: 0.018 });
await writeFile(new URL('../assets/default-rig.json', import.meta.url), serializeRig(rig) + '\n');
