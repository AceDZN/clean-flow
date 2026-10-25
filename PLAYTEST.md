# PLAYTEST — what was verified, and what wasn't

All browser checks below ran in **headless Chromium (Playwright, SwiftShader WebGL)** against the dev server, driving the game only with real mouse/touch/keyboard input (`page.mouse`, `page.click`) and stepping time with `window.advanceTime`. No state was injected; wins come from networks built through the UI. Script: [`scripts/playtest.mjs`](scripts/playtest.mjs).

## Verified

| Check | How | Result |
|---|---|---|
| Unit tests | `npm test` | 74/74 pass: classification, mass conservation for all 8 machines, station physics (incl. the wet magnet and chromatography solvent sharing), customer judging (purity without the carrier, 99 % drinking water), every week's intended network wins in the full sim, wrong orders fail with the advertised rejection (week 4: filter before dissolving, no magnet, evaporate first, no water, dissolve before the magnet), week 5 can't be won without chromatography, the transfer week rejects every constant strategy (each machine type alone and every two-machine chain applied to all streams) |
| Type check + production build | `npm run build` | passes; JS 834 KB (223 KB gzip), CSS 16 KB, models 6.1 MB, `dist` 8.3 MB |
| First 30 seconds (week 1) | `node scripts/playtest.mjs week1` | tap mine → lens opens with iron + sand particles → stamp "תערובת הטרוגנית" (+⭐) → drag magnet card onto a hexagon → drag pipes mine→drum, "נמשך למגנט"→foundry, "השאר"→builder, spring→village → ▶ → particles split, meters fill → **won** (22.7 s of game time) |
| Full campaign | `node scripts/playtest.mjs campaign` | all six weeks **won** through the UI, including the mid-week reveals (week 2 salt pond + clinic, transfer-week black mine + lab), the still thermostat set to 78 °C via its inspector in week 5, and the perk pick between weeks |
| Recoverable mistake | `node scripts/playtest.mjs week1-fail` | mine piped straight to the foundry → foundry spits out the packet, "פויה! יש חול בברזל" bubble, orange card + "!" → dusk → failure card explains the mixture and names the property (magnetism) → "לתקן ולנסות שוב" keeps the network |
| Failure capture like mockup 03 | `review` scenario | week 2, pan before filter → "פויה! יש חול במלח" at the bakery |
| Flood | (earlier runs) | a source with no outlet floods; failure card names the cause ("מהמקור «…» לא יצא שום צינור") |
| Particle lens on a pipe | `review` scenario | filtrate pipe in week 4 shows H₂O + Na⁺/Cl⁻ ions evenly spread, legend "מלח NaCl · מומס" |
| Mobile 390×844 (touch, DPR 2) | `mobile` scenario | HUD, tray, coach and valley fit; whole week-1 valley visible |
| Console errors | all scenarios | none |

## Not verified (honest limits)

- **Fun and learning.** Automation cannot show that the game is fun or that students learn; that needs real players.
- **Sound.** The WebAudio sounds were not listened to; they are synthesized and only start after the first user gesture.
- **Real touch devices.** Only emulated touch in Playwright.
- **Vercel deployment.** Not deployed (per brief); `vercel.json` + static build are ready.

## Performance on a real GPU (measured 2026-10-25, after the laptop restart)

Machine: Apple M2 Max, Chromium in the Claude desktop browser pane (ANGLE → Metal), window 1024×768 at DPR 2 → canvas 2048×1536.

- **Title screen, live:** 119.9 FPS from `cf.fps()` (the display's 120 Hz vsync cap), measured while the pane's animation loop was running.
- **Frame cost while playing:** for each week, the intended network was built through the game's own pointer handlers (DOM `PointerEvent`s dispatched in the page, not OS-level mouse input), and the valves were opened. 120 frames were then rendered back-to-back with `advanceTime(16.7 ms)`, forcing a GPU sync after each one (`readPixels`). The time includes sim + scene update + render + GPU finish.

| Week | median ms/frame | p95 | max |
|---|---|---|---|
| 1 · Iron | 4.1 | 5.0 | 9.9 |
| 2 · Salt | 4.1 | 5.6 | 9.7 |
| 3 · Oil | 4.3 | 5.7 | 7.6 |
| 4 · Classic | 4.3 | 5.6 | 7.3 |
| 5 · Ink | 4.1 | 5.2 | 8.2 |
| 6 · Flood Day (11 pipes, 4 sources) | 5.1 | 6.1 | 10.5 |

That is under the 8.3 ms budget for 120 Hz at p95 in every week (and far under 16.7 ms for 60 Hz). All six weeks were won in this run. The first title frame took 174 ms (shader compile). Caveat: the pane was reported hidden for most of the session, which pauses the live animation loop, so these are per-frame costs rather than a long live-FPS recording. Phones and integrated GPUs were not measured.

Found and fixed during this pass: at 4:3 the camera framing left bottom-row nodes under the tray (Flood Day's powder store and fertilizer plant; week 1's mine and builder), and the transfer-week reveal pan pushed the powder store off screen. The camera now searches for the closest distance at which every node's outlet and label fit between the top bar and the tray, and a reveal returns to that view.

## Independent review

An independent science reviewer/playtester (separate agent, real inputs only) found 2 errors (week 5 winnable without chromatography; FeS Hebrew name), 9 risks, Workbook-term nits and 4 UI bugs. All errors, risks, term nits and bugs B3/B4 were fixed or explicitly addressed — see the resolution table in [docs/REVIEW_NOTES.md](docs/REVIEW_NOTES.md). The reviewer also played the week-1 tutorial, a recoverable mistake, hints, restart, week 4 right and wrong orders, week 5 at 100 °C vs 78 °C, the transfer week and touch on a 390×844 viewport.
