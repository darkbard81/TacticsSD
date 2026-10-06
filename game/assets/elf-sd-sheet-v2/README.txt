Adult elf sprite sheet v2 — asset review build

Shipping atlas: elf-adult-26pose-sheet.png, 1792 x 1024 RGBA.
Grid: 7 columns x 4 rows, each cell 256 x 256 pixels.
26 poses; row 3 column 7 and row 4 column 7 are transparent blanks.

Row 1 FRONT: idle, walk_right, walk_left, hurt, jump1, jump2, jump3.
Row 2 BACK: the same seven actions.
Row 3 FRONT: collapse, attack1, attack2, attack3, attack4, attack5, blank.
Row 4 BACK: the same six actions, blank.

frames.json contains exact cell coordinates, semantic IDs, shared ground
anchor (128,230), source calibration, alpha bounds and preview sequences.
Item: idle -> jump3 -> jump2 -> idle.
Melee, bow and spell reference common_attack; there are no separate body strips.
The timing is a proposed review timing, not a recovered PSP playback sequence.

Pose artwork was newly generated with built-in ImageGen, guided by the existing
adult elf seed and the inspected reference sheets. No poses were manufactured
by whole-body rotation, mirroring or static duplication. The full sheet's base
poses, a corrected four-pose walk group and a twelve-pose collapse/attack group
were used. Each coherent source group gets one uniform scale calibrated to
approximately 190-pixel standing stature; no individual bounding-box fitting
or stretching. Extraction isolates connected character pixels before packing.
Crouch/collapse remain low; jump2 and jump3 retain 20/30px airborne offsets.
Review the labelled contact sheet at 100% to judge generated anatomy/costume
variation. This is an asset review build, not runtime-approved animation.

elf-26pose-labelled-review.png is a 1792 x 1200 labelled checkerboard review.
elf-motion-preview.gif / .webp show exact front/back frame sequences.
The shipping PNG has no grid, labels, scenery, portrait panel or green backdrop.
The character's face remains part of every relevant body pose.

optional-flight-extension.json is SPECIFICATION ONLY: 1792 x 1536, same cells,
two extra rows containing 3 front and 3 back flying poses (32 total poses).
Reference: visually inspected extra wing/flight rows in Divine Knight and
Iuria Wolph. No flying elf, wings, or second character were generated.

validation.json records pixel checks. Original game assets, game runtime,
default selections and editor changes remain untouched. No commit/push/deploy.
