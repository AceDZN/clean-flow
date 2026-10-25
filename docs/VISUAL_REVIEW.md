# Visual review — mockups vs the real game

Targets: ChatGPT (gpt-image) mockups in [visual-targets/](visual-targets/) (prompts in [PROMPTS.md](visual-targets/PROMPTS.md)). They are design targets, not evidence of the game.
Actuals: real captures in [captures/](captures/), produced by `node scripts/playtest.mjs review --out docs/captures` against the dev server: headless Chromium (SwiftShader WebGL), 1600×900, same aspect as the mockups, every action done with real mouse input (no state injection), time stepped with `window.advanceTime`.

Rendering in headless SwiftShader matches the browser's output closely but is not a GPU capture; colour and anti-aliasing can differ slightly on a real GPU.

## 01 · First 30 seconds (week 1)

| | Target `01-first-30s.png` | Actual `actual-01-first-30s.png` |
|---|---|---|
| Camera | Low three-quarter hero shot (~35°), close; the magnet drum fills the centre | Higher strategic three-quarter (~47°), framed to show every node of the week. Deliberate: in a routing game the whole network has to fit on screen. Players can zoom/orbit closer. |
| Scene | Realistic sandstone cliffs, reservoir with an arched dam, salt flats | Stylised hex terraces (the playing grid) inside a ring of tall sandstone hex columns, turquoise lake, palms, rocks. Same palette; geometry is game-board rather than photo-real. No dam or salt-flat backdrop. |
| Machines | Brass-and-glass magnet drum with red horseshoe | Tripo `magnet-drum.glb` (red/brass drum, horseshoe on top) — close match. Mine is a procedural rock mound with a timber portal (target: cliff portal with a sign). Customers use the Tripo sandstone house plus procedural props (foundry chimney with smoke, sand pile, village water tank). |
| Pipes & particles | Thick clear glass pipes on wooden posts with brass couplers; big spiky iron balls and tan faceted sand | Glass tubes on wooden posts with brass rings; spiky dark iron and tan faceted sand particles riding inside. Pipes are thinner and less "glassy" than the painting; particles are smaller but distinct by **shape** as well as colour. |
| HUD | Round dark-teal buttons top-left (menu, pause, play, ×2); cream plaque "שבוע 1 · שבוע הברזל" + brass sundial top-right; cream machine cards bottom-centre with green ×N badges; pipe-budget card bottom-left; cream demand cards "ביקוש: ברזל 12/16"; wooden name signs | Same layout and hierarchy: teal round buttons (play carries a text label "פתחו ברזים / עצירה" for clarity), cream plaque + live sundial, cream cards with 3D-rendered machine icons and green ×N badges, "תקציב צנרת" card with a teal bar and numbers, cream "ביקוש" cards with the product's particle icon, wooden signs. Demand cards sit above the building rather than beside it. |
| Lighting | Warm low sun, strong contrast | Warm sun with soft shadows; slightly flatter contrast. |

## 02 · Core action mid-play (week 4 chain + particle lens)

| | Target `02-core-mid-play.png` | Actual `actual-02-core-mid-play.png` |
|---|---|---|
| Chain | pool → magnet drum → glass-dome dissolving tank (spring feed) → paper-cone filter + sand bin → steaming copper pan → salt cubes to the bakery | mine → magnet drum → copper dissolving tank with stirrer (spring pipe feeding it) → filter (Tripo funnel) → steaming copper pan (Tripo) → bakery. Same order and readability; our tank is copper with a paddle rather than a glass dome. |
| Lens | Left side cream panel "עדשת חלקיקים", brass-ringed circle with ball-and-stick H₂O and white cubes, legend with formulas, 4 round stamps | Left side cream panel "עדשת חלקיקים · צינור …", brass-ringed circle rendered live in 3D: bent H₂O molecules and separate Na⁺/Cl⁻ ions spread evenly (salt is dissolved in the filtrate, so it shows ions, not cubes — scientifically more accurate than the mockup). Legend: "מים H₂O · נוזל", "מלח NaCl · מומס", "2 סוגי חלקיקים, מפוזרים באחידות". Stamps appear only when the lens is on a source (you classify streams at their source), so this pipe view has none. |
| Inspector | — | Right panel for the selected pipe (route, length, "פירוק הצינור"). |
| HUD | as 01 | as 01; tray cards fade to ×0 once placed. |

## 03 · Failure / consequence (week 2, evaporating before filtering)

| | Target `03-failure.png` | Actual `actual-03-failure.png` |
|---|---|---|
| Moment | Bakery puffs sand and salt out of its door under a comic bubble "פויה! יש חול במלח"; demand card 8/24 with an orange outline and a red "!" | Same: comic bubble "פויה! יש חול במלח" above the bakery, the demand card gets an orange outline and a red "!", the rejected packet bursts out as real salt-cube and sand particles. |
| Cause shown | Salt water passing through a filter | Our capture shows the other classic order mistake from the same week (pan before filter → sandy salt). The filter-passes-salt-water case is also implemented (filter alone → "פויה! יש מים במלח" at the bakery; filtered brine → clinic rejects "יש מלח במים") and covered by tests. |
| Backlog gauge | Brass dial "עומס בצנרת" flashing red at the source | Brass dial with a needle, "עומס בצנרת", shown over a source when its backlog builds; it shakes and turns red near flooding. Not visible in this capture (no backlog). |
| Light | Dusk, pink-purple sky | Late day, warm orange-red light on the terraces; the sky is mostly hidden by the camera angle. Dusk tint ramps from 55 % of the day. |

## 04 · HUD close-up

| | Target `04-hud.png` | Actual `actual-04-hud.png` (crop of the 02 state) |
|---|---|---|
| Tray | Cream cards right-to-left with 3D renders, selected card teal-outlined, unavailable card greyed with a padlock | Cream cards right-to-left (RTL flex) with 3D renders made at runtime from the same models used in the valley; the selected card gets a teal outline; used-up cards fade (×0) instead of a padlock — every week only shows that week's machines. "חדש" badge on new machines. |
| Lens | Right side in this mockup (left in 02) | Left side, as in mockup 02 (the two mockups disagreed; we chose 02 because the inspector uses the right side). |
| Stamps | 4 round stamps with icons | 4 stamps, each with its own pictogram (atom, bonded molecule, even dots, clumps) plus the Hebrew class name — never colour alone. |

## Fixed during review

- Camera now frames each week's nodes (the transfer valley was cut off); "home" button and `C` key.
- Status banner no longer blocks clicks on the map (a playtest drag started under it).
- Picking: overlapping machine hit volumes chose the wrong customer; now the node nearest the pointer wins, and a pipe wins unless the machine's real geometry is in front of it.
- Exposure/saturation brought back toward the warm mockup palette after adding environment lighting; thicker pipes, bigger particles that trail along the pipe so running pipes look full.
- Rejection bubble enlarged into a comic speech bubble and placed above the demand card.
- Backlog bar replaced by a brass needle dial, as in mockup 03.

## Honest remaining deviations

- Terrain is a hex board, not photo-real canyon rock; no dam/salt-flat backdrop.
- Default camera is higher and wider than the hero mockups, so machines read smaller.
- Glass pipes read as frosted tubes more than clear glass in bright light.
- Dissolving tank, separating funnel, chromatography tower, sieve, sources and the waste pond are procedural (Tripo budget: 6 models). The four Tripo machines and the house are the most mockup-like elements.
- Mascot (Tripo, rigged) has only the Tripo "cheer" clip; idle and facepalm are procedural bone poses.
