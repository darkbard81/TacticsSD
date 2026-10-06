Wizard class sprites — ImageGen source art

Delivery: sheet.png, RGBA1792x1024, 7x4 cells256px,26 unique poses.
Ground baseline230; jump2 bottom210; jump3 bottom200.
Minimum alpha>32 gutter: 15px.
Bright magenta fringe pixels after key/despill: 0.

Source grids in raw/: walk (neutral and forward stride), opposite (rearward bent stride repair), jump, attack, reaction. All are actual separately generated ImageGen art. Wizard stride-rejected is retained as provenance only and not used. Original whole grids and exact prompts are retained.

The assembly script in ../wizard/assemble.py performs deterministic magenta cleanup, body-component extraction using generate2dsprite processor, one uniform scale per action group, baseline placement and atlas packing. It does not create or fabricate pose art. Collapse source crops use empty gutter left of nominal half-width to retain the full Cleric toe.

Final front/back sockets measured manually on rendered256px frames; sockets-review.jpg marks each anchor in cyan. Contact sheet and front/back idle GIFs reviewed. Minor generated hair/cloth-detail motion remains; main front/back class silhouette and identity are coherent.

Final gait correction: raw/gait-forward.png replaces front/back walk_right with near-thigh crossing forward raised-knee phase, opposite walk_left backward near-leg tuck. Knight gait3 used only for leg pose; own class raw/walk locks identity. gait-final-review.jpg shows both phases at final board asset scale. All26 finalsheet sockets have alpha>=100.
