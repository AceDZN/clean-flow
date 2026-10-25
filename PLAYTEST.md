# PLAYTEST — what was verified, and what wasn't (v2)

v2 is the pipe-puzzle redesign. Browser checks ran in headless Chromium (Playwright, SwiftShader WebGL) against the dev server, driving the game only with real mouse/touch/keyboard input and stepping time with `window.advanceTime`; wins come from machines placed through the UI. Script: [`scripts/play2.mjs`](scripts/play2.mjs). v1's playtest record is in git history.

## Verified

| Check | How | Result |
|---|---|---|
| Unit tests | `npm test` | 102/102 pass. Chemistry: classification, mass conservation for all 8 machines, station physics (wet magnet, dry filter, chromatography solvent sharing), customer purity. Puzzles: every level solvable, at most 2 solutions (13 of 14 have exactly one), empty sockets never win, mass is conserved through each solution, each advertised mistake produces its rejection (wrong orientation, pan on pure water, filter alone, filter on salt water/oil+water, clear sugar water, dry filter in the classic, wet magnet, 100 °C still, filter before sieve, magnet on FeS), and no single machine type in every socket clears the transfer chapter |
| Production build | `npm run build` | passes; JS 801 KB (214 KB gzip); models ~14 MB total in `public/models` |
| Full campaign | `node scripts/play2.mjs campaign` | all **14** puzzles solved through the UI (drags, flips and the 78 °C thermometer in the machine popover), no console errors |
| First minute (level 1) | `shots` | map → level 1 → scan the mine (iron + sand, stamp "תערובת הטרוגנית") → drag the magnet (card follows the pointer, socket glows) → tutorial says the magnet faces the wrong way → tap → "⇅ הפוך יציאות" → ▶ → iron to the foundry, sand to the builder → 3 stars |
| Recoverable mistake | `fail` | level 3 with only the filter: salty water reaches the bakery ("פויה! יש מים במלח"), card "כמעט!" with the worked explanation; "נסו שוב" keeps the machines |
| Phone 390×844 (touch, DPR 2) | `mobile` | map and level 1 fit; board runs up the screen; orders row; tray and play reachable |
| Real GPU frame cost | browser pane, Apple M2 Max (ANGLE/Metal), 1280×800 at DPR 2 → 2560×1600 canvas | level 9 mid-run, 180 frames rendered back-to-back with a GPU sync each: **median 5.0 ms, p95 6.3 ms** (max 22 ms, one spike). The pane was not on screen, so this is per-frame cost, not a live FPS recording |
| Independent fresh-eyes playtest | separate agent, real inputs only | report in [docs/V2_REVIEW.md](docs/V2_REVIEW.md): v2 fixes v1's core problem; top issues (no drag feedback, flip never taught, phone layout, generic failure card, goal disappearing, flat curve, long show, stale tap selection, Hebrew templates, decoy pan) were fixed — see the resolution table there |

## Not verified (honest limits)

- **Fun and learning.** Automation and an agent playtester can judge clarity and friction, not whether 13-year-olds have fun or learn. That needs real players.
- **Sound** (synthesized WebAudio) — not listened to.
- **Real phones / touch hardware** — only emulated touch.
- **Phone levels 6–14** were not re-captured after the last layout changes (the layout code is shared; levels 1–5 were checked).
- **Vercel deployment** — not deployed (static build + `vercel.json` ready).
