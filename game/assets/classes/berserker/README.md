# Berserker art delivery

Final asset: `sheet.png`, 1792×1024 RGBA, 256-pixel cells, standard 26-pose front/back atlas. Mature adult elf identity with short crimson hair, leather cuirass, asymmetric fur mantle, ochre panels, trousers and fur boots; fully covered, no weapons or wings.

Actual ImageGen source groups and exact prompts remain in `raw/`. Accepted idle uses `locomotion`; forward walk uses `walk2`; opposite walk uses `opposite` indices 1 and 3 (lower rear boot). Rejected/replaced walk attempts remain as generation evidence. Attack, jump and injury source grids provide the other twenty poses. No mirrored, rotated, duplicated or procedurally painted poses.

`process.py` uses the generate2dsprite chroma-key processor, fringe cleanup, uniform scaling within each generated group, extraction and atlas packing. Source injury split is moved into empty background so the full collapsed feet survive; jump row split preserves the raised back fist. Jump group uses 92% of the locomotion source scale so raised fists retain eight-pixel gutters. No per-frame fit is used. Ground soles remain y230; airborne poses end at y210/y200.

`finalize.py` writes hand sockets, QA details, socket-review.jpg and idle-preview.gif. All 26 socket centers land on opaque pixels and were visually reviewed. Preview cycles neutral/right/neutral/left for both views; strong rear-boot follow-through gives this class an energetic walk. Runtime equipment overlap and display-scale validation are owned by integration.

QA: 26 unique frame hashes, two transparent unused cells, no pose within eight pixels of a cell boundary. `qa.json` records final bounds, source groups, scales and visual review. Reproduction Python: `/home/deck/.codex/skill-envs/agent-sprite-forge/bin/python`.

Final gait revision: `update_forward_gait.py` replaces only front/back walk_right cells with genuine new ImageGen `forward-gait.png` frames0/2, using Knight gait3 strictly as pose reference. Foreground knee crosses far straight support leg; paired walk_left uses tucked rear boot. Run this script after process.py and before finalize.py to reproduce current final atlas. `pre-forward-gait-hashes.json` proves all other atlas cells unchanged.
