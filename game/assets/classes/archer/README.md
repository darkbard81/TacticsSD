# Archer sprite atlas

`sheet.png` is the 1792×1024 transparent 26-pose atlas (256px cells). Final character: mature adult blonde elf ranger, single braid, green folded hood and coat, fully closed opaque ivory high-neck blouse, beige trousers, brown shoulder armor/gloves/boots. No built-in weapons or effects.

Raw ImageGen groups and prompts are retained in `raw/`. Accepted sources: `locomotion-covered`, `opposite` (low rear-boot variants 1 and 3), `attack-front-final`, `attack-back`, `jump`, and `injury`. Earlier image versions remain evidence, not runtime assets. Front attack neckline and duplicate braid were corrected with ImageGen; jump duplicate braid was corrected similarly.

`process.py` uses generate2dsprite chroma-key cleanup, fringe removal, uniform scale within each generated group, and deterministic atlas packing. No per-frame fit, mirroring, rotations, or fabricated poses. Injury source boundaries shift through blank gaps to preserve full collapsed boots and eliminate an adjacent-frame hair pixel. All final poses have >=8px cell margins. Grounded feet end at y230; jump2 and jump3 end at y210/y200.

`finalize.py` produces `sockets.json`, `socket-review.jpg`, `idle-preview.gif`, and final visual QA metadata. All 26 socket centers land on fully opaque pixels. Back hurt hand is hidden behind the shoulder/torso, so its socket [141,105] is an inferred concealed grip; integration must check its equipment overlay. Remaining sockets were visually measured on visible gloves. Runtime and board-scale validation belong to integration.

QA: 26 distinct generated poses, 26 unique frame hashes, both unused cells fully transparent, no eight-pixel gutter violations. Contact and socket review images plus raw sources support manual review. Run scripts with `/home/deck/.codex/skill-envs/agent-sprite-forge/bin/python`.

Final gait revision: `update_forward_gait.py` replaces only front/back walk_right cells with genuine new ImageGen `forward-gait.png` frames0/2, using Knight gait3 strictly as pose reference. Foreground knee crosses far straight support leg; paired walk_left uses tucked rear boot. Run this script after process.py and before finalize.py to reproduce current final atlas. `pre-forward-gait-hashes.json` proves all other atlas cells unchanged.
