# progress — Clean Flow

## 2026-10-25

- Read the handoff (COMMON, BUILD_HANDOFF, IDEAS) and the Workbook chapter-3 snapshots; wrote `GAME_IDENTITY.md`.
- Visual/Chrome helper (Agent) generated 4 gameplay mockups in ChatGPT (gpt-image) → `docs/visual-targets/` (+ `PROMPTS.md`), and 6 Tripo models (magnet drum, filter, still, evaporation pan, customer house, engineer) + 1 rig + 1 animation (cheer) → `public/models/`, recorded in `ASSETS.md`. 180 Tripo credits, 6/6 generations, 2/2 rig/animation jobs. Idle/facepalm clips would exceed the 2-job cap, so they are procedural bone poses.
- Authoritative sim in pure TypeScript (`src/sim/`): substances, classification, 8 mass-conserving machines, packet network with queues/stalls/flood, customer purity, six authored weeks. 67 unit tests (every level solvable, wrong orders fail, constant strategies fail in the transfer week).
- 3D game (`src/game`, `src/render`, `src/ui`): hex terraced valley + canyon, Tripo machines in gameplay, glass pipes with instanced shape-coded particles, particle lens (live ball-and-stick inset), Hebrew RTL HUD matching the mockups' layout, week-1 coach marks, hints, failure explanations, stars, upgrade pick, mascot, synthesized sound, local learning log, `render_game_to_text` / `advanceTime`.
- Headless playtests with real mouse input (`scripts/playtest.mjs`): all six weeks won through the UI; recoverable mistake (week 1 wrong pipe → rejection → dusk) verified; mobile 390×844 layout checked.
- Fixed from playtests: status banner blocking clicks, wrong picking between overlapping machines/customers and pipes, camera framing per week, exposure, pipe/particle readability, rejection bubble placement, mobile HUD overlap.
- Visual review written (`docs/VISUAL_REVIEW.md`) with real captures in `docs/captures/`.
- Independent science reviewer/playtester (Agent) running; findings will go to `docs/REVIEW_NOTES.md` and be fixed here.

## Next

- Apply the science reviewer's findings.
- Final pass: PLAYTEST.md, leave the dev server running on 5195.
