# Clean Flow — זרם נקי — build handoff

Read `../COMMON.md` first. Repo `/Users/acedzn/dev/AceDZN-exp/clean-flow` → public `AceDZN/clean-flow`, port 5195 (preview 4195).

## Promise

Mini Metro meets a chemistry plant. Mixed-up streams pour out of springs, mines, the sea and factory drains; towns want pure stuff. Draw glass pipes across a 3D valley, drop separation stations in the right order, and keep everyone supplied as demand climbs and new sources appear. You can see every particle riding through the pipes, so when you get it wrong, you *see* the salt sail straight through your filter. The fun is the Mini Motorways tension of a network that's always one pipe from collapse, plus the Opus Magnum pleasure of a neat, efficient machine. You learn to classify matter and pick separation methods because that's the only way to keep the valley running.

Map evidence: Mini Metro × Infinifactory (related ✓, density 0.675) and Mini Motorways × Opus Magnum (✓, 0.680). Mid-density, not a certified gap. See IDEAS.md.

## Curriculum (Workbook grade 8, chapter 3)

- [classify-matter](https://science.workbook.co.il/grade-8/chapter-3/classify-matter), [pure-substances-intro](https://science.workbook.co.il/grade-8/chapter-3/pure-substances-intro), [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [compounds-vs-mixtures](https://science.workbook.co.il/grade-8/chapter-3/compounds-vs-mixtures)
- [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro), [filtration-evaporation](https://science.workbook.co.il/grade-8/chapter-3/filtration-evaporation), [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography), [separation-lab](https://science.workbook.co.il/grade-8/chapter-3/separation-lab)

Workbook's own method (separation-intro) is the game's spine: **1. identify the components — homogeneous or heterogeneous? 2. find the property that differs (particle size, solubility, boiling point, magnetism, density, travel speed). 3. pick the method that exploits it.** Its table: heterogeneous solid+liquid → filtration; solid+solid → magnet / sieve; liquid+liquid (immiscible) → separating funnel; homogeneous dissolved solid+liquid → evaporation/crystallization; miscible liquids → distillation; pigments → chromatography. **Only mixtures separate physically; compounds need a chemical reaction** (H₂O → electrolysis is out of scope: compounds are delivered as-is or rejected).

Misconceptions to catch: "a filter cleans anything" (dissolved salt passes); "clear = pure" (salt water, sugar water); "a compound like water is a mixture of H and O you can pull apart"; "air/two elements together = compound"; wrong order (filter before dissolving salt out of sand; evaporating before removing iron leaves iron in the salt).

## Core loop

1. **Week starts:** a valley map with 1–2 sources and 1–2 customers. Each source has an unlabelled stream.
2. **Inspect:** tap a source or pipe for the **particle lens** — a zoomed 3D view of its particles (instanced spheres, bonds as sticks) that matches authoritative data. Optionally stamp a class tag on the source (יסוד / תרכובת / תערובת הומוגנית / תערובת הטרוגנית); a correct tag unlocks a small efficiency bonus and is logged as a first unaided decision. Wrong tags cost nothing but the bonus.
3. **Build:** drag pipes on a hex/terrain grid (Mini Metro feel), drop stations from a limited weekly inventory. Each station has inputs/outputs: e.g., the filter has a filtrate (תסנין) and a residue (שארית) outlet; the still has distillate + remainder; the magnet drum has iron + rest; the evaporation pan yields crystals and loses water as vapor (shown as steam), so it can't supply water; the dissolving tank needs a water feed.
4. **Run:** particles flow continuously. Correct outputs fill customer meters; impure deliveries are visibly rejected (the bakery spits out sandy salt), mis-routed stations show their real consequence (a clogged filter backs up, a magnet drum on salt water does nothing). Backlogs build at sources; an overflowing source is the fail state. Pause any time to edit.
5. **Week ends:** Mini-Motorways-style upgrade pick (extra filter, faster still, pipe bridge, second magnet…). New sources and customers appear; the valley grows.

## Five weeks + transfer (vertical slice)

1. **Iron Week.** Iron filings + sand (heterogeneous solid+solid) → magnet; a "pure water" spring (compound) goes straight to the village — trap: a player who drops a station on it wastes it.
2. **Salt Week.** Sand + salt + water. Filter alone sends salty water on; the salt shop needs evaporation after filtering. Salt water source (homogeneous) appears; the clinic wants water from it → still, not pan.
3. **Oil Week.** Oil + water spill (immiscible) → separating funnel; a sugar-water source looks clear like the pure-water spring — the lens shows two kinds of units.
4. **Workbook's classic.** Salt + sand + iron in one stream, three customers (foundry, builder, bakery). Must be magnet → dissolve → filter → evaporate. Order mistakes are visible (iron in the salt, sand in the brine).
5. **Ink & Spirits.** Print shop wants one pigment from ink (chromatography); a perfume workshop wants alcohol from alcohol+water (distillation at 78 °C vs 100 °C; show the thermometer). An air intake source (N₂, O₂, Ar, CO₂ — homogeneous mixture of elements and a compound) appears as a lens-only classification trap; it's not a customer stream in this slice.
6. **Transfer: Flood Day.** No hints, a new valley layout and new streams never seen before (e.g., copper-sulfate-blue water + gravel, a vinegar+oil dressing, iron+sulfur powder vs an iron sulfide FeS stream that looks similar but is a compound and won't respond to the magnet). A constant strategy (same station chain on every stream) must fail.

Keep amounts within solubility; no "seawater → drinkable water" or real-world purification claims beyond Workbook's desalination example via distillation.

## Rules to keep authoritative (pure TS + tests)

- A stream = list of components (unit type, mass per tick) + a distribution flag (uniform/regions) + phase. A unit = atom composition. Class derives from data: one unit type with one atom kind → element; one unit type with ≥2 atom kinds → compound; ≥2 unit types → mixture, homogeneous iff uniform.
- Each station is a function on component lists using declared properties (magnetic, soluble, particle size vs filter, boiling point, density/immiscible, chromatography speed). Mass is conserved across all outputs, including vapor and residue.
- Customer acceptance = component purity threshold. Every authored level has a test for its intended solution, at least one wrong order, and the constant-strategy failure.

## 3D, camera, art

- Tilted strategic camera over a terraced valley diorama with orbit/zoom; smooth day → dusk cycle per week. Pipes are thick glass tubes with flowing instanced particles colour-and-shape coded (shapes too, never colour alone).
- Visual thesis: desert-teal and copper — sandstone terraces, date palms, salt flats, a blue reservoir; stations as chunky brass-and-glass machines that animate (drum spins, filter drips, still bubbles, pan steams, chromatography paper ladders). Not toy-industrial robots, no courier avatar.
- The particle lens is the hero moment: a camera dive into the pipe, particles drifting around you.
- Tripo candidates (≤ 6): the separation stations (magnet drum, filter press, still, evaporation pan, chromatography tower — can be 2–3 combined generations), a source landmark (spring/mine head), a customer building set. Optional rigged mascot: a valley engineer who reacts (cheers, facepalms) — rig with Mixamo preset if made.

## Acceptance

First 30 seconds: a stream flows, the player lenses it, drops the right station, sees particles split into two pipes and a customer meter fill. A mistake is visible and recoverable. Week 4 cannot be solved in the wrong order. The transfer week is solvable without hints by someone who learned weeks 1–5 and fails a constant strategy.
