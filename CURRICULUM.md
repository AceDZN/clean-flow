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

## Puzzles (v2)

The game logic for a puzzle is `src/puzzle/engine.ts` (graph + sockets) on top of the same chemistry (`src/sim/`). Tests: `tests/puzzles.test.ts`.

| # | Puzzle | Workbook modules | Skill practised | Misconception it checks | How the game shows it |
|---|---|---|---|---|---|
| 1 | ברזל וחול | [classify-matter](https://science.workbook.co.il/grade-8/chapter-3/classify-matter), [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro) | Heterogeneous solid + solid → magnetic separation; route each product | — (first contact) | Iron hops into the magnet's branch; the wrong orientation sends sand to the foundry ("זה חול, לא ברזל!") |
| 2 | מים שלא צריכים כלום | [pure-substances-intro](https://science.workbook.co.il/grade-8/chapter-3/pure-substances-intro), [classify-matter](https://science.workbook.co.il/grade-8/chapter-3/classify-matter) | A pure substance (distilled water, a compound) needs no separation | "Every stream needs a machine"; "evaporation gives you water" | An evaporation pan on the water line sends it all away as vapour — the village gets nothing |
| 3 | בוץ מלוח | [filtration-evaporation](https://science.workbook.co.il/grade-8/chapter-3/filtration-evaporation) | Filtration (משקע / נוזל מסונן), then evaporation | "A filter cleans anything"; "filtering salty water gives salt" | Filter alone → the bakery gets salty water ("פויה! יש מים במלח") |
| 4 | מים למרפאה | [filtration-evaporation](https://science.workbook.co.il/grade-8/chapter-3/filtration-evaporation), [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography) | Distillation for water from a solution | "Clear = pure"; "filtering salt water makes it drinkable" | Filter → the clinic gets salt water ("יש מלח במים") |
| 5 | יום עמוס | same | Choose between filter, pan and still for two streams | Same, combined | Wrong assignment shows the matching rejection |
| 6 | דליפה | [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro) | Immiscible liquids → separating funnel (density) | "Oil and water filter apart" | Both liquids pass the filter; the funnel's upper layer is oil |
| 7 | צלול ≠ טהור | [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography) | Sugar water is a homogeneous mixture; distillation | "It looks like water so it is water" | Empty fork → the village gets sugar water; funnel has one layer only |
| 8 | הקלאסיקה | [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro), [separation-lab](https://science.workbook.co.il/grade-8/chapter-3/separation-lab) | Salt + sand + iron: magnet → dissolve → filter → evaporate | Wrong order | Filter before dissolving: "סינון יבש" and salt in the sand |
| 9 | הסדר משנה | [separation-lab](https://science.workbook.co.il/grade-8/chapter-3/separation-lab) | Same, with an extra round socket before the magnet | Dissolving before the magnet (Workbook: wet iron sinks and is hard to collect) | "הברזל רטוב ושקוע בבוץ" — half the iron ends in the sand |
| 10 | דיו ירוק | [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography) | Chromatography: pigments travel at different speeds | "One colour = one substance" | Filter/funnel pass both pigments; the slow band is blue |
| 11 | בושם | [distillation-chromatography](https://science.workbook.co.il/grade-8/chapter-3/distillation-chromatography) | Distillation by boiling point (ethanol 78 °C vs water 100 °C) | "Boiling separates everything at any temperature" | At 100 °C the perfume shop gets water in its ethanol; at 78 °C it works |
| 12 | הנחל הכחול (transfer) | all + [compounds-vs-mixtures](https://science.workbook.co.il/grade-8/chapter-3/compounds-vs-mixtures) | New stream: copper-sulfate solution + gravel → sieve/filter → evaporate | Constant strategies | No hints; worked explanation replaced by "which property differs?" |
| 13 | רוטב ואבקה (transfer) | [mixtures-intro](https://science.workbook.co.il/grade-8/chapter-3/mixtures-intro), [separation-intro](https://science.workbook.co.il/grade-8/chapter-3/separation-intro) | Vinegar + oil → funnel; iron + sulfur → magnet | "Two elements together are a compound" | Wrong machine/orientation → rejections |
| 14 | המכרה השחור (transfer) | [compounds-vs-mixtures](https://science.workbook.co.il/grade-8/chapter-3/compounds-vs-mixtures), [physical-vs-chemical](https://science.workbook.co.il/grade-8/chapter-3/physical-vs-chemical) | Iron sulfide is a compound: no physical method splits it | "FeS is still iron + sulfur you can pull apart" | The magnet does nothing to FeS ("זו תרכובת…"); spending the only magnet there leaves the powder unsplit |

v1 (six real-time weeks on a hex valley) is retired; its network simulation (`src/sim/world.ts`, `src/sim/levels.ts`) and tests remain as chemistry regression tests.

## Simplifications (stated, not hidden)

- Separations are ideal: a filter's residue is dry, the still separates perfectly by the set temperature, a funnel takes the whole oil layer. Real lab separations are less clean.
- Distillation uses a two-position thermostat (78 °C / 100 °C). Real ethanol–water distillation gives concentrated ethanol, not pure ethanol; the perfume workshop's order says "אתנול מרוכז" and the model treats the distillate as ethanol.
- The water source is a **distilled-water reservoir** (pure H₂O, a compound), not a spring: Workbook lists tap/spring water as a mixture (water + minerals).
- A magnet on a wet slurry catches half of the iron (`WET_MAGNET_CATCH = 0.5`) — a game number for Workbook's "very hard to collect when wet".
- Drinking-water customers require 99 % purity; other customers 95 %. Purity is judged on the product without its tolerated carrier (water in ink or vinegar). In v2 a customer is happy only if **every** delivery is pure enough.
- The dissolving tank brings its own water (enough to dissolve every soluble solid, +25 %).
- An empty fork socket splits the stream evenly into both branches.
- Chromatography is a lab method for tiny amounts (Workbook); the valley's giant tower is a game device. The solvent is shared between the bands so each pigment stays dissolved.
- When a machine receives a single substance it says so: a compound cannot be separated by physical methods (electrolysis and other chemical reactions are out of scope).
- Pigment molecules are drawn generically; their formulas come from real water-soluble dyes (methylene blue, tartrazine). Pigment amounts are kept within solubility.
- Cooking oil is treated as one substance (shown as an oleic-acid-like molecule).
- Only water acts as a solvent. Chromatography sends substances with travel speed ≥ 0.5 to the "fast" band.
- Iron sulfide (ברזל גופרי, FeS) is treated as non-magnetic, as in the classic school demonstration (iron + sulfur → FeS no longer responds to a magnet). The Hebrew name is not in the saved Workbook snapshots; a teacher should confirm it.
- Copper sulfate uses the anhydrous solubility (~0.2 g per g water).

## Terms (Workbook's)

משקע (residue on the filter paper), נוזל מסונן (filtrate), נוזל מזוקק (distillate), מעבה (condenser), אדים (vapour), פיגמנט, אתנול, תערובת הומוגנית / הטרוגנית, יסוד, תרכובת.

## Learning log

Local only (`localStorage` key `cleanflow.log.v1`, nothing leaves the device): level id, action (tag, place, connect, run, reject, hint, win, fail, still-temp, lens), values, outcome, hints used, run number, and `firstUnaided` for the first decision of each kind on a level before any hint.
