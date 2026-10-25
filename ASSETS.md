# Clean Flow — generated assets

All generated on 2026-10-25 through the normal web UIs in the user's signed-in Chrome (own tabs only). No API keys, no purchases, no upgrades. Generated meshes are decoration only — never colliders or science surfaces; particles, pipes, gauges and meters are procedural.

Originals (unmodified downloads) are kept outside the repo in `~/Downloads/clean-flow-originals/`. Game copies are in `public/models/`; none needed optimization (all under 1.3 MB), so the game copies are byte-identical to the originals.

## Mockups (design targets, ChatGPT image generation)

See `docs/visual-targets/PROMPTS.md` for exact prompts. Chat: https://chatgpt.com/c/6add3842-a6a0-83eb-a754-ec9ef164fb5e

| File | Size | sha256 | Processing |
|---|---|---|---|
| docs/visual-targets/01-first-30s.png | 2,765,409 B (1600x900) | d1a4297827767f84bc648c2d00e1b71f93a908c426e6ec90424dfc492c484d6f | original 1672x941 PNG 3.18 MB → `sips -Z 1600` |
| docs/visual-targets/02-core-mid-play.png | 2,871,804 B (1600x900) | 6068039aa283497384dfda275c00af533f7668f32cd93c4670ea22ea599483f4 | original 1672x941 PNG 3.30 MB → `sips -Z 1600` |
| docs/visual-targets/03-failure.png | 2,674,887 B (1600x900) | f68292db222f5ed8ce45e53f9b19e30de4d0bfa600ec9554adc1f6a3f6c3eb60 | original 1672x941 PNG 2.95 MB → `sips -Z 1600` |
| docs/visual-targets/04-hud.png | 2,081,673 B (1600x900) | 98a32062deb8c91680996131b7dd8255a281cea2ac1d21f59e8a3ae505553c53 | original 1672x941 PNG 2.08 MB → `sips -Z 1600` |

## Tripo 3D models

Tripo Studio, https://studio.tripo3d.ai/workspace/generate/ — all **text-to-3D** (mockup crops were not used: the machines in the mockups are tangled up with pipes, a clean text prompt gave a cleaner single object). Settings: Smart Mesh (P2.0, quad, 5000 polycount) for the first two, then HD Model (H3.1, texture on, 2K texture, PBR on, Ultra Mesh off, triangle, 20,000 polycount) for the rest. Export: GLB, texture resolution 1k.

Credits: the account is **shared with other crews generating at the same time**, so the balance moved for reasons other than these tasks (645 at start → 275 when the engineer rig finished). The per-task costs below are the costs Tripo displayed on the button for each of my tasks.

Common orientation (from `gltf-transform inspect`): **Y-up**, model sits on **y = 0** (base on the ground), centred on X/Z, longest dimension normalized to ~1.0 unit. Front faces **+Z** — verified on the engineer (toe direction); the machines/house were shown front-on by the same Tripo viewer, so assume +Z for them too and rotate in-engine if a door/fire opening ends up on the wrong side. Scale up in-engine as needed.

### 1. magnet-drum.glb
- Prompt (text-to-3D, Smart Mesh): "Stylized game asset: chunky brass-and-glass industrial magnet drum separator machine. A big horizontal rotating drum with a clear glass window showing dark metal balls inside, brass bands and rivets, a large red-and-silver horseshoe magnet mounted on top, on a small square brass base with gears on one side and two short pipe outlet stubs. Hand-painted, low-poly-ish, clean silhouette, warm polished brass, single object, no ground plane."
- Task: https://studio.tripo3d.ai/workspace/generate/458fc064-2846-4bf7-b0da-1c74e8f31800
- Credits shown: mesh 0 (Smart Mesh "Trial ×2" promo, button showed ~~100~~ 0) + Texture 20
- Result: 5,392 quads in Tripo → **9,042 triangles**, 10,945 vertices; 1 mesh, 1 material (baseColor 1024² JPEG, no normal/RM map), doubleSided
- bbox: min (-0.500, 0, -0.240) max (0.500, 0.699, 0.240) — drum axis along X, magnet arch on top
- Look: red-painted drum body, tan/brass end caps and gear on −X, grey glass drum window, red horseshoe with silver studs. Less "polished brass" than the mockup; tint in-engine if needed. The drum is not a separate node — spin a procedural cylinder or the whole model.
- Original 760,056 B · game copy 760,056 B (no processing) · sha256 a89770fce7fb303f55524fb0719af3050f17988998fb21d0cf13d5e4220bfea9

### 2. filter-press.glb
- Prompt (text-to-3D, Smart Mesh): "Stylized game asset: brass-and-glass filter station. A big clear glass funnel holding a white folded paper filter cone, held by a ring clamp on a chunky polished brass stand with a round heavy base, and a round-bottom glass collection flask sitting beneath the funnel spout. Brass rivets and bolts, warm copper accents. Hand-painted, low-poly-ish, clean silhouette, single object, no ground plane."
- Task: https://studio.tripo3d.ai/workspace/generate/ebb8e6d9-5357-4ef9-932e-0304d598faef
- Credits shown: mesh 0 (last Smart Mesh trial) + Texture 20
- Result: 5,229 quads → **9,509 triangles**, 9,704 vertices; 1 mesh, baseColor 1024² JPEG only
- bbox: min (-0.327, 0, -0.321) max (0.327, 1.000, 0.321)
- Look: orange-brass funnel rim/ring clamp/base, grey-blue opaque "glass" funnel and flask, white stand pole. Glass is opaque in the texture — swap the glass parts' look with a transparent material in-engine if wanted (single material, so it needs a shader trick or overlay).
- Original 557,320 B · game copy 557,320 B · sha256 1fb790f8271bca402ce7aa8456b1c079c1e014debbc790d3ba409574deee4e38

### 3. still.glb
- Prompt (text-to-3D, HD): "Stylized game asset: copper distillation still. A round hammered-copper boiler pot sitting on a small cast-iron burner stand, a curved swan-neck copper pipe rising from its top and bending down into a clear glass condenser cylinder with a copper coil spiral visible inside, a small glass collection jar at the bottom. Brass fittings, valves and rivets. Chunky proportions, hand-painted, low-poly-ish, clean silhouette, single object, no ground plane."
- Task: https://studio.tripo3d.ai/workspace/generate/53c853d4-81f0-4850-ba98-aeef6fc4f5d3
- Credits shown: 30
- Result: **19,153 triangles**, 12,699 vertices; PBR: baseColor + normal + metallicRoughness (each 1024² JPEG)
- bbox: min (-0.500, 0, -0.282) max (0.500, 1.000, 0.282) — boiler on −X, condenser + jar on +X
- Original 1,217,884 B · game copy 1,217,884 B · sha256 8127db03c34552fd069d0813cfac4844ba9b745348ff9429deb53d8a8b7a9050

### 4. evap-pan.glb
- Prompt (text-to-3D, HD): "Stylized game asset: wide shallow round copper evaporation pan with thick rolled rim and two side handles, resting on a short round brick fire base with an arched fire opening showing glowing orange embers. A layer of white crystalline salt crust inside the pan. Brass rivets. Chunky proportions, hand-painted, low-poly-ish, clean silhouette, single object, no ground plane, no steam."
- Task: https://studio.tripo3d.ai/workspace/generate/7621e546-103f-4c35-b4bf-1c3deaa5066f
- Credits shown: 30
- Result: **18,455 triangles**, 11,925 vertices; PBR baseColor + normal + metallicRoughness (1024² JPEG)
- bbox: min (-0.500, 0, -0.451) max (0.500, 0.678, 0.451) — handles along X, fire opening on the front
- Look: copper pan with a few white salt chunks on top, round brick base with painted flames (no emissive map — add a point light/emissive sprite for the fire). Steam is ours.
- Original 1,016,916 B · game copy 1,016,916 B · sha256 9adabeea7dfc1f762787f800e00927c26a32a34027de28ad364403f811adb29e

### 5. customer-house.glb
- Prompt (text-to-3D, HD): "Stylized game asset: small one-storey sandstone Middle-Eastern desert workshop building, warm tan stone blocks, flat roof with a low parapet and a small wooden crate on top, a big arched wooden front door, one small arched window, a striped canvas awning over the door supported by two wooden poles, a blank wooden sign board above the door. Chunky proportions, hand-painted, low-poly-ish, clean silhouette, single building, no ground plane, no people."
- Task: https://studio.tripo3d.ai/workspace/generate/2b5a425d-11fd-4c94-bfb6-75c263172beb
- Credits shown: 30
- Result: **17,985 triangles**, 12,323 vertices; PBR baseColor + normal + metallicRoughness (1024² JPEG)
- bbox: min (-0.454, 0, -0.500) max (0.454, 0.870, 0.500)
- Look: pale sandstone blocks, cream/white striped awning, wooden arched door, blank sign plank above the awning (good spot for a Hebrew sign decal). Reuse for bakery / foundry / village with tint + sign + chimney prop.
- Original 941,460 B · game copy 941,460 B · sha256 3290de9cd2690115208e8cf0b847ab611eb65a5a79d93e8e6b53021e160a5239

### 6. engineer.glb
- Prompt (text-to-3D, HD, Tripo "T-Pose" toggle on): "Stylized game character: friendly adult valley engineer mascot, full body standing in T-pose, arms straight out to the sides, legs slightly apart. Yellow hard hat, brass-rimmed goggles pushed up on the hat, teal work overalls over a cream rolled-sleeve shirt, brown leather tool belt with a wrench, sturdy brown boots, short dark beard, warm smile, slightly chunky cartoon proportions (big hands, big boots). Hand-painted, clean silhouette, single character, no ground plane, no props in hands."
- Task (model): https://studio.tripo3d.ai/workspace/generate/b70ff135-e338-4a9e-8451-29305fa1c45d — credits shown 30
- Rig: same task, Rig tab → Rigging Type **Humanoid**, Skeleton Preset **Mixamo**, "Auto Rig" — credits shown 20 (https://studio.tripo3d.ai/workspace/rigging/…-b70ff135-e338-4a9e-8451-29305fa1c45d)
- Animation: Animate tab → Preset **cheer** (clicking a preset card immediately starts a retarget job; the button showed no cost and the balance did not change) (https://studio.tripo3d.ai/workspace/animate/…-b70ff135-e338-4a9e-8451-29305fa1c45d)
- Export: GLB, 1k textures, Export Skeleton on, Number of Animations 1 (cheer), "Animation stay in Place" on
- Result: **19,422 triangles**, 11,602 vertices, skinned (JOINTS_0/WEIGHTS_0), 1 skin with **65 Mixamo joints** (`mixamorig:Hips` … `mixamorig:HeadTop_End`, full fingers), root node `Armature`; PBR baseColor + normal + metallicRoughness (1024² JPEG)
- **Animation clips: `cheer`** (12.0 s, 195 channels, 15,707 keyframes). Bind pose is the T-pose.
- bbox (bind pose): min (-0.500, 0, -0.166) max (0.500, 1.000, 0.166) → ~1 unit tall, arms along X, **faces +Z** (verified: toes extend to z = +0.15 vs heels -0.08). Scale up for the scene (e.g. ×1.6–1.8 for a 1-unit hex if he should be "person-sized").
- **Not done:** `idle` and a facepalm/disappointed reaction. Tripo runs one retarget job per preset click, so idle + cheer + frustrated would be 3 animation jobs + 1 rig = over the 2-job cap. I stopped at rig + cheer. Matching presets exist in the library at 0 displayed credits: `idle`, `standing_relax`, `frustrated_01`, `frustrated_02`, `defeat`, `depressed`, `complain_01`. If the lead approves going past the cap, add `idle` and `frustrated_01` on the same rigged task and re-export with "Number of Animations" = all.
- Original 1,597,652 B · game copy 1,597,652 B (no processing) · sha256 961935caf8410ae0f1a80485e0c87ab536f04167df0e6686328b58babeb820ed

## Budget used

- Model generations: 6 of 6 (magnet drum, filter, still, evap pan, house, engineer). No re-rolls.
- Rig/animation jobs: 2 of 2 (Humanoid/Mixamo rig 20 credits; `cheer` preset retarget, 0 credits shown)
- Credits as displayed per task: 0 + 20 (drum) + 0 + 20 (filter) + 30 (still) + 30 (pan) + 30 (house) + 30 (engineer) + 20 (rig) + 0 (cheer) = **180 credits** for this game. Account balance 645 at start → 275 after my last job (the difference beyond 180 was spent by other crews on the shared account).

## Round 2 — Tripo models (2026-10-25, ~14:25–14:38)

Same pipeline as round 1: Tripo Studio text-to-3D, **HD Model, H3.1 – Best Quality, Texture on, 2K texture, PBR on, Ultra Mesh off, Triangle, 20,000 polycount**; export GLB, texture resolution 1k. Every prompt starts with "Stylized-realistic game asset for an indie strategy game:" and ends with "...high detail, clean readable silhouette (from above), single object centered, no ground plane, no base slab." (full text below). Generated in my own tab; account is shared with other crews.

Credits: balance **9075** before the round → **8395** after my last job. The account was shared with other crews generating at the same time (the asset list showed 6–8 foreign jobs running), so the drop is not all mine. Mine as displayed on the buttons: 8 × 30 = **240 credits**; 1 "Free Retry" (sieve, 0); engineer `idle` + `frustrated_01` presets 0 (balance unchanged 8395 → 8395). Exports showed no cost.

Common orientation (from `gltf-transform inspect`): Y-up, base on y = 0, centred on X/Z, longest dimension normalised to 1.0. Front assumed **+Z** (Tripo's default front view, as in round 1) — rotate in-engine if an opening ends up on the wrong side. All have one mesh, one material, PBR baseColor + normal + metallicRoughness (1024² JPEG), no animations, OPAQUE (glass is baked into the texture, not transparent). Originals kept in `~/Downloads/clean-flow-originals/cf2-*.glb`; game copies are byte-identical (no processing needed: all ≤ 1.23 MB) except `engineer-anim.glb`.

| File | Size (B) | Tris | bbox min → max | sha256 |
|---|---|---|---|---|
| tank.glb | 1,177,736 | 19,668 | (-0.500, 0, -0.412) → (0.500, 1.000, 0.412) | e1f6471be3ecb320f7929bb96d9d4c115c3761563eb1a1184c9422e3bc3561ee |
| funnel.glb | 1,018,440 | 19,764 | (-0.259, 0, -0.259) → (0.259, 1.000, 0.259) | 09867a669489b63a7c30ce965c6feed537aaa396c41c11a8a3efced8b62a9149 |
| chroma-tower.glb | 1,206,284 | 16,260 | (-0.219, 0, -0.220) → (0.219, 1.000, 0.220) | 069b70eb0db0556d6d004da4ea58a988352aa5468f513543674b7ad77d69a42c |
| mine.glb | 1,134,180 | 19,515 | (-0.470, 0, -0.500) → (0.470, 0.501, 0.500) | cd75a80c341d7e33c0e7e1d1088484aa81ac72a2a878f8ca2df16691de541a0c |
| reservoir.glb | 1,220,248 | 19,802 | (-0.447, 0, -0.500) → (0.447, 0.675, 0.500) | 2fa62414711ec06cd4c058fa5e1bc2c75f4c2f3943242312401a74650050a378 |
| foundry.glb | 592,628 | 4,688 | (-0.500, 0, -0.466) → (0.500, 0.863, 0.466) | 89a1feae0a93e01a191d88eb859fcebaa375286a41acec472986492b2e65499d |
| bakery.glb | 683,628 | 4,554 | (-0.500, 0, -0.469) → (0.500, 0.712, 0.469) | 82625133dad0fe2fc441ef9cdf8adf34b909908ca758a7407a8a559802b40b08 |
| sieve.glb | 1,030,172 | 4,479 | (-0.331, 0, -0.377) → (0.331, 1.000, 0.377) | abe3b80a10d9a4f3236513e462f1c58e60145db9ea87630c081561d51e3c0eca |
| engineer-anim.glb | 1,576,956 | 19,422 (skinned) | (-0.500, 0, -0.166) → (0.500, 1.000, 0.166) | af32112c44f12bcab79e1460a86d8650b8cede3fd224d4596f6d29552f644651 |

### 7. tank.glb (dissolving tank)
- Prompt: "Stylized-realistic game asset for an indie strategy game: a squat copper dissolving tank. Short wide cylindrical hammered-copper vat with three riveted brass bands, topped by a clear glass dome lid showing blue water inside. A chunky brass electric stirring motor sits on top of the dome with a vertical brass paddle shaft going down into the water. Small brass pipe fittings and a valve stub on the left and right sides. Short brass feet. Warm polished brass and copper, clean glass, high detail, clean readable silhouette from above, single object centered, no ground plane, no base slab."
- Task: https://studio.tripo3d.ai/workspace/generate/0538293f-df6d-4804-8fe7-7781cdf81a94 — credits shown 30
- Look: hammered copper vat, two riveted brass bands, frosted-glass dome, brass motor cap + shaft (with an odd flat brass paddle visible through the dome), brass tap stubs on ±X, three short feet. Water is not visibly blue (dome reads as frosted white). Strong, polished.

### 8. funnel.glb (separating funnel)
- Prompt: "Stylized-realistic game asset for an indie strategy game: a laboratory separating funnel station. A tall pear-shaped clear glass separating funnel containing two clearly visible liquid layers, amber-gold oil on top and blue water below, with a brass stopcock tap at the narrow bottom spout. The funnel is held by a brass ring clamp on a heavy polished brass lab stand with a vertical rod and a thick round brass base. Warm polished brass, clean transparent glass, high detail, clean readable silhouette from above, single object centered, no ground plane, no extra base slab."
- Task: https://studio.tripo3d.ai/workspace/generate/a63edd85-7889-42c5-be3f-e1914d1c7133 — credits shown 30
- Look: conical glass funnel, thin amber band over a big bright-blue layer, brass ring clamp, rod on one side, brass stopcock, round brass base. Very readable.

### 9. chroma-tower.glb (chromatography tower)
- Prompt: "Stylized-realistic game asset for an indie strategy game: a chromatography tower. A tall slim rectangular glass display cabinet with a polished brass frame and corner posts. Inside, several long white paper strips hang from a brass rail, each strip showing bright horizontal ink bands in yellow, blue and green. A shallow brass solvent tray with clear liquid at the bottom inside the cabinet. A pointed copper roof cap with a small finial on top. Warm polished brass and copper, clean transparent glass, high detail, clean readable silhouette, single object centered, no ground plane, no base slab."
- Task: https://studio.tripo3d.ai/workspace/generate/1d78d72a-1c23-4bbc-8304-88e251058c11 — credits shown 30
- Look: brass-framed glass cabinet, two paper strips with yellow/blue/green blocks, brass tray at the bottom, copper pagoda roof + finial. Glass baked as pale panels. Good.

### 10. mine.glb
- Prompt: "Stylized-realistic game asset for an indie strategy game: a desert mine entrance. A compact rocky orange sandstone outcrop with layered strata, with a dark tunnel mouth framed by thick wooden timber beams in its front face. An old oil lantern hangs from the top beam. In front of the tunnel, a short section of rail track with a small riveted iron ore cart filled with chunky dark grey iron ore rocks. Warm desert sandstone, weathered wood, dark iron, high detail, clean readable silhouette from above, single compact object centered, no large ground plane."
- Task: https://studio.tripo3d.ai/workspace/generate/e930b512-229a-42c0-a946-476230540ee2 — credits shown 30
- Look: rounded orange sandstone boulders, timber portal with lantern, ore cart on a short track, small pale sand apron in front (+Z). Slightly soft/clay-like rock, but reads well. Low (0.5 tall) — scale up.

### 11. reservoir.glb
- Prompt: "Stylized-realistic game asset for an indie strategy game: a distilled water reservoir. A round open cistern with thick warm sandstone block walls and polished brass bands, filled to the top with clear bright blue water, with a small brass water tower tank on short brass legs beside it. A brass spout pipe sticking out of the front wall with a red-and-brass valve wheel on it. Warm sandstone, polished brass, clean blue water, high detail, clean readable silhouette from above, single object centered, no ground plane, no base slab."
- Task: https://studio.tripo3d.ai/workspace/generate/8d76decd-9c0e-47d3-9a7d-c54777930b55 — credits shown 30
- Look: round sandstone-block cistern, two brass bands, blue water surface visible from above, small brass tank on legs with a red valve wheel, brass spout. Good; stone is pale pink-tan.

### 12. foundry.glb
- Prompt: "Stylized-realistic game asset for an indie strategy game: a small desert foundry building. A one-storey workshop of warm sandstone blocks and red brick, flat roof, a tall square red brick chimney rising from the back corner, a big arched furnace opening in the front wall glowing bright orange with molten heat, an iron anvil on a wooden stump and a few iron ingots stacked out front. Warm sandstone, red brick, dark iron, glowing orange fire, high detail, clean readable silhouette from above, single building centered, no ground plane, no people."
- Task: https://studio.tripo3d.ai/workspace/generate/93e9263a-5526-419a-8be8-0ac9cae9dea1 — credits shown 30
- Look: chunky yellow sandstone block with a brick-arch furnace glowing orange (painted, no emissive map), red brick chimney, logs/stump props at the base. Tripo produced only 4.7k tris — more cartoony/soft than the machines.

### 13. bakery.glb
- Prompt: "Stylized-realistic game asset for an indie strategy game: a small Middle-Eastern village bakery. A one-storey building of warm cream sandstone blocks with a flat roof and low parapet, a wide open shop front with a red-and-white striped canvas awning, a wooden shelf in the window holding round golden pita breads and loaves, and a dome-shaped clay taboon bread oven attached to the side of the building with a small glowing opening. Warm sandstone, terracotta clay, red-white stripes, golden bread, high detail, clean readable silhouette from above, single building centered, no ground plane, no people."
- Task: https://studio.tripo3d.ai/workspace/generate/ac23e5de-9aa2-44c9-90ef-280c478a21c1 — credits shown 30
- Look: cream sandstone box with a big open front, red/white scalloped awning, shelf of golden breads, terracotta pot, small clay oven bump on one side, flat roof with parapet. 4.6k tris, soft/toy-like — the weakest of the round.

### 14. sieve.glb
- Prompt: "Stylized-realistic game asset for an indie strategy game: a sieve shaker machine. A sturdy wooden table frame with brass corner brackets and four short legs, holding a square brass-rimmed wire-mesh sieve tray filled with small grey and tan pebbles on top, mounted on brass springs. A small brass motor with a crank on one side to vibrate the tray. A shallow wooden collection tray with fine golden sand sits on a shelf underneath the sieve. Warm wood, polished brass, high detail, clean readable silhouette from above, single object centered, no ground plane, no base slab."
- Task: https://studio.tripo3d.ai/workspace/generate/742549b2-041e-4774-80e8-1bfe02a5efb5 — credits shown 30; the first result was broken faceted geometry, so I used the task's **Free Retry** (0 credits; the first version stays in the task's model history). The exported file is the retry.
- Look: wooden table base, brass upper frame with a square brass tray full of grey/tan pebbles (reads well from above), brass coil spring and gear/motor wheel on one side, small shelf between the tiers. Tall (1.0) and narrow; 4.5k tris.

### 15. engineer-anim.glb (engineer + 3 clips)
- Same task as round-1 engineer (https://studio.tripo3d.ai/workspace/animate/b70ff135-e338-4a9e-8451-29305fa1c45d), same rig — no new rig. Animate tab → Preset `idle` and `frustrated_01` (each click starts a retarget job; 0 credits, balance unchanged).
- Export: GLB, 1k textures, Export Skeleton on, Number of Animations 3 (idle, frustrated_01, cheer), Animation stay in Place on → 2,029,220 B (sha256 01e0b28be39bd6533157fdfaf2fa851fba14f282fe5065a5e8666dbae78bcecf, original kept as `cf2-engineer-anim.glb`).
- Processing (> 1.6 MB): `gltf-transform resize --width 1024 --height 1024` (2.03 → 1.73 MB, JPEGs re-encoded) then `gltf-transform webp` → **1,576,956 B**. Now requires `EXT_texture_webp` (three.js GLTFLoader supports it without extra decoders). No meshopt/draco.
- Result: 19,422 tris, skinned, 65 `mixamorig:*` joints, root `Armature`, faces +Z, T-pose bind. **Clips: `idle` (15 s), `frustrated_01` (4 s, shoulders slump + head hang), `cheer` (12 s)**, 195 channels each.

### Round 2 budget
- Model generations: 8 of 8 paid (30 each = 240) + 1 free retry (sieve). Rig/anim: 0 new rigs, 2 preset retargets at 0.
- Not done: no image-to-3D, no re-rolls of foundry/bakery (they are acceptable but softer; each task still has Free Retry ×3 if the lead wants another roll at 0 credits).
