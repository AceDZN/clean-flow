import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/levels';
import { classify } from '../src/sim/mixture';
import { runStation, STATIONS, type StationType } from '../src/sim/stations';
import { inBoard } from '../src/sim/hex';
import { World, judge } from '../src/sim/world';
import { run, type Plan } from './helpers';
import solutionsJson from './solutions.json';

export const SOLUTIONS = solutionsJson as unknown as Record<string, Plan>;

describe('level data is valid', () => {
  for (const L of LEVELS) {
    it(`${L.id}: nodes on land, inside the board, on distinct hexes`, () => {
      const w = new World(L);
      const seen = new Set<string>();
      for (const n of L.nodes) {
        expect(inBoard(n), `${n.id} in board`).toBe(true);
        expect(w.tileAt(n)?.water, `${n.id} on land`).toBe(false);
        const k = `${n.q},${n.r}`;
        expect(seen.has(k), `${n.id} unique`).toBe(false);
        seen.add(k);
      }
    });
  }
  it('there are five weeks and a no-hint transfer week', () => {
    expect(LEVELS.length).toBe(6);
    expect(LEVELS[5].noHints).toBe(true);
    expect(LEVELS.slice(0, 5).every((l) => l.hints.length === 3)).toBe(true);
  });
});

describe('every week is solvable by its intended network (full simulation)', () => {
  for (const L of LEVELS) {
    it(`${L.id} wins with no rejected deliveries, within budget and before dusk`, () => {
      const { world, rejects } = run(L.id, SOLUTIONS[L.id]);
      expect(world.pipeUsed()).toBeLessThanOrEqual(L.pipeBudget);
      expect(world.failReason).toBeUndefined();
      expect(world.state).toBe('won');
      expect(rejects).toEqual([]);
      expect(world.t).toBeLessThan(L.dayLength * 0.8); // comfortable margin
      expect(world.stars().tidy).toBe(true);
    });
  }
});

describe('Week 1 · Iron', () => {
  it('the spring is a compound and needs no station; the mine is a heterogeneous mixture', () => {
    const L = LEVELS[0];
    expect(classify(L.nodes.find((n) => n.id === 'spring')!.packet!)).toBe('compound');
    expect(classify(L.nodes.find((n) => n.id === 'mine')!.packet!)).toBe('heterogeneous');
  });
  it('piping the mine straight to the foundry gets rejected (sand in the iron)', () => {
    const { world, rejects } = run('w1-iron', { pipes: [['mine', 'out', 'foundry'], ['spring', 'out', 'village']] });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'foundry' && r.reason === 'impure:sand')).toBe(true);
  });
  it('a dry filter on the mine does not separate iron from sand', () => {
    const { world, rejects } = run('w1-iron', {
      stations: [{ name: 'F', type: 'filter', q: 0, r: 0 }],
      pipes: [['mine', 'out', 'F'], ['F', 'residue', 'builder'], ['F', 'filtrate', 'foundry'], ['spring', 'out', 'village']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'builder' && r.reason === 'impure:iron')).toBe(true);
  });
  it('a machine fed a single compound says it cannot be separated physically', () => {
    const { log } = run('w1-iron', {
      stations: [{ name: 'M', type: 'magnet', q: -1, r: -2 }],
      pipes: [['spring', 'out', 'M'], ['M', 'rest', 'village'], ['mine', 'out', 'builder']],
    });
    expect(log.some((e) => e.type === 'processed' && e.note === 'pure-compound')).toBe(true);
  });
  it('wasting the magnet on the spring leaves no way to split the mine', () => {
    const L = LEVELS[0];
    const w = new World(L);
    w.placeStation('magnet', { q: -1, r: -2 });
    expect(w.placeStation('magnet', { q: 0, r: 0 }).ok).toBe(false);
  });
  it('an unconnected outlet backs up and the mine floods', () => {
    const { world } = run('w1-iron', {
      stations: [{ name: 'M', type: 'magnet', q: 0, r: 0 }],
      pipes: [['mine', 'out', 'M'], ['M', 'magnetic', 'foundry'], ['spring', 'out', 'village']],
    });
    expect(world.state).toBe('failed');
    expect(world.failReason).toEqual({ reason: 'flood', node: 'mine' });
  });
});

describe('Week 2 · Salt', () => {
  it('filter alone sends salty water: the bakery rejects it', () => {
    const { rejects, world } = run('w2-salt', {
      stations: [{ name: 'F', type: 'filter', q: -1, r: 1 }, { name: 'S', type: 'still', q: -1, r: -3 }],
      pipes: [['marsh', 'out', 'F'], ['F', 'residue', 'builder'], ['F', 'filtrate', 'bakery'], ['saltpond', 'out', 'S'], ['S', 'distillate', 'clinic'], ['S', 'remainder', 'waste']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'bakery' && r.reason === 'impure:water')).toBe(true);
  });
  it('evaporating before filtering puts sand in the salt', () => {
    const { rejects } = run('w2-salt', {
      stations: [{ name: 'P', type: 'pan', q: 2, r: 0 }],
      pipes: [['marsh', 'out', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(rejects.some((r) => r.node === 'bakery' && r.reason === 'impure:sand')).toBe(true);
  });
  it('the clinic cannot get water from an evaporation pan (vapour is lost)', () => {
    const w = new World(LEVELS[1]);
    const res = runStation('pan', LEVELS[1].nodes.find((n) => n.id === 'saltpond')!.packet!);
    expect(Object.keys(res.outputs)).toEqual(['crystals']);
    expect(res.outputs.crystals).toEqual({ salt: 2 });
    expect(w.level.nodes.find((n) => n.id === 'clinic')!.required).toEqual(['water']);
  });
  it('filtering salt water does not make it drinkable', () => {
    const { rejects } = run('w2-salt', {
      stations: [{ name: 'F', type: 'filter', q: -1, r: -3 }],
      pipes: [['saltpond', 'out', 'F'], ['F', 'filtrate', 'clinic']],
    });
    expect(rejects.some((r) => r.node === 'clinic' && r.reason === 'impure:salt')).toBe(true);
  });
  it('the still remainder (salt) can also feed the bakery — an alternative valid network', () => {
    const plan = structuredClone(SOLUTIONS['w2-salt']);
    plan.pipes = plan.pipes.map((p) => (p[0] === 'S' && p[1] === 'remainder' ? ['S', 'remainder', 'bakery'] : p));
    const { world, rejects } = run('w2-salt', plan);
    expect(rejects).toEqual([]);
    expect(world.state).toBe('won');
  });
});

describe('Week 3 · Oil', () => {
  it('sugar water looks clear like the spring but the village rejects it', () => {
    const plan: Plan = {
      stations: [{ name: 'U', type: 'funnel', q: -1, r: 2 }],
      pipes: [['spill', 'out', 'U'], ['U', 'top', 'soap'], ['U', 'bottom', 'village'], ['sweet', 'out', 'village'], ['spring', 'out', 'village']],
    };
    const { rejects, world } = run('w3-oil', plan);
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'village' && r.reason === 'impure:sugar')).toBe(true);
  });
  it('a filter does not split oil from water', () => {
    const { rejects } = run('w3-oil', {
      stations: [{ name: 'F', type: 'filter', q: -1, r: 2 }],
      pipes: [['spill', 'out', 'F'], ['F', 'filtrate', 'soap']],
    });
    expect(rejects.some((r) => r.node === 'soap' && r.reason === 'impure:water')).toBe(true);
  });
});

describe('Week 4 · the classic order (magnet → dissolve → filter → evaporate)', () => {
  it('filtering before dissolving: the dry powder all stays on the paper', () => {
    const { rejects, world } = run('w4-classic', {
      stations: [
        { name: 'M', type: 'magnet', q: -3, r: 1 },
        { name: 'F', type: 'filter', q: -1, r: -1 },
        { name: 'T', type: 'tank', q: 2, r: -1 },
        { name: 'P', type: 'pan', q: 2, r: 1 },
      ],
      pipes: [['mine', 'out', 'M'], ['M', 'magnetic', 'foundry'], ['M', 'rest', 'F'], ['F', 'residue', 'builder'], ['F', 'filtrate', 'T'], ['spring', 'out', 'T'], ['T', 'out', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'builder' && r.reason === 'impure:salt')).toBe(true);
  });
  it('skipping the magnet leaves iron in the sand', () => {
    const { rejects, world } = run('w4-classic', {
      stations: [{ name: 'T', type: 'tank', q: -1, r: -1 }, { name: 'F', type: 'filter', q: 2, r: -1 }, { name: 'P', type: 'pan', q: 2, r: 1 }],
      pipes: [['mine', 'out', 'T'], ['spring', 'out', 'T'], ['T', 'out', 'F'], ['F', 'residue', 'builder'], ['F', 'filtrate', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'builder' && r.reason === 'impure:iron')).toBe(true);
  });
  it('evaporating straight away: iron and sand end up in the salt', () => {
    const { rejects } = run('w4-classic', {
      stations: [{ name: 'P', type: 'pan', q: 2, r: 1 }],
      pipes: [['mine', 'out', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(rejects.some((r) => r.node === 'bakery' && (r.reason === 'impure:sand' || r.reason === 'impure:iron'))).toBe(true);
  });
  it('forgetting the water feed: the tank cannot dissolve the salt', () => {
    const plan = structuredClone(SOLUTIONS['w4-classic']);
    plan.pipes = plan.pipes.filter((p) => p[0] !== 'spring');
    const { rejects, world } = run('w4-classic', plan);
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'builder' && r.reason === 'impure:salt')).toBe(true);
  });
  it('dissolving before the magnet: wet iron is only partly caught and ends up in the sand', () => {
    const { rejects, world } = run('w4-classic', {
      stations: [
        { name: 'T', type: 'tank', q: -3, r: 1 },
        { name: 'M', type: 'magnet', q: -1, r: -1 },
        { name: 'F', type: 'filter', q: 2, r: -1 },
        { name: 'P', type: 'pan', q: 2, r: 1 },
      ],
      pipes: [['mine', 'out', 'T'], ['spring', 'out', 'T'], ['T', 'out', 'M'], ['M', 'magnetic', 'foundry'], ['M', 'rest', 'F'], ['F', 'residue', 'builder'], ['F', 'filtrate', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'builder' && r.reason === 'impure:iron')).toBe(true);
  });
  it('a physically valid variant (magnet on the filter residue) also works — order rules come from physics, not a script', () => {
    const { world, rejects } = run('w4-classic', {
      stations: [
        { name: 'T', type: 'tank', q: -3, r: 1 },
        { name: 'F', type: 'filter', q: -1, r: -1 },
        { name: 'M', type: 'magnet', q: 2, r: -1 },
        { name: 'P', type: 'pan', q: 2, r: 1 },
      ],
      pipes: [['mine', 'out', 'T'], ['spring', 'out', 'T'], ['T', 'out', 'F'], ['F', 'residue', 'M'], ['M', 'magnetic', 'foundry'], ['M', 'rest', 'builder'], ['F', 'filtrate', 'P'], ['P', 'crystals', 'bakery']],
    });
    expect(rejects).toEqual([]);
    expect(world.state).toBe('won');
  });
});

describe('Week 5 · Ink & Spirits', () => {
  it('distilling at 100 °C sends water into the alcohol', () => {
    const plan = structuredClone(SOLUTIONS['w5-ink']);
    plan.stations![1].temp = 100;
    const { rejects, world } = run('w5-ink', plan);
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'perfume' && r.reason === 'impure:water')).toBe(true);
  });
  it('piping raw ink to the print shop is rejected (needs chromatography)', () => {
    const { rejects, world } = run('w5-ink', {
      stations: [{ name: 'S', type: 'still', q: 1, r: 3, temp: 78 }],
      pipes: [['ink', 'out', 'print'], ['ferment', 'out', 'S'], ['S', 'distillate', 'perfume'], ['S', 'remainder', 'village']],
    });
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'print' && r.reason === 'impure:pigmentYellow')).toBe(true);
  });
  it('evaporating the ink leaves both pigments together', () => {
    const { rejects } = run('w5-ink', {
      stations: [{ name: 'P', type: 'pan', q: -2, r: -2 }],
      pipes: [['ink', 'out', 'P'], ['P', 'crystals', 'print']],
    });
    expect(rejects.some((r) => r.node === 'print' && r.reason === 'impure:pigmentYellow')).toBe(true);
  });
  it('air is a homogeneous mixture of elements and a compound (lens-only)', () => {
    expect(classify(LEVELS[4].nodes.find((n) => n.id === 'air')!.packet!)).toBe('homogeneous');
  });
});

describe('Transfer · Flood Day', () => {
  const L = LEVELS[5];
  const sources = L.nodes.filter((n) => n.kind === 'source');
  const customers = L.nodes.filter((n) => n.kind === 'customer');

  it('has no hints and only streams never seen in weeks 1–5', () => {
    expect(L.hints).toEqual([]);
    const seen = new Set(LEVELS.slice(0, 5).flatMap((l) => l.nodes.filter((n) => n.packet).map((n) => JSON.stringify(Object.keys(n.packet!).sort()))));
    for (const s of sources) expect(seen.has(JSON.stringify(Object.keys(s.packet!).sort()))).toBe(false);
  });

  it('iron sulfide is a compound: the magnet does nothing to it, unlike the iron + sulfur powder', () => {
    expect(classify(L.nodes.find((n) => n.id === 'blackmine')!.packet!)).toBe('compound');
    expect(classify(L.nodes.find((n) => n.id === 'powder')!.packet!)).toBe('heterogeneous');
    expect(runStation('magnet', { ironSulfide: 8 }).outputs.magnetic).toEqual({});
  });

  /** Can any output of `chain` (applied along the main path) satisfy each customer? */
  function satisfiable(chainPerSource: (StationType | null)[][]): boolean {
    const products = [] as Record<string, number>[];
    sources.forEach((s, i) => {
      let frontier = [s.packet!];
      for (const st of chainPerSource[i]) {
        if (!st) continue;
        const next: typeof frontier = [];
        for (const c of frontier) {
          const r = runStation(st, c, { stillTemp: 100 });
          next.push(...Object.values(r.outputs).filter((o) => Object.keys(o).length));
        }
        frontier = next;
      }
      products.push(...(frontier as Record<string, number>[]));
    });
    return customers.every((cu) => products.some((p) => judge(cu, p).accepted));
  }

  it('a constant strategy (the same station chain on every stream) fails', () => {
    const types = Object.keys(STATIONS) as StationType[];
    const chains: (StationType | null)[][] = [[null], ...types.map((t) => [t]), ...types.flatMap((a) => types.map((b) => [a, b]))];
    for (const chain of chains) {
      expect(satisfiable(sources.map(() => chain)), `chain ${chain.join('→')}`).toBe(false);
    }
  });

  it('putting the magnet on the iron sulfide mine wastes it: the powder cannot be split', () => {
    const plan = structuredClone(SOLUTIONS['w6-flood']);
    plan.pipes = plan.pipes.filter((p) => !['powder', 'M', 'blackmine'].includes(p[0]));
    plan.pipes.push(['blackmine', 'out', 'M'], ['M', 'rest', 'lab'], ['powder', 'out', 'foundry']);
    const { world, rejects } = run('w6-flood', plan);
    expect(world.state).toBe('failed');
    expect(rejects.some((r) => r.node === 'foundry' && r.reason === 'impure:sulfur')).toBe(true);
  });

  it('a sieve can replace the filter for gravel, and a still can replace the pan (several valid networks)', () => {
    const plan = structuredClone(SOLUTIONS['w6-flood']);
    plan.stations![0].type = 'sieve';
    plan.stations![1].type = 'still';
    plan.pipes = plan.pipes.map((p) => {
      if (p[0] === 'F' && p[1] === 'residue') return ['F', 'coarse', 'builder'];
      if (p[0] === 'F' && p[1] === 'filtrate') return ['F', 'fine', 'P'];
      if (p[0] === 'P') return ['P', 'remainder', 'dye'];
      return p;
    });
    plan.pipes.push(['P', 'distillate', 'waste']);
    const { world, rejects } = run('w6-flood', plan);
    expect(rejects).toEqual([]);
    expect(world.state).toBe('won');
  });
});
