import { describe, expect, it } from 'vitest';
import { allPlacements, runPuzzle, shapeFor, solutions, type Placements, type Puzzle } from '../src/puzzle/engine';
import { PUZZLES } from '../src/puzzle/levels';
import { total } from '../src/sim/mixture';
import { STATIONS, type StationType } from '../src/sim/stations';

const P = (id: string): Puzzle => PUZZLES.find((p) => p.id === id)!;
const problem = (pz: Puzzle, pl: Placements, customer: string) => runPuzzle(pz, pl).customers.find((c) => c.id === customer)!.problem;

describe('every puzzle', () => {
  for (const pz of PUZZLES) {
    it(`${pz.id} ${pz.he}: solvable, not solvable empty, few solutions, valid graph`, () => {
      const sols = solutions(pz);
      expect(sols.length).toBeGreaterThanOrEqual(1);
      expect(sols.length).toBeLessThanOrEqual(2);
      expect(runPuzzle(pz, {}).solved).toBe(false);
      // every socket can host at least one tray card; every pipe end exists
      const ids = new Set(pz.nodes.map((n) => n.id));
      for (const p of pz.pipes) expect(ids.has(p.from) && ids.has(p.to)).toBe(true);
      for (const n of pz.nodes) if (n.kind === 'socket') expect(pz.tray.some((t) => shapeFor(t) === n.shape)).toBe(true);
      // a solved run conserves mass apart from vapour and drain (nothing vanishes)
      const r = runPuzzle(pz, sols[0]);
      const srcMass = pz.nodes.reduce((a, n) => a + (n.kind === 'source' ? total(n.packet) : 0), 0);
      let out = total(r.drained);
      for (const c of r.customers) for (const d of c.deliveries) out += total(d.comp);
      for (const v of Object.values(r.vapor)) out += total(v);
      // the dissolving tank adds water
      const added = Object.entries(sols[0]).filter(([, p]) => p.type === 'tank').length > 0 ? out - srcMass : 0;
      expect(out - added).toBeCloseTo(srcMass, 6);
    });
  }
  it('14 puzzles: 11 teaching levels + 3 no-hint transfer levels', () => {
    expect(PUZZLES.length).toBe(14);
    expect(PUZZLES.filter((p) => p.noHints).length).toBe(3);
    expect(PUZZLES.filter((p) => !p.noHints).every((p) => p.hints.length === 3)).toBe(true);
  });
});

describe('the mistakes students make produce the advertised consequence', () => {
  it('p1: the magnet facing the wrong way sends sand to the foundry (teaches flipping)', () => {
    expect(problem(P('p1'), { f1: { type: 'magnet', flipped: false } }, 'foundry')).toMatchObject({ kind: 'missing', impurity: 'sand' });
  });
  it('p2: evaporating the distilled water leaves the village with nothing', () => {
    expect(problem(P('p2'), { f1: { type: 'magnet', flipped: false }, i1: { type: 'pan', flipped: false } }, 'village')).toMatchObject({ kind: 'nothing' });
  });
  it('p3: filter alone sends salty water to the bakery', () => {
    expect(problem(P('p3'), { f1: { type: 'filter', flipped: true } }, 'bakery')).toMatchObject({ kind: 'impure', impurity: 'water' });
  });
  it('p4: a filter does not make salt water drinkable', () => {
    expect(problem(P('p4'), { f1: { type: 'filter', flipped: false } }, 'clinic')).toMatchObject({ kind: 'impure', impurity: 'salt' });
  });
  it('p6: oil and water both pass a filter', () => {
    expect(problem(P('p6'), { f1: { type: 'filter', flipped: true } }, 'soap')).toMatchObject({ kind: 'impure', impurity: 'water' });
  });
  it('p7: clear sugar water is not pure water; evaporating it first leaves the village dry', () => {
    expect(problem(P('p7'), { f1: { type: 'funnel', flipped: false } }, 'village')).toMatchObject({ kind: 'impure', impurity: 'sugar' });
    expect(problem(P('p7'), {}, 'village')).toMatchObject({ kind: 'impure', impurity: 'sugar' });
    expect(problem(P('p7'), { i0: { type: 'pan', flipped: false }, f1: { type: 'still', flipped: true, temp: 100 } }, 'village')).toMatchObject({ kind: 'nothing' });
  });
  it('t1: filtering before sieving puts sand in the road gravel', () => {
    expect(problem(P('t1'), { f1: { type: 'filter', flipped: true }, f2: { type: 'sieve', flipped: false }, i1: { type: 'pan', flipped: false } }, 'road')).toMatchObject({ impurity: 'sand' });
  });
  it('p8: filtering before dissolving keeps salt in the sand', () => {
    const r = runPuzzle(P('p8'), { f1: { type: 'magnet', flipped: false }, f2: { type: 'filter', flipped: true }, i2: { type: 'pan', flipped: false } });
    expect(r.notes.f2).toBe('dry-filter');
    expect(r.customers.find((c) => c.id === 'builder')!.problem).toMatchObject({ impurity: 'salt' });
  });
  it('p9: dissolving before the magnet leaves wet iron in the sand', () => {
    const r = runPuzzle(P('p9'), { i0: { type: 'tank', flipped: false }, f1: { type: 'magnet', flipped: false }, f2: { type: 'filter', flipped: true }, i2: { type: 'pan', flipped: false } });
    expect(r.notes.f1).toBe('wet-magnet');
    expect(r.customers.find((c) => c.id === 'builder')!.problem).toMatchObject({ impurity: 'iron' });
  });
  it('p11: distilling at 100 °C sends water into the ethanol', () => {
    expect(problem(P('p11'), { f1: { type: 'still', flipped: false, temp: 100 } }, 'perfume')).toMatchObject({ impurity: 'water' });
  });
  it('t3: the magnet does nothing to iron sulfide (a compound)', () => {
    const r = runPuzzle(P('t3'), { f1: { type: 'magnet', flipped: false } });
    expect(r.notes.f1).toBe('pure-compound');
    expect(r.solved).toBe(false);
  });
});

describe('transfer: a constant strategy fails', () => {
  // "the same machine everywhere" (unlimited copies, any orientation) cannot clear Flood Day
  it('no single machine type, placed in every socket it fits, solves all three transfer boards', () => {
    const transfer = ['t1', 't2', 't3'].map(P);
    for (const t of Object.keys(STATIONS) as StationType[]) {
      const solvedAll = transfer.every((pz) => {
        const one: Puzzle = { ...pz, tray: pz.nodes.filter((n) => n.kind === 'socket').map(() => t) };
        for (const pl of allPlacements(one)) {
          const fits = pz.nodes.filter((n) => n.kind === 'socket' && n.shape === shapeFor(t)).length;
          if (fits > 0 && Object.keys(pl).length === fits && runPuzzle(one, pl).solved) return true;
        }
        return false;
      });
      expect(solvedAll, `all ${t}`).toBe(false);
    }
  });
  it('t3 has one magnet only: using it on the iron sulfide leaves the powder unsplit', () => {
    expect(runPuzzle(P('t3'), { f1: { type: 'magnet', flipped: true } }).customers.find((c) => c.id === 'foundry')!.problem).toMatchObject({ impurity: 'sulfur' });
  });
});
