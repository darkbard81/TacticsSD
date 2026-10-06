# Tool-only 3D preview — 2026-10-06

The game renderer and game art are unchanged. Only the characterRig tool imports Three.js. Shared changes are package.json/package-lock.json for three and @types/three. Existing working-tree edits were preserved. All game/ and src/ files match their pre-task SHA-256 hashes.

## Mapping and inference

- head: low-poly sphere with front/rear hemispheres textured from the actual corresponding PNG crops. body/armL/armR/legL/legR: alpha-envelope volumes with front/back caps and two textured thickness halves.
- Pivots and attachment sockets: real THREE.Bone hierarchy, body root and five attached parts; independent custom parents remain independent. A THREE.Skeleton records the six bones; no smooth skin deformation is claimed.
- Screen X/Y become world X/-Y. Parent image-coordinate sockets subtract the parent pivot. Affine rotation, scale, skew, visibility and solo remain effective.
- zIndex plus direction zOffset becomes depth (8 world units per order unit). Walk foot depth becomes actual Z travel, and limbs rotate around X. Foot scale illusion is divided out; the original JSON and evaluator are never mutated.
- Front/back textures use existing PNG pixels cropped from the selected view and counterpart with reversed rear UV. The existing default rear arm reuses its front arm crop. Missing counterpart images fall back to the connected crop.
- Final requested geometry: head assumes a sphere (24×16 subdivisions); its front hemisphere uses Front PNG and its rear hemisphere uses Back PNG. Other parts retain the sampled alpha envelope and tapered thickness (body .42, limbs .38 of crop width). At Z=0 the side surface splits: the +Z half belongs to Front PNG and the -Z half belongs to Back PNG. There is no neutral side material. Transparent UV margins extend nearest opaque pixels from the original PNG, so unseen coverage remains an explicit inference rather than newly generated art. Cap alpha holes are preserved on body/limbs, while side topology is an outer envelope. Rear silhouettes are fitted to the selected view envelope and may stretch or clip. This is a rigid approximation, not an anatomical reconstruction.

## Lifecycle and usability

Three is created lazily on first 3D selection. One renderer/OrbitControls/ResizeObserver is reused across toggles. Pose/geometry edits rebuild and dispose textures, materials, geometries and Skeleton. Page exit/HMR disposes controls, observer, grid, renderer/context and recording tracks. WebGL2 creation failure leaves 2D selected with a visible error. Three handles context restoration; context loss is prevented from becoming permanent. Both previews use actual CSS host dimensions and current DPR capped at 2.

## Verification before the final texture-half revision

- Final lint/typecheck/build passed; 92 unit tests passed. Three mapping tests cover alpha envelope, bone coordinates, real Z travel, gait scale removal and unchanged JSON v2 with custom Back/NW edits.
- Existing editor browser suite: 16 passed, including actual pixel reconstruction, hierarchy, import/export/relink, repeated entry, DPR and responsive edits.
- Actual connected browser renderer: ANGLE (AMD, AMD Custom GPU 0405 (radeonsi vangogh ACO), OpenGL 4.6). Front/back PNGs, tapered side thickness, isometric Rest/Idle/Walk, playback and toggle/resize were inspected on the real GPU. 1024×768 CSS viewport was checked; this browser's actual DPR was 1, not falsely reported as DPR2.
- Automated 3D browser test requires WebGL2 and checks six bones, thickness, actual Z gait, repeated toggles/resize, bounded resources and unchanged rig. In this executor, both installed standalone Chromium versions fail to create WebGL2 (BindToCurrentSequence failed); hardware browser verification succeeds. This gate is a reported environment blocker, not a skipped or claimed passed 3D test.
- Full npm run verify before the final revision: lint/build and unit92 passed; browser50 passed, with the single actual 3D gate failing because standalone Chromium cannot create WebGL2. The previous concurrent test run was interrupted; its transient failures are not the final gate result.
- The user then explicitly requested no further tests and all parts to use front/back texture halves. The final geometry/texture-half revision was implemented afterward. No test, typecheck, build, browser playtest or new evidence capture was run after that instruction. Previous validation is not claimed for the final revision.

## Earlier-version evidence (NOT the final geometry)

The PNGs and WebM below show the earlier tapered-volume head with neutral sides. They predate both the sphere change and the final texture-half request; they must not be presented as screenshots of the final result. Actual earlier GPU canvas captures: [Front](3d/front.png), [Back](3d/back.png), [Side](3d/side.png), [Isometric](3d/isometric.png), [Walk video](3d/walk.webm) (2.9675 seconds). Video frames were decoded and inspected to confirm changing poses.

Library saved all five EARLIER-VERSION files successfully: front.png libfile_e0ca9177086c8191acc9d6b056b92fc1; back.png libfile_2babc403b1c081918992843c572944d2; side.png libfile_525cb9b890c08191a7eb049219bbbb3f; isometric.png libfile_6cc5fa2bde448191a57c4d6be6c8bc5b; walk.webm libfile_729346c9e3a48191aadceec814955340.

Preview server: http://192.168.219.193:4190/tools/characterRig/ (Deck); http://127.0.0.1:4190/tools/characterRig/ locally. Start with npm run tool -- --port 4190 --strictPort. Nothing was committed, pushed or deployed.

## Subsequent head revision (no additional testing or capture)

The requested sphere was replaced by a simple low-poly face/skull envelope: nine horizontal rings, twelve segments per half, broad temples/cheeks, a narrowing jaw/chin, flatter front and rounder rear. Front/back PNGs and the half-depth texture design remain intact. This is an inferred face shape, not reconstructed anatomy. No typecheck/build/test/playtest or new capture was run for this head revision, per the user's instruction. The final-captures Library images from the preceding request show the preceding spherical-head version.

### Side appearance diagnosis from existing code and preceding captures

The bright central band on the captured side of the head is opaque texture coverage, not an alpha hole. wrapTexture copies the nearest source pixel with alpha >100 into every texel and writes alpha=255 when a crop has any opaque pixels. Front/rear head shells use DoubleSide. Body/limb side halves also use opaque extended textures with DoubleSide. The nearest pixels often belong to the artwork's pale/white outer outline; extending them creates stretched pale horizontal streaks. Front/rear shells meet on their shared perimeter; normal sphere sin(pi) rounding cannot explain a broad central band.

Body/limb caps separately retain their original alphaTest=.4, so transparent PNG regions can still cut holes in those caps. Separate rigid parts and zIndex-derived depth may also expose gaps at joints; these are distinct from the opaque pale streak visible in the side capture. No new runtime check was performed to claim every dark gap has the same cause.

Minimum proposed side correction, not applied: seed transparent-margin extension from opaque interior pixels a few pixels inside the artwork outline rather than its white edge, and inset side UV sampling toward those interior pixels. Preserve original front/back caps. This targets the observed outline smear while preserving source PNGs and the half-depth split.

## Latest shallow standee revision

All parts, including head, now use one shallow extruded silhouette rather than sphere/face geometry or wrapped side textures. Original front/back PNG caps remain alpha-tested, with fully opaque #25232A side walls. Current total thickness: every part is 4 common rig units, with caps at +2/-2 (replacing the earlier head/body 8% and limb 5% ratios). Bone matrices preserve Z scale 1 independent of XY scale; the existing common display transform remains unchanged. Side walls follow exterior contours and interior holes; they are not a canvas-sized rectangular slab.

Alignment rule: the active view remains the pose/bone reference. Original crop and pivot offsets remain in image-local coordinates. The counterpart is mirrored in X around its own pivot, aligned to the active pivot, and normalized by absolute rest scale ratios, reference-size ratios and display-scale ratios. Rear translation/rotation/skew are not baked into the outline; the active pose remains the shared motion reference. Both aligned alpha masks form a union sampled on a grid of at most roughly 180 cells on its longest side. Closed exterior/hole contours are triangulated and extruded; islands smaller than two occupied cells are discarded as sampling noise. UVs include the merged canvas offset so crop padding cannot shift a joint.

The resulting cap may contain transparent pixels where only the other view contributes to the union; this preserves the actual PNG instead of inventing cap art. The shared opaque perimeter still defines the thin standee thickness. The contour is an approximation at the sampling resolution.

On image changes or pose edits, mesh resources are disposed/rebuilt while Bone objects and Skeleton are retained when the same part IDs exist. Rest/Idle/Walk continue through the common evaluateRig/bonePose adapter. No skin deformation or game renderer changes. No tests/typecheck/build/automatic playtest were run for this revision, per the user instruction. The only requested follow-up is four actual Default/Rest captures (front/isometric/side/back). Earlier captures show older geometry and must not be reused.

### Current standee capture delivery

Four newly captured Default/Rest/phase 0 canvas PNGs were inspected on the actual connected GPU browser. ExtrudeGeometry side triangles are explicitly indexed: a single material otherwise ignores geometry groups and could paint over both PNG caps. The corrected captures show the actual front/back art, a dark shallow perimeter in the oblique view, and thin edge-only side view. No tests, typecheck, build or automated playtests ran for this revision.

Library successful creates (these show the current standee, unlike all older evidence): Front libfile_2e719699bc8c81918c5362c1a7f66557; Oblique libfile_a7d5591d0ba08191bd216d91fc3f72e6; Side libfile_1ef97264ed708191a8e120185ebb7597; Back libfile_eb1c70fcc54481918e8e9705179bdaae. Local captures and complete results: /home/deck/Documents/Codex/2026-10-06/task/rig-3d-standee-captures/. Every camera uses the same character display scale; isometric preset camera distance differs from orthogonal presets.


### Fixed 4-unit revision and static alpha-pipeline inspection

Only code inspection was performed; no tests/typecheck/build/playtest or captures ran for this revision. thickness() now returns 4 for every part regardless of crop dimensions. Caps use +/- depth/2 and side extrusion spans -depth/2 to +depth/2. All Bone affine matrices use unit Z scale, including parent Bones. Rotation naturally rotates the slab normal; the existing whole-rig display scale is unchanged, with no camera/screen-pixel compensation.

The active implementation is Preview3D.crop -> standeeImages -> maskShapes -> sync. The earlier domain silhouette helper is not the active standee contour generator. standeeImages mirrors and pivot-aligns the opposite crop, accounts for absolute rest scale/reference/display ratios, and source-over composites both alpha masks. Thus geometry follows the aligned union, not either image independently. maskShapes samples alpha >100 on a grid about 180 cells along its longest axis, traces exposed cell edges into closed loops, creates separate Shapes for outer loops and assigns negative-area hole loops to a containing Shape. Closed loops of area <=2 grid cells are omitted. ShapeGeometry triangulates PNG caps; ExtrudeGeometry extrudes outlines/holes with bevel disabled, and side-only indices prevent opaque side material from covering caps. Original cap pixels still use alphaTest .4.

Limitations: grid approximation may lose thin features, tiny islands/holes, or diagonal-touching ambiguity; no adaptive/high-resolution contour simplifier or general nested-hole validation is implemented. Rear rotation/translation/skew are not baked into alignment. Alpha source-over union can combine overlapping sub-threshold semi-transparent pixels; it is not Boolean OR of separately thresholded masks. If only one view contains a contour region, the opposite PNG cap stays transparent there. JPEG transparency is not inferred. These limitations were inspected, not expanded.

File upload/replacement/relink flows decode and put assets, then run() refreshes. In active 3D refresh() calls sync(), which removes/disposes old mesh geometries/materials/textures and regenerates crop, masks and mesh; same-ID Bones/Skeleton are retained. While 2D is selected, rebuild waits until the next 3D selection refresh. There is no persistent silhouette/mesh cache to invalidate. Previous four captures predate the fixed-4 revision and must not be presented as new fixed-4 evidence.
