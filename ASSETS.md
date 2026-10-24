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
