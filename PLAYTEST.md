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
- **Frame rate on a real GPU.** Not measured. The built-in browser pane was hidden during this session (background tabs are throttled) and headless SwiftShader is a software renderer, so neither gives a meaningful FPS number. `window.cf.fps()` reports the live frame rate in a real browser.
- **Sound.** The WebAudio sounds were not listened to; they are synthesized and only start after the first user gesture.
- **Real touch devices.** Only emulated touch in Playwright.
- **Vercel deployment.** Not deployed (per brief); `vercel.json` + static build are ready.

## Independent review

An independent science reviewer/playtester (separate agent, real inputs only) found 2 errors (week 5 winnable without chromatography; FeS Hebrew name), 9 risks, Workbook-term nits and 4 UI bugs. All errors, risks, term nits and bugs B3/B4 were fixed or explicitly addressed — see the resolution table in [docs/REVIEW_NOTES.md](docs/REVIEW_NOTES.md). The reviewer also played the week-1 tutorial, a recoverable mistake, hints, restart, week 4 right and wrong orders, week 5 at 100 °C vs 78 °C, the transfer week and touch on a 390×844 viewport.
