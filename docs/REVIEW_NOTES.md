# Clean Flow — science review and playtest notes

Reviewer: independent science reviewer / playtester (automation). Date: 2026-10-25.
Scope: `src/sim/*`, Hebrew strings in `src/game/Game.ts`, `src/ui/hud.ts`, `src/sim/levels.ts`, checked against `docs/curriculum/*.md` (Workbook snapshots) and `docs/handoff/BUILD_HANDOFF.md`. Line numbers refer to the working tree at review time (the lead was editing `levels.ts`/`Game.ts` concurrently; quotas changed mid-review, logic did not).
Scratch scripts and screenshots: `output/review/` (gitignored). Nothing in `src/` was edited.

This report does not claim the game is fun or that students learn from it. Automation can't show either.

---

## 1. Science findings

### ERROR (must fix)

**E1. Week 5: raw green ink is accepted by the print shop. Chromatography isn't needed.**
`src/sim/world.ts:569-574` (`judge`) divides impurity by the *total* packet mass, including the tolerated carrier (`allowed: ['water']`). Ink = blue 0.3 + yellow 0.3 + water 9.4, so yellow is 0.3/10 = 3 % < 5 %, and the packet is accepted with credit 0.3. Reproduced in the full sim and **in the browser with real input**: pipe `ink → print`, still at 78 °C for the perfume. The week is won with 1 machine, 0 rejections and the "tidy" star (par is 2). The week's main lesson (pigments → chromatography) can be skipped entirely. The same weakness lets a 50/50 pigment mix count as "blue ink" whenever enough carrier is present.
Fix: measure purity against the non-carrier part only:
`const core = tot - allowed.reduce((s,u)=>s+mass(comp,u),0); if (core > EPS && impure / core > 1 - purity + EPS) → reject`.
With that change: raw ink 50 % yellow → rejected; chromatography slow band → accepted; vinegar (acetic + water) is unaffected. Add a level test: `ink → print` must be rejected.

**E2. FeS Hebrew name: "ברזל גופריתי" is the wrong suffix.**
`src/sim/substances.ts:89` and `levels.ts:219` (`wantHe`). In Hebrew chemical nomenclature, ‑גופרי = sulfide (מימן גופרי H₂S, as in נתרן כלורי NaCl), ‑גופרתי = sulfate (נחושת גופרתית CuSO₄, which the game uses correctly), and ‑גופריתי = sulfite (חומצה גופריתית H₂SO₃). "ברזל גופריתי" reads as iron sulfite. Fix: `he: 'ברזל גופרי'`, `wantHe: 'ברזל גופרי'`. (FeS isn't in the Workbook snapshots, so please have a teacher confirm. The ‑י / ‑תי / ‑יתי pattern itself is standard.)

### RISK (could mislead)

**R1. Week 4: "water before the magnet" wins with full stars, which contradicts Workbook separation-lab.**
Workbook (`separation-lab`, "למה חשוב לבצע את השלבים בסדר הזה בדיוק?") says the iron must come out first: "הסדר קריטי! לא ניתן לשנות ללא אובדן חומרים", because wet iron is hard to collect and rusts. The handoff acceptance line is "Week 4 cannot be solved in the wrong order". In the game, `mine → tank(+water) → magnet → filter → pan` wins with 0 rejections and the tidy star (verified in the browser). `tank → filter → magnet-on-residue` also wins (`tests/levels.test.ts` deliberately asserts this). Physically a magnet does pull wet filings, so the sim isn't wrong, but the game now teaches the opposite of the Workbook sentence. Pick one of these and make the text agree:
  (a) Keep the physics and add a cost the Workbook names: iron that passes through water arrives as rusty, wet iron (e.g. 30 % of it lost to the residue, or the foundry rejects it with "הברזל נרטב והחליד — מוציאים אותו במגנט לפני שמוסיפים מים"). Then week 4 really can't be won in the wrong order.
  (b) Keep it allowed, but say so explicitly in the week-4 worked explanation and CURRICULUM.md ("גם מגנט אחרי ההמסה עובד, אבל הברזל נרטב ועלול להחליד — לכן במעבדה מוציאים אותו ראשון").
Either way, the intro "הסדר הוא הכול" (levels.ts:147) currently overclaims, because only filter-before-dissolve and evaporate-before-filter are enforced.

**R2. "המעיין" is modelled as pure H₂O (a compound), and the tutorial says so outright.**
`levels.ts:77,130,156`; hint `levels.ts:85` ("המעיין הוא כבר חומר אחד"); coach step 5 `Game.ts:714` ("והמעיין? הציצו בו: חומר אחד בלבד"). Workbook (`distillation-chromatography`) lists tap water as "מי ברז (מים + מינרלים)" → a mixture. Natural spring water is likewise a homogeneous mixture. Calling a spring "one substance" plants exactly the "clear = pure" misconception the game fights in weeks 2–3. The handoff asked for a pure-water spring, so the fix is naming, not mechanics. Rename the source to something that really is pure, e.g. `he: 'מאגר המים המזוקקים'` (look can stay a spring/tank), and change the tutorial line to "והמאגר? הציצו בו: חומר אחד בלבד — מים מזוקקים. צינור ישר לכפר — בלי מכונה." Hint 3 → "מאגר המים המזוקקים הוא כבר חומר אחד".

**R3. 5 % impurity tolerance lets visibly tinted water count as "water".**
Enumeration found `ink → chromatography(slow) → filter` delivering water + 3.8 % methylene blue, which the week-5 village accepts. The fast band (yellow 6 %) is rejected only by 1 percentage point. Dyes at a few percent are intensely coloured, so a kid sees blue water accepted as "מים". Fix: give water/drink customers `purity: 0.99`, or reject any coloured impurity regardless of amount.

**R4. Distillation at 78 °C yields 100 % ethanol, and the remainder is 100 % water.**
`stations.ts:142-145`, worked explanation `Game.ts:1981` ("רק הכוהל יתאדה"). This matches the Workbook text ("מקבלים אתנול טהור!"), so it isn't an error against the source. But the Workbook's own wine example says "אתנול מרוכז", and real simple distillation can't pass about 95–96 % (azeotrope). A 30 % mixture also doesn't boil at 78 °C. Low-cost mitigation: perfume `wantHe: 'כוהל מרוכז'`, and change the explanation to "ב-100°C גם המים רותחים. כוונו ל-78°C — הכוהל מתאדה ראשון והמים נשארים בדוד." Don't add mechanics.

**R5. Gap vs. the handoff misconception "a compound like water is a mixture of H and O you can pull apart".**
Nothing in the game reacts when a player sends a pure compound (water, FeS) through a separator. The magnet on FeS shows "אין פה שום דבר שנמשך למגנט", but no station says *why*. Suggest a station note when the input is a single compound unit (`classify(input)==='compound'`): `'pure-compound': 'זו תרכובת — חומר טהור. שיטות הפרדה פיזיקליות לא מפרקות אותה ליסודות.'`. This one sentence covers both the H₂O and the FeS traps.

**R6. Classification tags can be read off the lens text, not reasoned.**
`hud.ts:75-80` (`distributionHe`) prints "2 סוגי חלקיקים, בגושים / בשכבות נפרדות" or "…מפוזרים באחידות", and the legend shows formulas. Together that is the Workbook decision tree's answer, so the "tags" star is a reading task. Consider showing the distribution sentence only *after* a stamp, or as "מה אתם רואים?". This is a design call; flagged because the star is logged as a "first unaided decision".

**R7. Chromatography is used as a production machine (quota of ink).**
Workbook (`distillation-chromatography`) frames chromatography as analysis of "כמויות זעירות", in contrast to distillation for "כמויות גדולות". The tiny quota partly respects this. A short line in the chroma blurb would avoid contradicting the source: "…בכמויות קטנות — כמו במעבדה".

**R9. Transfer week: the reveal text gives away the FeS trap.**
`levels.ts:222`: "המעבדה קונה את מה שיוצא ממנו, כמו שהוא" tells the player not to process the black mine in the one no-hints week, so the "compound ≠ separable" decision is never made unaided. Suggest: `'המים חשפו מכרה שחור. המעבדה צריכה ברזל גופרי.'`, then let the lens show FeS as a single compound.

**R8. The chromatography model halves the water, so blue pigment precipitates in the slow band.**
`stations.ts:147-169`: the slow band gets 4.7 water, and methylene blue solubility 0.04 → 0.188 dissolves, 0.112 "undissolved". The lens would show "חלקו מומס" for a pigment that was fully dissolved a moment earlier, and a filter then "removes" pigment. Fix: let pigments keep their dissolved state (e.g. give each band enough solvent, or skip the solubility recompute for chroma outputs).

### NIT

- **Workbook terminology** (`docs/curriculum/…filtration-evaporation.md`, `…distillation-chromatography.md`, `…separation-intro.md`):
  - filter outputs `stations.ts:36`: "שארית" → Workbook "משקע"; "תסנין" → Workbook "מסנן (filtrate) / הנוזל המסונן". "מסנן" collides with the machine name, so use **"נוזל מסונן"** and **"משקע"**.
  - still `stations.ts:66,68`: "תזקיק" → "נוזל מזוקק"; "מצנן" → Workbook "מעבה" ("מתקרר במעבה ונאסף כנוזל").
  - pan `stations.ts:62` and hint `levels.ts` week 2: "ועף כקיטור" → "ועף כאדים". Workbook uses "אדים", and ethanol/vinegar vapour isn't "קיטור". "אגן אידוי" is fine; Workbook says "צלחת אידוי".
  - pigments `substances.ts:79-80`, chroma blurb `stations.ts:74`, hints week 5, NOTE_HE `no-solvent`: "צבען" never appears in Workbook. Use **"פיגמנט כחול / פיגמנט צהוב"**, "גורר כל פיגמנט במהירות אחרת".
  - ethanol `substances.ts:78`, perfume `wantHe`: "כוהל" → Workbook "אתנול" / "אלכוהול". Suggest `he: 'אתנול (אלכוהול)'`, `wantHe: 'אלכוהול'`.
- **CuSO₄ solubility 0.32** (`substances.ts:85`) is the pentahydrate figure at about 0 °C. Anhydrous CuSO₄ at 20 °C is about 0.20 g/g. With 0.20, the creek (2 in 8 water) would be over-saturated, so if you correct it, drop the creek to `copperSulfate: 1.5`. The blue crystals from the pan are really CuSO₄·5H₂O. Fine to leave as CuSO₄ for grade 8.
- **Oil formula** `C₁₈H₃₄O₂` (`substances.ts:76`) is oleic acid, a fatty acid, not an oil. The lens shows it as "שמן". Either show triolein `C₅₇H₁₀₄O₆`, or keep the formula off the lens for oil.
- **Gravel = CaCO₃, sand = SiO₂** as single compounds is a simplification. Acceptable, but don't let a stamp on a gravel-only stream say "תרכובת" in a way a teacher could challenge. Not currently taggable.
- **CO₂ boilingPoint −78** (`substances.ts:84`): CO₂ sublimes at −78.5 °C (no liquid at 1 atm). Not shown in UI.
- **FeS not magnetic**: acceptable at school level and the standard textbook statement. Stoichiometric FeS (troilite) isn't attracted to a hand magnet, but lab-made FeS often contains leftover iron/pyrrhotite and responds weakly. If a lens or teacher note is added: "ברזל גופרי טהור לא נמשך למגנט".
- **Sugar to dryness** in the pan: Workbook says "חימום עדין" (heating sugar hard caramelises it). Optional pan note for sugar.
- **Funnel model** (`stations.ts:131`) assumes every immiscible liquid is lighter than water and sends a denser one to "bottom" together with water. No such liquid exists now; guard it if one is ever added.
- **Hebrew prefix bug** `Game.ts:1501`: `ל${src.he}` gives "להמכרה השחור" / "להמעיין". Seen in the week-6 flood modal. Use a helper that drops the article after ל/ב/כ ("למכרה השחור").
- **Rejection line** `world.ts:583` uses `sub().he` with its parenthesis: "פויה! יש מים בכוהל (אתנול)". Fixed by the ethanol rename above, or use a short name for rejections.
- **Transfer win text** `Game.ts:1556`: "סיווגתם זרמים חדשים" is shown even when the player tagged nothing (my run: tags star = false). Make it conditional on `stars().tags`.
- **Win modal** always prints the three-star legend "⭐ … ⭐ … ⭐" next to the real star row. Correct, but kids may read the legend as earned stars.

### What is correct (checked, no action)
Classification derives purely from particle data, matching Workbook classify-matter: one unit with one atom kind → element (incl. N₂, O₂); ≥2 atom kinds → compound; ≥2 units → homogeneous iff one uniform phase. Air → homogeneous; iron + sulfur powder → heterogeneous; salt water / sugar water / ink / vinegar → homogeneous; oversaturated or with sand/gravel → heterogeneous. Filter passes dissolved matter; dry powder on a filter stays on the paper; magnet pulls only undissolved Fe; evaporation loses all volatile liquid as vapour (can't supply water); still at 100 °C desalinates (Workbook's desalination example); funnel splits oil/water. Separation-intro's method (identify → differing property → method) and its table are mirrored by `propertyHe`. Mass is conserved (tests). Boiling points, salt/sugar solubility, densities and formulas of water, salt, ethanol, acetic acid, the pigments and air gases are fine. The salt + sand + iron worked example and the Workbook's iron+sulfur → magnet example are used faithfully. Handoff misconceptions: "filter cleans anything" (w2 ✓), "clear = pure" (w2 salt pond, w3 sweet spring ✓, but see R2), "air / two elements together = compound" (w5 air lens, w6 powder ✓, tag-only), wrong order (w2 ✓, w4 partly, see R1), compound not separable (w6 FeS ✓ but silent, see R5).

---

## 2. Playtest log (real mouse/keyboard/touch via Playwright, `advanceTime` only)

All runs used `window.advanceTime` and real `page.mouse` / keyboard / CDP touch. Scripts: `output/review/play1.mjs`, `play2.mjs`, `play3.mjs`, `w6dbg.mjs`, `armed.mjs`, `pan.mjs`. Sim-level enumeration: `output/review/enum.test.ts`, `sim.test.ts` (run with `npx vitest run --config output/review/vitest.config.ts`). Repo tests: 67/67 pass.

| # | What I did | Observed |
|---|---|---|
| 1 | Week 1 tutorial path: tap mine → lens → wrong stamp (הומוגנית) → right stamp → drag magnet → 3 pipes → spring lens → spring→village → ▶ | Coach advanced 1→6 correctly. Wrong stamp: "החותמת החליקה… הסתכלו: …באחידות, או בגושים ושכבות?". Won at t=22.7 s; foundry 32/32, builder 48/48; 0 rejections; stars done+tidy (tags star lost to the deliberate wrong first stamp). `shots/A1-lens-mine.png`, `A7-result.png` |
| 2 | Second pipe from an outlet that already has one | Refused (port-busy). One outlet can't feed two customers. |
| 3 | Recoverable mistake: mine→foundry directly, ▶ | Foundry rejects with bubble "פויה! יש חול בברזל" (`shots/B1-rejection.png`). Space paused; clicked the pipe → inspector → "פירוק הצינור" worked; placed magnet and piped it while paused; ▶ continued and won (2 rejections → no tidy star). "לשחק שוב את השבוע" kept 4 pipes + 1 station. |
| 4 | Unconnected magnet "השאר" outlet | Mine floods at t≈52 s. Fail modal explains the stuck outlet precisely. "לתקן ולנסות שוב" → planning with network kept. |
| 5 | Restart: R mid-run, ↻ button mid-run, menu "פירוק כל הרשת", Delete on a selected station | R and ↻ reset time to 0 and keep all pipes. Delete removed the magnet + its pipes and returned it to the tray. Menu clear removed all pipes. **R on the fail/win modal does nothing** (see bugs). |
| 6 | Hints (week 2): 💡, "עוד רמז" ×2 | Cumulative 1/3 → 3/3, button shows "רמז 3/3", no 4th. Week 6: no hint button; H does nothing. ✓ |
| 7 | Week 4 correct order (magnet → tank+spring → filter → pan) | Won t=32.8 s, 0 rejections. |
| 8 | Week 4 wrong: magnet → **filter before dissolving** → tank → pan | Filter note `dry-filter`; builder rejects 46× "פויה! יש מלח בחול"; fails at dusk (110 s). Worked explanation correct (`shots/W4-wrong-filter-before-dissolve-result.png`). |
| 9 | Week 4 wrong: **no magnet** (tank → filter → pan) | Builder rejects "יש ברזל בחול"; dusk fail; explanation correct. |
| 10 | Week 4 wrong: magnet → tank → **pan before filter** | Bakery rejects "יש חול במלח"; explanation "אידוי לפני סינון…" correct. |
| 11 | Week 4: **water before magnet** (tank → magnet → filter → pan) | **Won**, 0 rejections, tidy star. See R1. |
| 12 | Week 5 still left at default 100 °C | Perfume rejects 43× "פויה! יש מים בכוהל (אתנול)"; dusk fail; explanation points to 78 °C. Fixed in place via the still inspector (🌡 78°C) → "לתקן ולנסות שוב" → won t=29.7 s. |
| 13 | Week 5: ink piped **straight to the print shop** (no chromatography) | **Won** t=28.2 s, 1 machine, 0 rejections, tidy star (`shots/W5-BYPASS-ink-direct-to-print-result.png`). See E1. |
| 14 | Week 6 transfer: intended network, event pause at t=14, piped black mine → lab after the reveal | Won t=34 s, 0 rejections, 4 machines. All 7 customers satisfied. |
| 15 | Week 6: magnet on the black mine (FeS), powder unseparated → foundry | Magnet note `nothing-magnetic`; foundry rejects "יש גופרית בברזל"; dusk fail. FeS trap works mechanically. |
| 16 | Week 6: leave the black mine unpiped | Flood at t≈39 s; modal text has the "להמכרה" prefix bug. |
| 17 | Week 4: cycle (filter residue → back into the tank) | No crash or console error; sand recirculates, builder starves, dusk fail. |
| 18 | All sources → waste pond (week 2) | Dusk fail; no win. |

Console: no JS exceptions. Each page load in headless Chromium/SwiftShader logs 8× `THREE.GLTFLoader: Couldn't load texture blob:…` (JPEG textures in `public/models/*.glb`); the Tripo models still render textured in screenshots. Plus warnings "PCFSoftShadowMap has been removed" (three r186) and GPU-stall ReadPixels (SwiftShader). Check the GLTF errors in a real browser.

---

## 3. Bypasses / bugs (repro steps)

**B1 (ERROR, = E1). Week 5 won without chromatography.** Unlock all weeks → week 5 → place only the still at its solution hex, set 78 °C → pipes `ink.out → print`, `ferment → still`, `still.distillate → perfume`, `still.remainder → village` → ▶. Won in 28 s with the tidy star. Fix in `judge` (see E1) and add a test.

**B2 (RISK, = R1). Week 4 won in an order the Workbook calls wrong.** Week 4 → tank on the magnet's hex, magnet on the tank's hex → `mine → tank`, `spring → tank`, `tank → magnet`, `magnet.magnetic → foundry`, `magnet.rest → filter`, `filter.residue → builder`, `filter.filtrate → pan`, `pan → bakery` → ▶. Won, 0 rejections.

**B3 (bug). Tapping a source to look at it leaves a pipe armed; the next tap on any node builds a pipe.** Week 1 → click the mine (lens opens; `ui.mode` = `connect`) → close the lens with ✕ → click the foundry to read its demand → a `mine → foundry` pipe appears (verified, `output/review/armed.mjs`). Players who inspect before building get an accidental impure pipe. Fix: on `closeLens()` (and on tag), `setMode({kind:'idle'})` when the armed connect came from the lens tap. Alternatively, don't arm on a source tap at all; only arm when the tap is on the outlet ring.

**B4 (bug). R does nothing while the fail or win modal is open.** `Game.ts:909`: `onKey` returns unless `screen === 'play'`, but `showFail`/`showWin` set `screen = 'result'`. The menu lists "R: הרצה מחדש". Fix: allow R/Space when `screen === 'result'` (call `restartRun`).

**B5 (minor). Several pipes into one customer are allowed.** A customer can take a correct and an incorrect stream at once and still "win"; only the tidy star is lost. Not an exploit (impure packets are rejected and don't count), so it's acceptable. Mentioned for completeness.

**Checked and not exploitable:** one outlet → several customers (refused); pipe into a source (refused); self-loop (refused); second input into a non-tank machine (refused); constant chain on every transfer stream (fails, test + enumeration); everything to waste (dusk fail); cycles (no crash). Wrong-order runs only end at dusk (~100 s after the first rejection is visible). The player can pause and fix at any time, so this is pacing, not a softlock. No modal softlock found: every modal has a working button, and Esc/Space don't trap. Removing pipes and stations works while planning, paused and running.

---

## 4. Mobile (390×844, touch)

Viewport 390×844, `isMobile`, `hasTouch`, DPR 2, input via CDP `Input.dispatchTouchEvent` (real touch events). Script `output/review/play3.mjs`, `pan.mjs`.
- Title → intro → week 1 by taps: OK. No horizontal overflow (`scrollWidth` 390). All 5 week-1 nodes on screen (`shots/M2-planning.png`).
- **Place a machine**: touch-drag from the tray card to hex (0,0) placed the magnet on the first try.
- **Draw pipes**: touch-drag from each outlet ring to the target worked for all 4 pipes. ▶ by tap → week won (stars done+tidy).
- One-finger pan and two-finger pinch move the camera.
- Tap mine → lens opens. Issues seen in `shots/M3-lens.png`: (a) world labels ("המעיין", "הכפר") draw **on top of** the lens circle; (b) the lens panel overlaps the status/coach bar ("גררו/הקישו על היעד…" peeks out), the armed pipe from B3; (c) the 3D lens view is small, and the particles sit at the bottom edge of the circle.
- Tray cards (76 px) and round buttons (40 px) are adequate touch targets. Hint/home/restart stack on the right edge doesn't overlap the tray.

---

## 5. Not verified

- Fun, engagement, and whether students learn anything. Automation can't show these.
- Real-GPU performance/FPS, real iOS Safari / Android Chrome (only Chromium device emulation was used), audio, the reduced-motion toggle, WebGL context-loss recovery, keyboard-only play beyond Space/R/H/Delete/Esc.
- The root cause of the GLTFLoader blob-texture console errors (seen only in headless SwiftShader so far).
- Visual comparison with `docs/visual-targets/` mockups (not in scope).
- Weeks 2 and 3 were checked through the sim enumeration and the repo's solution tests, not driven through the UI by me. Week-2 hints were driven.
- Learning-event logging contents (`cf.log()`) beyond the fields visible in `render_game_to_text`.
- The Hebrew nomenclature in E2 should be confirmed by a chemistry teacher (FeS isn't in the Workbook snapshots).
- The lead changed quotas in `levels.ts` during the review. All runs after ~02:00 used the new quotas; the findings didn't depend on them.

## 6. Resolution (crew lead, 2026-10-25)

| Finding | Action |
|---|---|
| E1 week 5 won without chromatography | Fixed. `judge` now measures purity against the product without the tolerated carrier (`world.ts`). Raw green ink is rejected by the print shop; tests "purity ignores the tolerated carrier" and "piping raw ink to the print shop is rejected". |
| E2 FeS name | Fixed → "ברזל גופרי" (substance + lab order). Teacher confirmation still recommended. |
| R1 week 4 water before the magnet | Fixed with Workbook's own reason (separation-lab: wet iron sinks under the water and is very hard to collect with a magnet): a magnet on a wet stream catches only half of the iron (`WET_MAGNET_CATCH`), the rest contaminates the sand → builder rejects. Station bubble "הברזל רטוב ושקוע בבוץ…", worked explanation and week-4 intro/hint updated. Magnet on the dry filter residue still works (physically valid). Test "dissolving before the magnet". |
| R2 spring = pure H₂O | Renamed to "מאגר המים המזוקקים" in weeks 1, 3, 4 and the tutorial. |
| R3 water accepts traces of dye | Drinking-water customers (village, clinic) now require 99 % purity. Test added. |
| R4 100 % ethanol | Order text changed to "אתנול מרוכז"; simplification stated in CURRICULUM.md. |
| R5 compounds can't be separated physically | New station note when a machine receives a single substance: "זו תרכובת — חומר אחד. שיטות הפרדה פיזיקליות לא מפרקות אותה" (or "זה יסוד…"). Test added. |
| R6 lens states the class | The distribution sentence is hidden on a source until it is stamped ("כמה סוגי חלקיקים? מפוזרים באחידות או בגושים? הסתכלו בעדשה."); it appears after a correct stamp. The legend still lists components and their states (the observation, not the verdict). |
| R7 chromatography as production | Stated in the machine's blurb and CURRICULUM.md (lab method for tiny amounts; a giant tower in the valley). |
| R8 chromatography halves the water | Fixed: the solvent is shared in proportion to what each band needs to keep its pigment dissolved. Test added. |
| R9 week-6 reveal gives away FeS | Reworded: "המים חשפו מכרה שחור — והמעבדה רוצה את מה שיוצא ממנו." |
| Terms | שארית→משקע, תסנין→נוזל מסונן, תזקיק→נוזל מזוקק, מצנן→מעבה, קיטור→אדים, צבען→פיגמנט, כוהל→אתנול. |
| "להמכרה השחור" | Flood explanations now quote the source name: "מהמקור «…»". |
| "בכוהל (אתנול)" | Substance name is now "אתנול". |
| Week-6 "סיווגתם" | Only said when the stamps star was earned. |
| CuSO₄ solubility | 0.2 g/g (anhydrous); creek stream lowered to stay dissolved. |
| B3 tapping a source arms a pipe | Fixed: tapping a source's body opens the lens only; pipes start from the outlet ring (drag, or tap ring then target). Closing the lens cancels any armed pipe. |
| B4 R on the result modal | R now reruns from the win/fail screen. |
| B5 extra pipes into a customer | Kept (by design: customers accept several pipes, impure packets are still rejected). |
| Mobile: labels over the lens / lens overlaps the bar | World labels, status banner and coach are hidden while the lens is open on small screens; lens panel moved under the HUD. |
| GLTFLoader "Couldn't load texture blob" in headless | Models render textured in headless and no such error appeared in the built-in (real) browser pane's console; left as a headless-only warning. |
