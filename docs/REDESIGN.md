# Clean Flow v2 — Pipe Puzzles (redesign plan)

25 Oct 2026. The user played v1 and said: barely understood what to do, felt weird, boring, too hard — not the science, the flow and controls. They chose the **Pipe Puzzles** direction.

## What went wrong in v1 (so we don't repeat it)

| v1 problem | Why it hurt | v2 answer |
|---|---|---|
| Free-form network building on a big hex valley | Too many decisions before anything happens; no clear "what do I do" | The pipes are already laid. You only choose **which machine goes in which socket** (and which way it faces). |
| Tiny outlet rings to drag pipes from, pipe budget, inventory, ports | Fiddly controls, hidden rules | One verb: **drag a big card into a big glowing socket**. Tap a placed machine to flip it. That's all. |
| Camera panning/zooming around a large valley | Lost on screen, things off-screen | Each puzzle is **one compact diorama that fits the screen**. Fixed camera (slight parallax only). |
| Long real-time runs, floods, dusk timers | Waiting, then punishing failure | Press ▶ → a **10-second flow show** → result. No timers, no floods. Instant retry keeps your machines. |
| Classification stamps disconnected from the action | Felt like a quiz | Scan stays optional and quick, earns a star, and the result explanation refers to what you saw in the scan. |
| 6 long weeks | Little sense of progress | **~14 short puzzles** (30–60 s each) on a level map with stars, new machine every chapter. |

## Core loop (per puzzle, 30–60 s)

1. **Look** — a small sandstone diorama: a source on the right pours a mixed stream into clear glass pipes that run **right → left** (Hebrew reading direction) to customers on the left. Each customer has an order card ("רוצה: מלח").
2. **(Optional) Scan** — tap the source: a brass magnifier shows the particles; stamp יסוד / תרכובת / תערובת הומוגנית / הטרוגנית for a star.
3. **Build** — drag machine cards from the tray into the glowing sockets on the pipes. Socket shape tells what fits: **round socket** = one-way machine (evaporation pan, dissolving tank); **Y socket** at a fork = machine with two outputs (magnet, filter, funnel, still, chromatography, sieve). Each fork branch shows which output goes there; tap the machine to flip. The still also shows its thermometer (78 °C / 100 °C) on tap.
4. **Run** — big ▶ "הפעל זרימה". Particles flow, machines animate, customers fill up or spit out the wrong stuff (funny, visible).
5. **Result** — all customers happy → stars, confetti, next. Otherwise a small card says what went wrong in one line plus a worked hint ("המלח נמס במים ועבר דרך המסנן"), and **"נסו שוב"** keeps your machines in place.

Stars: ★ solved · ★ solved without a failed run · ★ source(s) classified correctly on the first stamp.

## Rules (pure TypeScript, reused from v1)

- Substances, classification and machine physics stay exactly as in v1 (`src/sim/substances.ts`, `mixture.ts`, `stations.ts`) — same tests, same Workbook alignment (wet magnet, purity without carrier, etc.).
- New `src/puzzle/` engine: a puzzle is a small directed graph — sources, pipes, sockets (inline / fork), junctions, customers, drain. Running a puzzle pushes a fixed number of packets through the graph **instantly** (pure function) and returns every customer's verdict plus per-pipe flows; the 3D view replays that as an animation. Deterministic, easy to test: every level has tests for its solution, wrong orders, and decoys.
- Empty inline socket = plain pipe. Empty fork = the stream splits evenly into both branches (so leaving a fork empty sends the mixture everywhere — a visible mistake).
- Dissolving tank adds its own water (no extra pipe to draw).
- A customer is happy when it receives its product and **every** delivery is pure enough; one bad delivery → spit-out + unhappy.

## Chapters (draft — exact boards are authored and tested in code)

1. **מגנט** — iron + sand: one fork (learn drag + flip); then two forks in series with a decoy filter (a dry filter does nothing).
2. **מסנן ואידוי** — sand in salt water: filter → pan; salt water for the clinic needs the still, not the pan (the pan sends the water away as steam); combined board.
3. **שכבות, וצלול ≠ טהור** — oil + water → separating funnel; clear sugar water must not reach the village.
4. **הקלאסיקה** — salt + sand + iron: magnet → dissolving tank → filter → pan, with sockets that make the wrong order possible (and visibly wrong).
5. **דיו ואתנול** — chromatography for the blue ink; the still at 78 °C vs 100 °C.
6. **יום השיטפון** (transfer, no hints) — copper-sulfate water + gravel, vinegar + oil, iron + sulfur, iron sulfide (a compound: the magnet does nothing).

## Look & feel

- Compact floating sandstone plateau per level, soft warm sky gradient, turquoise water details, palms; Tripo models for sources, customers and all machines (round 1 + round 2: magnet drum, filter, still, pan, tank, funnel, chromatography tower, sieve, mine, reservoir, foundry, bakery, house) and the rigged engineer (idle / cheer / frustrated) next to the board.
- Thick glass pipes made of straight runs with rounded corners (Mini Metro clarity), brass couplers, particles clearly visible.
- Sockets glow and pulse; a dragged card snaps with a satisfying clunk; machines pop in; customers bounce when happy, puff when unhappy.
- Cream parchment + brass HUD (kept from v1, matches the mockups): level plaque + stars top-right, round teal buttons top-left (menu, hint, restart), tray bottom, big green ▶.
- Level map with a winding path, brass badges, stars.
- Sound: clunks, glassy flow, chimes, comic "ptui"; light ambient music; mute.

## Process

1. ChatGPT mockups of v2 → `docs/visual-targets/v2/` (in progress).
2. Puzzle engine + levels + tests.
3. 3D board, drag-drop, flow replay, UI, level map.
4. Headless playthroughs with real input + independent playtester focused on clarity and fun; fix.
5. Visual review vs v2 mockups; update all docs; push.
