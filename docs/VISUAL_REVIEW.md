# Visual review — v2 mockups vs the real game

Targets: ChatGPT (gpt-image) mockups in [visual-targets/v2/](visual-targets/v2/) (prompts in its `PROMPTS.md`) — design targets, not evidence. Actuals: real captures in [captures/v2/](captures/v2/), produced by `node scripts/play2.mjs shots|fail|mobile|campaign` against the dev server in headless Chromium (SwiftShader WebGL) at 1600×900 (phone: 390×844, touch), driven only with real mouse/touch input and `advanceTime`. Software rendering differs slightly from a GPU in colour and anti-aliasing. (The v1 review is kept in git history; v1 captures are in [captures/](captures/).)

## 01 · Puzzle start (level 1)

| | Target `01-puzzle-start.png` | Actual `actual-01-puzzle-start.png`, `actual-01a-dragging.png` |
|---|---|---|
| Camera & board | Fixed three-quarter view, floating layered orange sandstone island centred on a peach-coral gradient | Same: floating layered island (5 rock strata, hanging tip), peach→coral radial background, fixed camera with gentle pointer parallax. Our island top is lighter/tan rather than deep orange. |
| Board content | Mine portal (right) → straight glass pipe → glowing teal "+" socket → fork → foundry (upper-left) and builder's yard (lower-left) | Tripo mine → glass pipe with brass couplers on posts → glowing teal hexagonal fork socket with "+" → foundry (Tripo) and builder (Tripo house). In v2 level 1 the foundry is the **lower** branch on purpose, so the default magnet orientation is wrong and the tutorial teaches flipping. |
| Particles | Big grey spiky iron balls and tan faceted sand inside clear pipes | Same shapes and colours, chunky; pipes use a fresnel glass shader (bright rims, clear middle). |
| HUD | Top-left 3 round dark-teal brass-rim buttons (menu, hint, restart); top-right cream plaque "פרק 1 · שלב 2" + 3 star slots; cream order cards "רוצה: ברזל" with icon and bar left of each building; wooden tray bottom-centre with 3D cards (selected = teal glow); big green "▶ הפעל זרימה" pill bottom-left | Same layout and styling. Extras: a goal banner top-centre (level text + tutorial step), a "Y"/"●" socket-shape badge and the machine's property on each card. |
| Drag | Hand cursor dragging a ghost magnet along a dashed arc to the socket | A 2D card follows the pointer, a transparent 3D ghost snaps onto the socket, the socket ring pulses bigger (no dashed arc). An animated 👆 hand demonstrates the drag on level 1. |

## 02 · Flowing success

| | Target `02-flowing-success.png` | Actual `actual-02-flowing.png`, `actual-02b-win.png` |
|---|---|---|
| Machine | Magnet drum in the socket with motion arcs | Tripo magnet drum in the socket, bobbing while active; iron particles hop from the drum into its outlet pipe. |
| Flow | Iron to the foundry, sand to the builder, chevron arrows in pipes | Same split, particle streams in both branches (no chevron arrows). Branch tags name each outlet ("נמשך למגנט" / "השאר"). |
| Customers | Order bars filling green, sparkles, "+⭐", 😄 / ❤ emotes | Bars fill, ✓ badge, sparkles in the product colour, 😄 / ❤️ emote bubbles, confetti, the rigged engineer plays his cheer animation. |
| Play button | Becomes a round teal ×2 button with a progress ring | Same (ring = run progress; amber when ×2). |
| Result | — | Centre card "מעולה!" with three stars popping and a line explaining each star. |

## 03 · Oops

| | Target `03-oops.png` | Actual `actual-03-oops.png`, `actual-03b-oops-card.png` |
|---|---|---|
| Moment | Salt water passes through a filter; the bakery spits droplets and salt cubes; bubble "פויה! יש מים במלח"; order card orange with red "!" | Level 3 with the filter but no evaporation pan: salty water reaches the bakery, which bursts the real water/salt particles out of its door; bubble "פויה! יש מים במלח"; the order card turns orange with a red "!". |
| Card | Bottom card "כמעט!" with a filter icon, explanation, teal "נסו שוב ↻" | Same card: "כמעט!", a list of every unhappy customer, a one-line worked explanation ("מלח מומס עובר דרך המסנן…"), "נסו שוב ↻" and "💡 רמז". When a machine did nothing useful (dry filter, magnet on a compound, wet magnet…) the card leads with "🔧 machine: reason" and the socket ring turns red. |

## 04 · Level map

| | Target `04-level-map.png` | Actual `actual-04-level-map.png`, `actual-06b-phone-map.png` |
|---|---|---|
| Map | Full-bleed illustrated desert terrain, winding path, gold badges with stars, current badge glowing teal with an arrow, locked badges with padlocks, chapter banners on posts with machine icons, oasis | A big floating plateau (same island style as the levels) with a winding sand path, 14 brass coin badges (current = teal, bobbing, ▼; locked = dull brass + 🔒; stars under each), the Tripo mine at the start, each chapter's Tripo machine as a landmark, an oasis with palms, cream chapter banners with rendered machine icons. Less lush than the painting (no cliffs/dunes backdrop). On phones the banners hide to keep badges tappable. |

## 05 · Scan

| | Target `05-scan.png` | Actual `actual-05-scan.png` |
|---|---|---|
| Overlay | Dimmed board, big brass magnifier with "מה זה?" ribbon and handle, spiky iron and faceted sand inside, 4 wax-seal stamps (blue atom / purple molecule / green even dots / orange clumps) | Same composition: dim layer with a hole for the lens, brass magnifier + handle + "מה זה?" ribbon, a live 3D view (iron as spiky metallic balls, sand as faceted grains, clumped apart), legend with each substance's state **and property** ("🧲 נמשך למגנט · לא נמס"), 4 stamps with the same pictograms. Stamps run right-to-left (יסוד first on the right) as Hebrew reads. |

## Phone (390×844)

`actual-06-phone-level.png`: the camera turns so the board runs up the screen (sources at the bottom, customers at the top), order cards line up under the goal banner in the same left-to-right order as the buildings, tray and play button at the bottom. Not in the mockups (they are landscape).

## Remaining honest deviations

- Island tops read lighter/tan than the mockups' saturated orange; no distant cliffs/dunes behind the map.
- No dashed drag arc and no chevron arrows inside pipes.
- Several customers share the Tripo workshop model (tinted, with coloured props); foundry and bakery have their own models, which are more cartoony than the machines.
- The evaporation-pan model always shows salt in it, whatever it is evaporating.
