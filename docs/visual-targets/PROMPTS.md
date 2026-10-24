# Visual targets — gameplay "screenshot" mockups

These are **design targets** made with ChatGPT image generation (gpt-image). They are never evidence of the implemented game. Copy layout, camera, palette and HUD placement — **not** the Hebrew text (see notes below).

- Date: 2026-10-25
- Tool: ChatGPT web (chatgpt.com, signed-in account, model picker showed "Instant"), built-in image generation
- Chat URL (all four images, one conversation): https://chatgpt.com/c/6add3842-a6a0-83eb-a754-ec9ef164fb5e
- Each prompt produced exactly one image; every first result was accepted (none looked childish or worksheet-like, so no re-rolls were needed).
- Originals were 1672x941 PNG (~2–3.3 MB). Saved here resized with `sips -Z 1600` to 1600x900 PNG to stay under 3 MB. Full-size originals are kept outside the repo in `~/Downloads/clean-flow-originals/`.

| File | Size | Scene |
|---|---|---|
| `01-first-30s.png` | 1600x900, 2.8 MB | Week 1 morning: mine → magnet drum → foundry + builder's yard |
| `02-core-mid-play.png` | 1600x900, 2.9 MB | Week 3 afternoon: full salt chain + particle-lens panel on the left |
| `03-failure.png` | 1600x900, 2.7 MB | Week 3 dusk: salt water through the filter, bakery spits sandy salt, red backlog gauge |
| `04-hud.png` | 1600x900, 2.1 MB | HUD close-up: machine tray (RTL), pipe budget, large particle-lens panel on the right |

## Prompt 1 → `01-first-30s.png`

> Create an image: a real in-game screenshot of a polished 3D indie strategy browser game, 16:9 landscape. Style: Mini Motorways / Mini Metro meets Infinifactory, rendered in real-time 3D with soft shadows — NOT an edtech worksheet, NOT a cartoon for small kids, no robots, no player avatar. Camera: tilted three-quarter strategic view (~50 degrees down) over a terraced sandstone desert valley diorama at morning, warm low golden sun, long soft shadows, a turquoise reservoir, a few date palms, white salt flats glittering in the distance. Left side: an iron mine entrance in the cliff gushes a stream into a thick clear glass pipe; inside the pipe you can see distinct colourful particles of different SHAPES: dark grey metallic spiky balls (iron) and tan faceted rock grains (sand). The pipe feeds a chunky brass-and-glass machine: a big rotating magnet drum separator with red-and-silver horseshoe magnet accents and brass rivets. From the drum two glass pipes leave: one carries only the grey spiky iron balls to a sandstone foundry with a smoking chimney, the other carries only tan sand grains to a builder's yard with stacked bricks. Above each customer building floats a small rounded game demand meter (product icon + fill bar). HUD is Hebrew, right-to-left, clean rounded game UI in cream and teal with copper accents: top-right a week title panel "שבוע 1 · שבוע הברזל" with a small sun-dial clock; top-left round play/pause, x2 speed and menu buttons; along the bottom center a tray of 4 chunky machine cards (magnet drum, filter, still, evaporation pan icons, Hebrew names, count badges) and a pipe budget meter. Crisp, saturated desert-teal and copper palette, high-quality indie game look.

ChatGPT title for the download: "Magnetic Separator in the Desert Canyon".

## Prompt 2 → `02-core-mid-play.png`

> Great, keep exactly this art style, palette, HUD style and camera. Now create a second in-game screenshot (16:9) from the SAME game, later in the week at mid-afternoon, showing a bigger network mid-play: the camera is the same tilted three-quarter view but a bit wider. A salt-flat source pumps a grey mixed stream (white salt cubes, tan faceted sand rocks, dark spiky iron balls) through thick clear glass pipes into a chain of chunky brass-and-glass machines: first the magnet drum (iron balls jump into a side pipe), then a big glass dissolving tank where a second glass pipe brings water from a small spring (water = small blue rounded triad particles), then a filter press station (glass funnel with paper cone on a brass stand) where tan sand stays behind on the filter, then a wide steaming copper evaporation pan on a brick fire base with white steam rising. Out of the pan, white salt cubes ride a glass pipe to a sandstone bakery with an awning and a floating demand meter filling up. On the LEFT side of the screen there is a large circular "particle lens" inset panel framed in brass like a magnifier, showing a zoomed-in view inside a pipe: 3D ball-and-stick molecules (water: one red ball with two small white balls) mixed with white salt cubes, floating; under the lens a small legend of particle shapes with Hebrew labels, and a row of four round tag stamps with Hebrew labels "יסוד" "תרכובת" "תערובת הומוגנית" "תערובת הטרוגנית". Keep the top-right week title panel (now "שבוע 3 · שבוע המלח"), top-left play/pause/x2/menu buttons, the bottom machine tray cards and the pipe budget meter. Small outlet labels near machine outlets. Real 3D game render, warm sun, polished indie strategy game, no robots, no avatar.

ChatGPT title: "מדבר המלח_ מפעל ההפרדה".

## Prompt 3 → `03-failure.png`

> Excellent. Same game, same art style, same HUD style. Now a third in-game screenshot (16:9): a funny FAILURE moment at dusk. The light is late golden-orange dusk going purple, long shadows, warm lamps starting to glow on buildings. The camera is the same tilted three-quarter view but closer on the action. The player built the network in the wrong order: salt water (blue rounded water triads mixed with white salt cubes) flows into a brass-and-glass filter funnel and sails straight through it untouched, while only a bit of tan sand sits on the paper. Further along, a sandstone bakery with a striped awning is comically spitting out a puff cloud of sandy, gritty salt (tan rocks mixed with white cubes) back out of its door, with a big white comic speech bubble with Hebrew text "פויה! יש חול במלח" and a cartoon spit effect. Its floating demand meter is dropping with an orange warning outline. On the left, at the salt-flat source, a round brass backlog gauge above the source is flashing RED, needle in the red zone, with red glow pulses, and the glass pipe from the source is visibly crammed and backed up with particles. A small red-orange sun-dial clock top-right shows the day almost over. Keep the top-left play/pause buttons, the top-right week title panel "שבוע 3 · שבוע המלח", the bottom machine tray cards and pipe budget meter. Tone is playful and cheeky, not a red error popup. Real 3D game render, polished indie strategy game, no robots, no avatar.

ChatGPT title: "Saltworks Pipeline at Dusk".

## Prompt 4 → `04-hud.png`

> Perfect. Last one, same game and same UI style: a 16:9 HUD close-up / UI design sheet shot of the game screen, camera zoomed in on the lower half of the screen during play, the 3D desert valley softly blurred behind the UI (depth of field). Show crisply and large: (1) the bottom machine tray: 5 chunky cream-and-brass cards in a row, right-to-left, each with a small 3D-rendered icon of the machine (magnet drum, filter funnel on brass stand, copper still with coil, steaming copper evaporation pan, chromatography tower with paper strips), a Hebrew name under it, a green count badge "x1"/"x2", one card selected with a glowing teal outline, one card greyed out and locked; plus the pipe budget meter at the left end of the tray (glass pipe icon + teal fill bar + numbers). (2) On the right side, the circular brass-framed "particle lens" panel, large: inside a glass circle, floating 3D particles — blue ball-and-stick water molecules (one red ball + two white balls), white salt cubes, tan faceted sand rocks; below it a legend row of the four particle shapes with Hebrew labels and chemical formulas in Latin letters (H2O, NaCl, SiO2, Fe), and a row of four round wax-seal style tag stamps with Hebrew labels "יסוד" "תרכובת" "תערובת הומוגנית" "תערובת הטרוגנית", one stamp freshly pressed with a green check. Hebrew right-to-left, Rubik-like rounded font, polished indie game UI, cream / teal / copper palette, no robots, no avatar.

ChatGPT title: "Desert Factory_ Particle Lens UI".

## Notes for the builder

- **Hebrew text:** much more legible than usual, but still not authoritative. Known slips: in 02/03/04 the glass-dome dissolving-tank card is labelled "מסנן" (filter) instead of a dissolving-tank name; 02 labels the tank "מסס (המסה)"; formulas render as subscripted H₂O/SiO₂ in some places. Use the game's own strings, not the image text.
- **Particle colours drift between images:** 01 shows iron as dark spiky balls and sand as tan faceted grains (matches identity). In 02/03 water inside pipes is drawn as clusters of small blue spheres, while the lens shows red-O/white-H ball-and-stick molecules. Pick one convention (identity says "small rounded triad") and keep shape coding.
- **Tray order:** 04 shows the tray reading right-to-left (magnet drum rightmost & selected, chromatography locked leftmost). 01–03 draw the cards left-to-right; follow 04 (RTL).
- **Lens placement differs:** 02 puts the lens as a tall left-side panel; 04 puts it on the right. GAME_IDENTITY only says "circular inset panel"; in RTL the right side reads first but collides with the week plaque — the lead decides.
