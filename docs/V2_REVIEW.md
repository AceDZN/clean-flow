# Clean Flow v2 — independent playtest review

25 Oct 2026. Reviewer played v2 on the dev server (http://localhost:5195/) through Playwright with real input only: mouse drags from `.mcard` to sockets, clicks, keyboard, and CDP touch events on mobile. All 14 levels were solved at 1600×900, mostly by reasoning from what was on screen. The solutions in `scripts/play2.mjs` were opened only afterwards, and they match. Levels 1–5 were also played at 390×844 (isMobile + hasTouch), and the map and level 1 were checked at 1024×768. Screenshots are in `output/review2/` (gitignored). The judgement is measured against the owner's v1 complaints: "barely understood what to do, weird, boring, too hard because of flow/controls".

**Verdict in one paragraph.** v2 fixes the core v1 problem. There is one verb (drag a card into a glowing socket), the board is small, and a failed run keeps your machines. The customer reactions ("זה מים, לא חול!", "איפה המים?") make results readable. Three things still cause friction. (1) Dragging gives no visual feedback: the machine does not follow the pointer. (2) The flip/output-direction rule, the one hidden rule in the game, is never taught and is hard to read. (3) The phone layout is broken in several places. The difficulty curve is mostly flat and easy: one real puzzle pair (8–9), and half the levels can be solved without understanding them, because the default orientation is already correct.

---

## (a) Top 10 issues (ranked by impact on understand / control / fun)

### 1. Control: nothing follows the pointer while dragging a machine
- **Repro:** Level 1, press on the magnet card and drag toward the hexagon socket. Hold it mid-board, or right on the socket where it should snap. The board shows nothing at the pointer. On release the machine appears in the socket. Seen in every drag screenshot: `04-drag-mid.png`, `06-drag-mid2.png`, `07-drag-near.png`, `09-ghost-snap.png`, `23-…png`, and on mobile `m03-touchdrag-mid.png`. This happened in real-time mode, in `advanceTime` mode, and with touch. The card in the tray also does not dim while you drag it. On a phone the finger covers the socket, so the player is dragging blind.
- **Caveat:** headless SwiftShader. The rest of the 3D scene animates normally in these screenshots, so this is probably real. Confirm on a real GPU.
- **Fix:** check the ghost path in `startDrag`/`pointerMove`. The free-drag plane is at y = 0.8, which may be below the plateau surface. Also look at the transparent cloned materials with `depthWrite: false`. Independently of the 3D ghost, add a 2D DOM "card ghost" that follows the finger (an `img` of the card), dim the source card, and pulse or tint the target socket when it snaps.

### 2. Understand: the "which output goes where" rule (flip) is never taught and is hard to read
- **Repro:** Level 1 is the tutorial, and its magnet's default orientation is already correct, so flipping is never needed or shown. Level 2 is the first level that needs a flip. Nothing on screen says machines have a direction until you fail. The only cue is two small teal tags (~12 px text, e.g. "נמשך למגנט / השאר") placed mid-branch, sometimes right at the junction where it is unclear which branch they belong to (p2, p8 "השאר" next to the pan). After "⇅ הפוך יציאות" only the tags swap; the 3D machine looks identical (`26-…` vs `27-l2-flipped.png`). The popover opens over the upper branch tag (`75-l11-pop.png` hides "נוזל מזוקק"), and on mobile it covers both tags (`m10`, `m15`). On mobile the two tags overlap into one unreadable pill (`m11-l2-tags.png`). Flips are needed in 7 of 14 levels (p2, p3, p5, p6, p8, p9, t2), so this is the most frequent decision in the game.
- **Fix:**
  - Make level 1's default orientation wrong, and add a second tutorial beat: "tap the drum → ⇅".
  - Show each output as a substance icon on the outlet pipe (iron ball on one branch, sand on the other) in the same icons as the order cards. Then the match is visual: the icon on the branch equals the icon on the customer.
  - Mirror or rotate the 3D model and play a "clunk" on flip.
  - Put the popover below or beside the machine, never over its outlets.
  - Lay out the mobile tags along each branch, not at the fork.

### 3. Control and understanding on phones: the layout is broken in several places
At 390×844 with touch:
- **Map** (`m01-map.png`): the map uses only the middle third of the screen. Chapter signs cover level badges 1–5, and badge "1" sits under the "פרק 5" sign. The "פרק 3" sign is cut off at the left edge. A first-time player cannot see where to start. At 1024×768 the signs still cover badges 2–5 (`t01-map-1024.png`).
- **Order cards** (`m02-l1.png`): the text is hidden (`.txt` and `.who` are `display:none`), so customers show only an icon and an empty bar. The kid has to guess that a 4-point star means iron. With 3 customers the cards also overlap each other (`m09`, `m14`).
- **Tray** (`m14-l5-built.png`): the tray is 192 px wide but needs 252 px for 3 cards. The cards are cut off at both sides and scroll horizontally inside the tray, and that scroll competes with the drag gesture. Level 8 has 4 cards.
- **Scan** (`m05-scan.png`): world labels (branch tags, source sign) render on top of the magnifier.
- **Engineer bubble**: it covers the source signs at the bottom (`m02`, `m09`).
- **Fix:**
  - Let the tray use the full width (cards ~80 px), or wrap to 2 rows.
  - Keep a short order text ("ברזל"), with one stacked row per customer.
  - On the map, hide the chapter signs on narrow screens (or put them under the path) and zoom the camera to fit the path.
  - Hide world labels while the scan is open.
  - Dock the engineer bubble at the top on portrait.

### 4. Understand: failure feedback names one customer and often not the root cause
- **Repro, level 8 wrong order** (magnet → pan → filter → tank): the card says "הקבלן: הקבלן נשאר בלי חול — לא הגיע להקבלן שום חול. בדקו לאן כל יציאה הולכת." (`65-l8-oops.png`). The real lesson is that the pan had no liquid to evaporate and the filter was dry, so nothing passed. That lesson appears only as a faint, short-lived machine bubble during the run ("אין פה נוזל שמתאדה").
- **Repro, level 14** (magnet on the black mine): "לא הגיע להמעבדה שום ברזל גופרי. בדקו לאן כל יציאה הולכת." The key idea of the level, "a magnet does nothing to a compound", appears only as a faint bubble near the palm tree (`86-t3-run.png`).
- **Repro, level 2:** the card only explains the builder. The village ("pan evaporated the water") is reduced to "ועוד 2 לקוחות לא מרוצים".
- **Repro, level 1 with an empty socket:** the explanation is a property hint ("…ועדיף כשהכול יבש"), but the actual problem is "the socket is empty, so the stream splits half and half".
- **Fix:**
  - Rank the reasons. If a machine produced a NOTE (dry filter, nothing magnetic, nothing evaporates, pure compound, empty fork), show that note first. Name and highlight that machine, and draw a red ring on it on the board.
  - Then list every unhappy customer in one short line each.
  - Keep the machine notes on screen until the result card appears, at full opacity and next to the machine.
  - Add a specific "empty socket" message.

### 5. Understand: the level goal is shown briefly, in the wrong place, and cannot be re-read
- **Repro:** on level 1 the goal text ("המכרה פולט ברזל וחול… בית היציקה רוצה ברזל, הקבלן רוצה חול") is replaced after 0.9 s by the tutorial bubble. `startLevel` → `tutorialHand` → `say()` overwrites it, and the tutorial hand loops every 4.2 s. On other levels the goal sits in the engineer's bubble at the bottom right for 6 s. That is far from where the eye goes (the centre and the tray). The bubble also covers the source sign: "מאגר המים המזוקקים" in p2 (`22-l2-4s.png`), "בריכת מי המלח" in p5 (`49-l5-start.png`), and the source in p8. At 1600 px width the p12 bubble is clipped at the right screen edge (`76-t1-start.png`). There is no way to show the goal again.
- **Fix:**
  - Show the intro as a dismissable card or banner at the top centre for the first 3–4 s. Make the tutorial wait until it is dismissed.
  - Tapping the engineer, or the level plaque, repeats it.
  - Keep the bubble inside the viewport and away from source and customer labels.

### 6. Fun: the difficulty curve is flat, and many levels solve themselves
- Levels 1, 4, 7, 10, 11 (orientation only), and t1 have the correct orientation by default. Level 4 and level 7 are the same puzzle: pick the still over the filter, default orientation works. Level 6 is "pick funnel over filter". So levels 1–7 are each a single choice from 2–3 cards.
- The only real ordering challenge is levels 8–9. After that the game gets easier again. The no-hint finale (t1 easy, t2 medium, t3 one-trick) is easier than chapter 4.
- In level 10 nothing on screen tells you which pigment is "פס איטי". The default happens to be right, so the player learns nothing; if it were wrong, it would be a 50/50 flip.
- **Fix:**
  - Make defaults wrong more often, or random per attempt, so the player has to read the tags.
  - Merge level 7 into a variant that needs a flip or has a funnel/still trap.
  - Add one more ordering puzzle in chapter 5 or 6, for example ink with sand: filter → chroma.
  - Show in the scan legend, or on the chroma tower, which pigment moves slowly.
  - Make t3 require a choice beyond "leave it empty".

### 7. Fun / pace: the flow show is 6–12 s at 1× even when the result is clear early
- **Measured run lengths:** p1 5.9 s, p5 7.5 s, p8 10.7 s, p9 12.3 s. On a failure the whole show replays every retry. The x2 button exists (it actually sets speed 2.5), but a kid will not find it before getting bored.
- **Fix:**
  - Automatically speed up on retries (2.5× after the first run).
  - Show the verdict as soon as each customer receives its first full batch: "!" or "✓" plus the speech bubble.
  - Let a tap anywhere skip to the result.

### 8. Control: tap-to-place leaves a stale selection after a wrong-shape tap
- **Repro:** level 8, tap the pan card (it highlights), then tap a Y socket. The toast says "השקע הזה מתפצל…" and the card **stays highlighted**, but `selectedCard` is already `null`. Tapping a correct round socket then does nothing except "שקע עגול: גררו לכאן…" (`91-stale-select.png`). This matters most on phones, where tap-tap is the easier method.
- **Fix:** in `canvasDown`, if `place()` fails, keep `selectedCard` (better) or call `refreshTray()`.

### 9. Hebrew text errors in the result templates (every level hits at least one)
- `לא הגיע ל${n.he}` produces "להקבלן", "להמעבדה", "להמאפייה". It should be "לקבלן", "למעבדה", and so on (drop the ה after ל).
- `${n.he} נשאר בלי` produces "המעבדה נשאר", "המאפייה נשאר". Feminine customers need "נשארה". Store a gender per customer.
- `הגיע ${impurity} במקום` produces "הגיע מים במקום חול" (`41-l3-oops.png`). It should be "הגיעו מים".
- `איפה ה${wantHe}?` produces "איפה המלח יבש?", "איפה המים טהורים?", "איפה הגבישי נחושת גופרתית?". Add a definite form per order ("המלח היבש", "המים הטהורים", "גבישי הנחושת הגופרתית").
- "פויה! יש מלח במים טהורים" contradicts itself. Use the plain substance name ("יש מלח במים").
- **Fix:** add `heDef`, `heTo`, and `gender` fields to customers and orders, and write the templates against those fields.

### 10. Understand: misleading decoys and visuals around the evaporation pan
- **Level 2:** the pan is the decoy, but it wears a red "חדש" badge, which reads as "use me". The level title "מים שלא צריכים כלום" gives the answer away instead of teaching.
- **Pan model:** it always shows a heap of white salt, even on pure water. Its output tag is "גבישים" even when the input is pure water (`29c.png`).
- **Level 3, misplaced pan:** when the sand residue reaches the pan, its note says "זו תרכובת — חומר אחד. שיטות הפרדה פיזיקליות לא מפרקות אותה" (`40-l3-run.png`). This is technically true for SiO₂ but confusing; the useful message is "אין כאן נוזל לאדות".
- **Fix:**
  - Put "חדש" only on machines that are needed, or not on decoys in a teaching level.
  - Retitle level 2 (e.g. "המים הכי נקיים").
  - Fill the pan model according to its input.
  - Prefer the "nothing evaporates" note when the input has no liquid.

---

## (b) Bug list

| # | Severity | Where | Bug | Evidence |
|---|---|---|---|---|
| B1 | High | all levels, desktop and touch | Nothing follows the pointer while dragging (no ghost, no snap preview) | `06`, `07`, `09`, `m03` |
| B2 | High | mobile 390×844 | Map: chapter signs cover badges 1–5; "פרק 3" sign cut off at the left; map uses only the middle third of the screen | `m01-map.png` |
| B3 | High | mobile | Tray clips 3+ cards (192 px visible, 252 px needed); cards half hidden and scroll inside the tray | `m14-l5-built.png` |
| B4 | High | mobile | Order cards hide their text (only an icon); 3+ cards overlap each other | `m02`, `m09`, `m14` |
| B5 | Med | mobile | Branch tags of one fork overlap into one pill | `m11-l2-tags.png` |
| B6 | Med | mobile | Branch tags and source sign render on top of the scan magnifier | `m05-scan.png` |
| B7 | Med | level 1 | Level goal (intro) replaced after 0.9 s by the tutorial bubble | code `startLevel`/`tutorialHand`, `02-l1-open.png` |
| B8 | Med | all | Tap-select card, then tap a wrong-shape socket: card stays visually selected but is deselected; the next tap does nothing | `91-stale-select.png` |
| B9 | Med | p2, p5, p8, p10, t1 | Engineer bubble covers the source sign; clipped at the right edge on t1 | `22`, `49`, `76` |
| B10 | Med | p11 (desktop), all forks on mobile | Machine popover covers the branch tags you need for flipping | `75-l11-pop.png`, `m10`, `m15` |
| B11 | Med | result card | Hebrew template errors (להקבלן / המעבדה נשאר / הגיע מים / איפה המלח יבש) | see issue 9 |
| B12 | Low | after "restart" mid-run | A leftover "😄" bubble stays above the foundry | `92-after-reset-midrun.png` |
| B13 | Low | result card fade-in | For ~0.5 s the tray cards draw on top of the result card's buttons | `14-empty-run-end.png` |
| B14 | Low | run | The "x2" button sets speed 2.5 | `render_game_to_text().run.speed` |
| B15 | Low | plaque and win card | Stars fill left→right in an RTL UI (first gold star on the left) | `20c.png` |
| B16 | Low | 1024×768 | Map signs partly cover badge numbers 2–5 | `t01-map-1024.png` |
| B17 | Low | p3 (pan misplaced) | Pan shows "זו תרכובת…" when sand arrives (should be "nothing to evaporate"); pan model always full of salt; output tag "גבישים" on pure water | `29c.png`, `40-l3-run.png` |
| B18 | Low | p5, p13 | Customer buildings overlap each other (a silo model overlaps a house in p13/p14) | `49`, `81` |

No console errors or page errors appeared during the whole session; only WebGL "GPU stall due to ReadPixels" warnings, which come from the headless screenshots. No soft-locks: going to the map mid-run, restarting mid-run, and re-entering a level all work cleanly. Space or Enter plays (a second press switches to fast), H shows a hint, R restarts, 1–6 select a card, and Esc closes the scan or popover.

## (c) What works well

- **One verb plus shape-coded sockets.** Hexagon = Y socket, circle = round socket, and the cards carry Y/● badges. A wrong-shape drop gives a clear toast ("השקע הזה מתפצל לשניים — הוא צריך מכונה עם שתי יציאות"). This is a huge improvement over v1.
- **Machine management is forgiving.** Dropping a card on an occupied socket swaps the machines (the old one returns to the tray). Dragging a placed machine moves it or returns it to the tray. "נסו שוב" keeps every machine.
- **Customer reactions are the best feedback in the game:** "זה מים, לא חול!", "זה חול, לא מלח!", "איפה המים?", the "!" and "✓" badges with filling bars, and the 😄 emote. A kid can see what went wrong without reading the result card.
- **The "missing" explanation is actionable:** "הגיע ברזל במקום חול. אולי המכונה הפוכה? הקישו עליה ו'הפכו יציאות'."
- **Science explanations for the classic misconceptions are good and short:** salt water through a filter (p4), wet magnet (p9), 78 °C vs 100 °C (p11).
- **Three-step hints** go from concept to property to exact placement, and are well written.
- **Scan** is quick and optional, shows "+⭐" on a correct stamp, explains the distribution afterwards ("2 סוגי חלקיקים, מפוזרים באחידות בכל מקום"), and a wrong stamp is gentle ("החותמת החליקה…"). It explains which star you missed and why.
- **Win card** clearly explains each star.
- **Desktop look** is close to the mockups' warm palette: floating plateau, palms, cream/brass plaque, big green ▶, and wood tray with cards.
- **Levels 8–9** are a genuinely good puzzle pair: the wrong order is possible and visibly wrong.

## (d) Per-level notes

1. **p1 ברזל וחול:** Trivial (1 card, 1 socket, default orientation correct). The tutorial hand is clear, but the goal text disappears in under 1 s and flip is not taught. An empty-socket run gives a vague explanation.
2. **p2 מים שלא צריכים כלום:** The first flip, with no prior teaching. The decoy pan has a "חדש" badge and the title spoils the answer. The bubble hides the reservoir sign. The flip feedback is good.
3. **p3 בוץ מלוח:** A good level (filter + pan, flip needed). "הגיע מים" grammar. The pan's "compound" note is confusing when sand lands in it.
4. **p4 מים למרפאה:** You only need to avoid the filter; the still's default is right. The filter-failure explanation is excellent.
5. **p5 יום עמוס:** A good combination level. Customer houses overlap; the run is 7.5 s.
6. **p6 דליפה:** Funnel plus flip; the filter decoy is obvious. Easy but fine.
7. **p7 צלול ≠ טהור:** Effectively a repeat of p4 (still, default correct). Feels like filler despite the good concept.
8. **p8 הקלאסיקה:** The best level. The wrong-order failure feedback is generic and has "להקבלן". The run is 10.7 s.
9. **p9 הסדר משנה:** Good twist (leave the first round socket empty). The wet-magnet feedback is good; the run is 12.3 s.
10. **p10 דיו ירוק:** The chroma default is correct. Nothing tells you blue = "פס איטי". The legend shows full dye formulas (heavy for grade 8).
11. **p11 בושם:** The temperature lives only in the popover, with no temperature badge on the machine. The failure text should say "הקישו על מתקן הזיקוק". The popover hides a branch tag.
12. **t1 הנחל הכחול:** The sieve is introduced in a no-hint level, but the default is correct and only one Y machine fits, so it is easy. The bubble is clipped at the right edge.
13. **t2 רוטב ואבקה:** 4 customers, crowded column of order cards; a single magnet flip. OK.
14. **t3 המכרה השחור:** Strong concept (compound + magnet). The failure feedback is generic and ungrammatical ("המעבדה נשאר", "להמעבדה"). The solution relies on "an empty fork splits 50/50", which is never shown, and half the FeS goes to the drain, which is odd.

## (e) Science and Hebrew notes (beyond issue 9)

- **Marsh distribution text** "3 סוגי חלקיקים, בגושים / בשכבות נפרדות": the salt is dissolved uniformly. Say "החול בגושים, המלח מומס במים".
- **Oil shown as C₁₈H₃₄O₂ (oleic acid):** that is a fatty acid; cooking oil is a mixture of triglycerides. Consider dropping the formula or saying "שמן (תערובת שומנים)".
- **Gravel = CaCO₃:** a simplification (gravel is rock fragments). Acceptable, but "אבן גיר" would be more honest.
- **Three different pictures of salt:** white cubes inside the water in the flow show, Na⁺/Cl⁻ spheres in the lens, and a hollow-square icon on the order card and legend. Pick one icon and reuse it on cards, legend, and branch icons.
- **p11 "אתנול מרוכז" + village water at 99 %:** acceptable phrasing. Real simple distillation does not reach pure ethanol (azeotrope), and the text doesn't claim it does.
- **Level 1 "ועדיף כשהכול יבש":** appears in a dry-only level, where it is irrelevant.

## (f) Visual comparison with the v2 mockups (what is notably weaker)

- **Pipes:** the mockups have clear glass tubes with brass couplers and visible particles inside. The build has opaque beige troughs with thin brass rings, and particles mostly ride on top. The input pipe reads well; empty branches read as roads, not pipes.
- **Sockets:** the mockup socket is a big glowing teal "+" with a dashed drag guide from the tray. The build has a hexagon with a small "<+−" glyph. The tutorial "👆" hand is OK, but there is no dashed path or glow pulse that a screenshot would catch.
- **Board:** about 40 % of each board is empty sand (the lower half). Machines and customers are small relative to the screen, especially on mobile.
- **Missing mockup touches:** "+⭐" sparkles on the customer card, motion lines on the working machine, and a machine illustration on the "כמעט!" card.
- **Map:** flat grey discs with numbers floating above them, versus raised brass badges with stars and padlocks in the mockup. Chapter signs collide with badges. The reduced-motion button uses a clock icon that reads as "timer".

## (g) Not verified

- Sound (nothing could be heard).
- Real-GPU rendering and frame rate. All screenshots are SwiftShader; B1 must be confirmed on a real GPU.
- Real touch hardware: touch was simulated with CDP `Input.dispatchTouchEvent`, so scroll-vs-drag conflicts in the mobile tray are inferred, not felt.
- Mobile levels 6–14 (only 1–5 were played on phone), tablet portrait, and landscape phones.
- Whether progress survives a reload in a fresh browser.
- Accessibility (screen reader, contrast).
- Whether real 13-year-olds find it fun. This review can only judge clarity and likely friction.

## Resolution (crew lead, 2026-10-25)

| Issue | Fix |
|---|---|
| 1 No drag feedback | Root cause: the ghost's cloned material was assigned as an array to single-material meshes, so it rendered nothing. Fixed; plus a 2D card copy follows the finger and glows when it will snap, and the target socket's ring grows. |
| 2 Flip never taught | Level 1 now starts with the magnet facing the wrong way (foundry on the lower branch). Goal banner steps: drag → "look at the pipe tags: 'נמשך למגנט' goes to the builder — tap the drum → ⇅" → play. Placed machines rotate 180° when flipped; branch tags are bigger and sit further down each branch. 8 of 14 levels now need a flip. |
| 3 Phone layout | Tray centred with real width (the absolute `left:50%` shrink-to-fit bug); order cards become a row under the goal banner in building order; chapter banners hidden on phones; world labels hidden while scanning. |
| 4 Failure card | Leads with the machine that did nothing useful ("🔧 מסנן: סינון יבש…", magnet on a compound, wet magnet…) and rings that socket red; lists every unhappy customer. |
| 5 Goal lost | Persistent goal banner top-centre (tap to expand/collapse); the tutorial adds lines to it instead of replacing it; the mascot bubble no longer carries the intro. |
| 6 Flat curve | Level 7 now has a round socket before the fork with an evaporation-pan decoy and needs a flip; transfer level 12 adds sand to the gravel stream so the sieve must come before the filter; scan legend shows each substance's property (magnetic, dissolves, boils at…, lighter than water, travels fast/slow on paper) so level 10/11 are reasoned, not guessed. |
| 7 Long show | Stages shortened (1.3 s), retries auto-play at ×2. |
| 8 Stale tap selection | The selected card stays selected when a socket refuses it. |
| 9 Hebrew templates | Customer lines no longer glue ל/ב to names with ה; neutral plural wording ("קיבלו … במקום …", "לא קיבלו …", "חסר לי: …"); headlines use the substance name ("פויה! יש מלח במים"). |
| 10 Evaporation pan | No "חדש" badge on the level-2 decoy, neutral level-2 title ("שני מקורות"); the pure-substance note now only appears on two-outlet separators, so a pan fed sand says "אין פה נוזל שמתאדה". |
| Minor | Bubbles cleared on retry; ×2 = 2; stars fill right-to-left; locked map badges dull brass; empty-fork 50/50 rule explained when tapping a socket and in the failure card; oil no longer labelled with an oleic-acid formula; distribution text names what is dissolved / in clumps / in a separate layer. |
| Not changed | Customer buildings share the workshop model (tinted + props); pan model always shows salt; salt is drawn as cubes in pipes and ions in the scan (dissolved) — intentional. |
