# Cumulative repository snapshot

This snapshot preserves the existing game, shop, eight-class art sources/processed assets, editor rig corrections, reference material, reproduction scripts and prior validation evidence, plus the tool-only fixed-4-unit 3D standee preview. Existing user edits were included without reverting them.

No tests, typecheck, builds or playtests were run for this commit request. Prior validation records describe their own earlier versions. The final 4-unit standee revision has not been runtime-verified; earlier captures predate that thickness change.

Excluded from Git (preserved locally):
- docs/game/evidence/elf-sd/elf-pad-pulse-trace.zip (163,696,894 bytes): bulky transient browser trace archive, exceeds GitHub's individual-file limit.
- docs/game/evidence/elf-sd/elf-defeat-timeout-trace.zip (27,322,956 bytes): transient browser trace archive. Its context, logs and reproduction script remain included.

Existing ignores retain node_modules, dist, test-results, playwright-report and *.local outside version control. Required art generation inputs and outputs are retained for reproducibility. Credential/key filename and text-pattern checks found no secret files or credential patterns in the intended scope.
