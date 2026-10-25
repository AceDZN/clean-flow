# progress — Clean Flow

## 2026-10-25

- Read the handoff (COMMON, BUILD_HANDOFF, IDEAS) and the Workbook chapter-3 snapshots; wrote `GAME_IDENTITY.md`.
- Visual/Chrome helper (Agent) generated 4 gameplay mockups in ChatGPT (gpt-image) → `docs/visual-targets/` (+ `PROMPTS.md`), and 6 Tripo models (magnet drum, filter, still, evaporation pan, customer house, engineer) + 1 rig + 1 animation (cheer) → `public/models/`, recorded in `ASSETS.md`. 180 Tripo credits, 6/6 generations, 2/2 rig/animation jobs. Idle/facepalm clips would exceed the 2-job cap, so they are procedural bone poses.
- Authoritative sim in pure TypeScript (`src/sim/`): substances, classification, 8 mass-conserving machines, packet network with queues/stalls/flood, customer purity, six authored weeks. 67 unit tests (every level solvable, wrong orders fail, constant strategies fail in the transfer week).
- 3D game (`src/game`, `src/render`, `src/ui`): hex terraced valley + canyon, Tripo machines in gameplay, glass pipes with instanced shape-coded particles, particle lens (live ball-and-stick inset), Hebrew RTL HUD matching the mockups' layout, week-1 coach marks, hints, failure explanations, stars, upgrade pick, mascot, synthesized sound, local learning log, `render_game_to_text` / `advanceTime`.
- Headless playtests with real mouse input (`scripts/playtest.mjs`): all six weeks won through the UI; recoverable mistake (week 1 wrong pipe → rejection → dusk) verified; mobile 390×844 layout checked.
- Fixed from playtests: status banner blocking clicks, wrong picking between overlapping machines/customers and pipes, camera framing per week, exposure, pipe/particle readability, rejection bubble placement, mobile HUD overlap.
- Visual review written (`docs/VISUAL_REVIEW.md`) with real captures in `docs/captures/`.
- Independent science reviewer/playtester (Agent) reported 2 errors, 9 risks, term nits and 4 UI bugs (`docs/REVIEW_NOTES.md`). Fixed: purity judged without the carrier (week 5 needs chromatography), FeS → ברזל גופרי, wet magnet catches half the iron (week 4 order now matters, per Workbook separation-lab), distilled-water reservoir instead of a "pure" spring, 99 % drinking water, compound note on machines, chromatography solvent sharing, Workbook terms (משקע, נוזל מסונן, נוזל מזוקק, מעבה, אדים, פיגמנט, אתנול), tap-a-source no longer arms a pipe, R on result screen, mobile lens overlap. 74 tests.
- Re-ran the full campaign, review captures and failure scenario after the fixes.

## 2026-10-25 (later) — v2 redesign

- The user played v1: "barely understood what to do… weird… boring… too hard because of the flow/controls". Replanned (docs/REDESIGN.md); the user chose **Pipe Puzzles**.
- Tripo round 2 (8 models: tank, funnel, chromatography tower, sieve, mine, reservoir, foundry, bakery; engineer idle + frustrated at 0 credits; 240 credits). ChatGPT v2 mockups (5) in docs/visual-targets/v2.
- New pure puzzle engine (src/puzzle) with a brute-force solver test; 14 puzzles in 6 chapters (3 no-hint transfer).
- New 3D front-end (src/v2): floating islands, glass pipes, sockets, drag-and-drop with snapping, flip, thermometer, flow show, customer reactions, scan magnifier, results, level map, phone layout. v1 shell removed.
- Independent fresh-eyes playtest (docs/V2_REVIEW.md) → fixes listed there (drag feedback, teaching flips, phone layout, root-cause failure card, goal banner, harder levels, shorter show, Hebrew).
- Verified: 102 tests; all 14 puzzles solved through the UI; phone layout; M2 Max frame cost 5.0 ms median.

## Next (not in this slice)

- Persistent growing valley across weeks; splitters / throughput upgrades.
- Teacher check of FeS naming and the wet-magnet number; real-classroom playtests.
