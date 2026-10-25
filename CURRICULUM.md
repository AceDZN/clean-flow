# Clean Flow — curriculum map

Source of truth: Workbook, science grade 8, chapter 3 (תרכובות, תערובות ושינויים בחומר). Saved snapshots are in [docs/curriculum/](docs/curriculum/). The game's spine is Workbook's three-step method from [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro):

1. **Identify the components** — one substance or several? homogeneous or heterogeneous? → the particle lens and the class stamps.
2. **Find the property that differs** — particle size, solubility, boiling point, magnetism, density, travel speed → every machine names the property it exploits.
3. **Pick the method that exploits it** — and order several methods when one is not enough → placing and wiring machines.

Only mixtures separate physically; compounds (water, iron sulfide) are delivered as they are. Electrolysis is out of scope.

## Where each rule lives

| Rule | Code | Tests |
|---|---|---|
| Classification is derived from particle data: one unit type with one atom kind → element; one unit type with ≥2 atom kinds → compound; ≥2 unit types → mixture, homogeneous only when every particle is spread in one phase | `src/sim/mixture.ts` `classify`, `isUniform` | `tests/chemistry.test.ts` |
| Dissolving uses solubility (g per g water at ~20 °C); salt beyond its solubility stays as crystals | `src/sim/mixture.ts` `dissolvedMass` | chemistry tests |
| Machines are pure functions on packets; mass is conserved (including vapour) | `src/sim/stations.ts` `runStation` | "every station conserves mass" |
| Customers accept only deliveries that are ≥95 % what they ordered (plus allowed carriers such as water in vinegar) | `src/sim/world.ts` `judge` | chemistry + level tests |
| Network flow, backlog and flooding | `src/sim/world.ts` `World` | level tests |

## Weeks

| Week | Workbook modules | Skill practised | Misconception it checks | How the game shows it |
|---|---|---|---|---|
| 1 · Iron Week | [classify-matter](https://science.workbook.co.il/grade-8/chapter-3/classify-matter), [pure-substances-intro](https://science.workbook.co.il/grade-8/chapter-3/pure-substances-intro), [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro) | Classify iron + sand (heterogeneous) and spring water (compound); magnetic separation | "Every stream needs a machine"; "a filter cleans anything" | The spring needs only a pipe; a filter on dry iron + sand keeps everything on the paper ("dry filter") and the builder spits out iron |
| 2 · Salt Week | [filtration-evaporation](https://science.workbook.co.il/grade-8/chapter-3/filtration-evaporation), [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography) | Filtration (filtrate / residue), evaporation, distillation | "Clear = pure"; "filtering salt water makes it drinkable"; "evaporation gives you water" | Salt water sails through the filter and the bakery rejects it; the pan sends the water off as steam so the clinic needs the still |
| 3 · Oil Week | [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro) | Immiscible liquids → separating funnel (density); homogeneous sugar water | "Oil and water filter apart"; "it looks like water so it is water" | Both liquids pass a filter; the village rejects clear sugar water; the lens shows two kinds of units |
| 4 · The Classic | [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro), [separation-lab](https://science.workbook.co.il/grade-8/chapter-3/separation-lab) | Workbook's salt + sand + iron: magnet → dissolve → filter → evaporate | Wrong order: filtering before dissolving, evaporating before filtering, skipping the magnet, forgetting the water | Each wrong order produces a visible rejection (salt in the sand, iron in the sand, sand and iron in the salt). Physically valid alternatives (magnet on the filter residue) also work — the order rule comes from physics, not a script |
| 5 · Ink & Spirits | [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography), [compounds-vs-mixtures](https://science.workbook.co.il/grade-8/chapter-3/compounds-vs-mixtures) | Chromatography (travel speed); distillation by boiling point (alcohol 78 °C vs water 100 °C); classifying air | "One colour = one substance"; "air is a compound / two elements together are a compound" | Evaporated ink leaves both pigments; at 100 °C the still sends water into the alcohol; the air intake is lens-only (N₂, O₂, Ar, CO₂: homogeneous mixture of elements and a compound) |
| 6 · Flood Day (transfer, no hints) | all of the above + [physical-vs-chemical](https://science.workbook.co.il/grade-8/chapter-3/physical-vs-chemical), [compounds-vs-mixtures](https://science.workbook.co.il/grade-8/chapter-3/compounds-vs-mixtures) | New streams: copper-sulfate solution + gravel, vinegar + oil dressing, iron + sulfur powder, iron sulfide | "A compound like FeS is still iron + sulfur you can pull apart"; constant strategies | The magnet does nothing to FeS; using it there leaves the iron + sulfur powder unsplit. Tests prove that no single station chain applied to every stream satisfies the customers |

## Simplifications (stated, not hidden)

- Separations are ideal: a filter's residue is dry, the still separates perfectly by the set temperature, a funnel takes the whole oil layer. Real lab separations are less clean.
- Distillation uses a two-position thermostat (78 °C / 100 °C). Real ethanol–water distillation gives a mixture rich in ethanol, not pure ethanol; Workbook presents it as separation by boiling point and the game follows that.
- The in-game spring delivers pure water (a compound) so that "a compound needs no machine" is clean; real spring water has dissolved minerals.
- Pigment molecules are drawn generically; their formulas come from real water-soluble dyes (methylene blue, tartrazine). Pigment amounts are kept within solubility.
- Cooking oil is treated as one substance (shown as an oleic-acid-like molecule).
- Only water acts as a solvent. Chromatography sends substances with travel speed ≥ 0.5 to the "fast" band.
- Iron sulfide is treated as non-magnetic, as in the classic school demonstration (iron + sulfur → FeS no longer responds to a magnet).

## Learning log

Local only (`localStorage` key `cleanflow.log.v1`, nothing leaves the device): level id, action (tag, place, connect, run, reject, hint, win, fail, still-temp, lens), values, outcome, hints used, run number, and `firstUnaided` for the first decision of each kind on a level before any hint.
