# Clean Flow — זרם נקי · game identity

## One line

Mini Metro meets a chemistry plant: route glass pipes of mixed-up streams across a sunlit desert valley and drop brass separation machines in the right order, so every town gets exactly the pure stuff it wants — and you can watch every particle ride the pipes.

## Core action (without setting or topic)

Real-time-with-pause **network routing and machine building**. The player draws connections from outlets to machines and customers on a 3D hex valley, places a limited set of machines, then watches discrete packets flow, split, back up or get rejected, and edits the network until it runs cleanly. Decisions: *which* machine, *in what order*, *which outlet goes where*, *what to throw away*. State that changes: packets in pipes, machine queues, source backlog gauges, customer demand meters. Failure: a source overflows (flood) or dusk arrives with orders unfilled. Recovery: the network you built stays — tweak and rerun.

This is not a courier loop, no avatar walks anything anywhere, and there is no answer-unlocks-action gate.

## First 60 seconds

1. Camera swoops over a terraced sandstone valley at morning. An iron mine (מכרה) gushes a grey-and-tan stream into a waiting glass pipe stub; a foundry chimney and a builder's yard wait across the valley. Time is paused: "plan, then open the valves".
2. Tap the mine → the **particle lens** dives into the stream: big tan sand grains and clumps of grey iron filings tumble past. Two kinds of units, in separate clumps. The player may stamp a tag: תערובת הטרוגנית ✓ (+bonus).
3. Drag the magnet drum from the tray onto a terrace. Drag a pipe mine → drum. Drag the drum's iron outlet → foundry, rest outlet → builder. ▶.
4. Particles flow; the drum spins; grey spheres jump to one pipe, tan grains to the other; the foundry meter fills with a clang and sparks. The pure spring next to the village needs **no** machine — pipe it straight in.

## Visual thesis

Desert-teal and copper. Warm sandstone terraces stepping down to a turquoise reservoir, salt flats glittering white, date palms, long low sun. Machines are chunky **brass-and-glass** apparatus — magnet drum, filter press, copper still with coil, steaming evaporation pan, chromatography tower with paper ladders — they animate constantly (spin, drip, bubble, steam). Pipes are thick clear glass tubes; inside, particles are instanced shapes coded by **shape and colour** (never colour alone): water = small rounded triad, salt = white cube, sand = tan faceted rock, iron = dark metallic spiky ball, oil = amber droplet/lozenge, sugar = pink hexagon, alcohol = lavender rod, pigments = coloured stars/diamonds.

Camera: tilted strategic three-quarter view (~50°), orbit and zoom, day→dusk light cycle across each week. Not toy-industrial, no robots, no courier avatar. Optional rigged valley engineer mascot near the control hut who cheers or facepalms.

## UI / HUD (Hebrew, RTL)

- Top right: week title (שבוע 1 · שבוע הברזל), sun-dial clock of the day.
- Top left: ▶/⏸, ×2 speed, mute, reduced motion, menu.
- Bottom: machine tray — chunky cards with machine icon, Hebrew name and count left; pipe budget meter.
- In world: floating demand meters over customers (product icon + fill), backlog gauges over sources, small outlet labels on machines (e.g. "ברזל" / "שאר"), rejection bubbles ("פויה! יש חול במלח").
- Particle lens: circular inset panel with live 3D particles, a legend of unit shapes, and the tag stamp row (יסוד / תרכובת / תערובת הומוגנית / תערובת הטרוגנית).
- Fonts: Rubik (bundled). Formulas and numbers in LTR spans: H₂O, NaCl, 78 °C.

## Sound

Glassy pipe gurgles, brass clanks, magnet hum, still bubbles, pan hiss, customer chimes on accepted deliveries, a comic "ptui" on rejections, low siren as a source backlog rises.

## Tone

Playful, confident, a bit cheeky. Mistakes are funny and visible (salt sails straight through the filter, the bakery spits out sandy salt), never a red "wrong" popup.
