# Painted terrain · 2026-10-07

Three.js battlefield now uses 8 generated surface materials and 8 paired long cliff images: reed grass/loam, highland grass/scrub, citadel moss, sandstone, limestone and shallow river. Three 16:9-oriented ImageGen source sheets generated this terrain/prop set; native dimensions were preserved (tops 1672×940, sides 1672×941, props 1672×941, approximately 16:9). Top textures are square native crops. Side crops exclude column separators and the perspective top cap, retaining fringe and roots.

Eight prop types: broadleaf tree, pine, dead tree, fern, golden shrub, mossy boulder, pale boulder, stump. All are used across the three campaign regions, with 7 / 9 / 8 prop instances respectively. Tall props replace the old visual towers on already-blocked cells. Small ornaments occupy peripheral tile margins. No collision/cover or tile/height/movement/LOS/save changes.

game/painted-terrain.ts is a presentation adapter. Flat square tops meet actual exposed 3D wall geometry. Each face extends only to the neighbour top, or -0.32 at the map boundary. Native side aspect defines UV density: one world unit horizontally, the same density vertically, cropping downward from source top. No side repetition or height-dependent stretching. East/right faces are light, south/left darker; MeshBasicMaterial avoids double-darkening baked crevices. Hidden neighbour walls are not built. The same opaque depth buffer, raycast tile identity and highlights remain.

Props use actual alpha-contour extruded meshes from the existing standee utility, with 0.08 world-unit depth. They are stylized shallow reliefs, not full sculpted trees or rocks. In Top view their compact panels tilt into the board plane, like the existing character overview convention. No character see-through masks.

Asset registry: game/assets/terrain-painted/registry.json. Generation prompts and full original sheets: sources/, props/. Native crop coordinates and dimensions are retained. Parent inspected exact Library reference IMG_1285.jpeg; this local host's authorized transfer failed HTTP 403, so local reference pixel inspection is not claimed.

Manual evidence: docs/game/evidence/terrain-painted/. Each PNG is freshly rendered 3840×2160 with accompanying camera/DPR metadata. The requested screenshots are exports, not an automated visual acceptance suite. DEV-only ?capture=1&terrainStage=0 (or 1/2) opens the actual authored battle map with a temporary new campaign and never unlocks/saves. Manual iso/Top/detail buttons are preserved separately from gameplay inputs. Detail export uses 1.75× camera zoom.

Validation: npm run build passed (existing shared Three chunk >500kB warning); npm run check passed after capture controls; git diff --check passed. Rules untouched; no rules tests needed. No UI/GPU/pixel tests, campaign replay, video, commit, push or deploy.

Run npm run game. Game http://127.0.0.1:5173/game/; manual terrain review http://127.0.0.1:5173/game/?capture=1&terrainStage=0.


## Water-side correction · 2026-10-07

The initial `river-side.png` was a damp fractured-rock column from the cliff atlas. Water tiles therefore displayed rock on any exposed vertical cut. Replaced only that material with actual ImageGen downward-flowing teal water, retaining the unchanged river top. The new source is `sources/water-flow-source.png` (1672×941, four source panels; only the fourth is registered). One native long crop is registered as `river-side.png`, plus one native 413×28 foam band as `river-base-side.png`; old rock art is preserved in `sources/river-side-rock-previous.png`. Prompt and crop boxes are retained.

Every exposed water-tile side uses the flowing-water material. The existing vertical tile cuts, tile ownership, neighbour-hidden face culling and heights are unchanged. Source aspect determines the same fixed texel density and downward-from-top UV crop. Base foam is composited at the visible crop bottom at native pixel scale into a cached material texture; this adds no geometry or alternate scene renderer. No bank/overflow classification, fluid simulation or new rules.

All current water tiles are height 0. The two map-boundary river ends already have a 0.32 vertical cut to the existing -0.32 map base. `terrain-0-water-detail.png` is a 3840×2160 fresh export of the actual Reed Gate front river end, using only an export-camera close-up (3× zoom). It is not an invented waterfall map or a development fixture. Manual `물 측면 PNG` control records the focus and camera in the accompanying JSON. Earlier seven PNGs are historical before this correction.

Focused `npm run build` and `git diff --check` passed. No rules/data changed and no automated visual tests, replay, video, commit, push or deploy were run.
