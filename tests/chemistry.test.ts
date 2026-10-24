import { describe, expect, it } from 'vitest';
import { classify, isUniform, total } from '../src/sim/mixture';
import { STATIONS, massOut, runStation, type StationType } from '../src/sim/stations';
import { SUBSTANCES } from '../src/sim/substances';
import { judge } from '../src/sim/world';

describe('classification derives from particle data (Workbook classify-matter)', () => {
  it('one unit type with one atom kind is an element', () => {
    expect(classify({ iron: 5 })).toBe('element');
    expect(classify({ sulfur: 1 })).toBe('element');
    expect(classify({ nitrogen: 3 })).toBe('element'); // N₂ molecules are still one element
  });
  it('one unit type with two or more atom kinds is a compound', () => {
    expect(classify({ water: 10 })).toBe('compound');
    expect(classify({ ironSulfide: 8 })).toBe('compound');
    expect(classify({ salt: 2 })).toBe('compound');
  });
  it('clear solutions are homogeneous mixtures — clear is not pure', () => {
    expect(classify({ salt: 2, water: 8 })).toBe('homogeneous');
    expect(classify({ sugar: 3, water: 7 })).toBe('homogeneous');
    expect(classify({ ethanol: 3, water: 7 })).toBe('homogeneous');
    expect(classify({ pigmentBlue: 0.3, pigmentYellow: 0.3, water: 9.4 })).toBe('homogeneous');
  });
  it('air (elements + a compound, all gases) is a homogeneous mixture, not a compound', () => {
    expect(classify({ nitrogen: 7.8, oxygen: 2.1, argon: 0.09, carbonDioxide: 0.01 })).toBe('homogeneous');
  });
  it('powders, layers and undissolved solids are heterogeneous', () => {
    expect(classify({ iron: 4, sand: 6 })).toBe('heterogeneous');
    expect(classify({ iron: 4, sulfur: 4 })).toBe('heterogeneous'); // two elements together are a mixture, not a compound
    expect(classify({ oil: 4, water: 6 })).toBe('heterogeneous');
    expect(classify({ sand: 3, salt: 2, water: 7 })).toBe('heterogeneous');
    expect(classify({ copperSulfate: 2, water: 8, gravel: 4 })).toBe('heterogeneous');
  });
  it('salt beyond its solubility stays as crystals → heterogeneous', () => {
    expect(isUniform({ salt: 2, water: 10 })).toBe(true);
    expect(isUniform({ salt: 5, water: 10 })).toBe(false); // 0.36 g per g water at 20 °C
  });
});

describe('every station conserves mass', () => {
  const samples = [
    { iron: 4, sand: 6 }, { sand: 3, salt: 2, water: 7 }, { salt: 2, water: 8 }, { oil: 4, water: 6 },
    { sugar: 3, water: 7 }, { ethanol: 3, water: 7 }, { pigmentBlue: 0.3, pigmentYellow: 0.3, water: 9.4 },
    { copperSulfate: 2, water: 8, gravel: 4 }, { iron: 4, sulfur: 4 }, { ironSulfide: 8 }, { salt: 3, sand: 4, iron: 3 },
    { oil: 4, aceticAcid: 0.5, water: 5.5 }, { salt: 5, water: 10 },
  ];
  for (const type of Object.keys(STATIONS) as StationType[]) {
    it(type, () => {
      for (const s of samples) {
        for (const stillTemp of [78, 100] as const) {
          const r = runStation(type, s, { stillTemp });
          expect(massOut(r)).toBeCloseTo(total(s), 9);
        }
      }
    });
  }
});

describe('station physics', () => {
  it('magnet pulls iron, not iron sulfide (a compound has new properties)', () => {
    const r = runStation('magnet', { iron: 4, sand: 6 });
    expect(r.outputs.magnetic).toEqual({ iron: 4 });
    expect(r.outputs.rest).toEqual({ sand: 6 });
    const fes = runStation('magnet', { ironSulfide: 8 });
    expect(fes.outputs.magnetic).toEqual({});
    expect(fes.note).toBe('nothing-magnetic');
  });
  it('magnet on salt water does nothing', () => {
    const r = runStation('magnet', { salt: 2, water: 8 });
    expect(r.outputs.magnetic).toEqual({});
    expect(r.outputs.rest).toEqual({ salt: 2, water: 8 });
  });
  it('a filter does not clean dissolved salt: salt water sails through', () => {
    const r = runStation('filter', { salt: 2, water: 8 });
    expect(r.outputs.filtrate).toEqual({ salt: 2, water: 8 });
    expect(r.outputs.residue).toEqual({});
  });
  it('filter keeps undissolved sand, passes brine', () => {
    const r = runStation('filter', { sand: 3, salt: 2, water: 7 });
    expect(r.outputs.residue).toEqual({ sand: 3 });
    expect(r.outputs.filtrate).toEqual({ salt: 2, water: 7 });
  });
  it('filtering a dry powder separates nothing', () => {
    const r = runStation('filter', { salt: 3, sand: 4 });
    expect(r.outputs.residue).toEqual({ salt: 3, sand: 4 });
    expect(r.note).toBe('dry-filter');
  });
  it('oil and water: both liquids pass a filter; a separating funnel splits the layers', () => {
    expect(runStation('filter', { oil: 4, water: 6 }).outputs.filtrate).toEqual({ oil: 4, water: 6 });
    const f = runStation('funnel', { oil: 4, aceticAcid: 0.5, water: 5.5 });
    expect(f.outputs.top).toEqual({ oil: 4 });
    expect(f.outputs.bottom).toEqual({ aceticAcid: 0.5, water: 5.5 });
  });
  it('evaporation keeps the solute and loses the water as vapour — it cannot supply water', () => {
    const r = runStation('pan', { salt: 2, water: 8 });
    expect(r.outputs.crystals).toEqual({ salt: 2 });
    expect(r.vapor).toEqual({ water: 8 });
    expect(Object.keys(r.outputs)).toEqual(['crystals']);
  });
  it('evaporating before filtering leaves sand in the salt', () => {
    expect(runStation('pan', { sand: 3, salt: 2, water: 7 }).outputs.crystals).toEqual({ sand: 3, salt: 2 });
  });
  it('distillation at 100 °C collects water from salt water', () => {
    const r = runStation('still', { salt: 2, water: 8 }, { stillTemp: 100 });
    expect(r.outputs.distillate).toEqual({ water: 8 });
    expect(r.outputs.remainder).toEqual({ salt: 2 });
  });
  it('alcohol boils at 78 °C, water at 100 °C: the thermostat decides the distillate', () => {
    expect(runStation('still', { ethanol: 3, water: 7 }, { stillTemp: 78 }).outputs.distillate).toEqual({ ethanol: 3 });
    expect(runStation('still', { ethanol: 3, water: 7 }, { stillTemp: 100 }).outputs.distillate).toEqual({ ethanol: 3, water: 7 });
    expect(runStation('still', { salt: 2, water: 8 }, { stillTemp: 78 }).note).toBe('nothing-boils');
  });
  it('chromatography separates pigments by travel speed', () => {
    const r = runStation('chroma', { pigmentBlue: 0.3, pigmentYellow: 0.3, water: 9.4 });
    expect(r.outputs.slow.pigmentBlue).toBeCloseTo(0.3);
    expect(r.outputs.slow.pigmentYellow).toBeUndefined();
    expect(r.outputs.fast.pigmentYellow).toBeCloseTo(0.3);
  });
  it('sieve keeps gravel, passes sand-size and smaller', () => {
    const r = runStation('sieve', { copperSulfate: 2, water: 8, gravel: 4 });
    expect(r.outputs.coarse).toEqual({ gravel: 4 });
    expect(r.outputs.fine).toEqual({ copperSulfate: 2, water: 8 });
  });
});

describe('customers judge purity', () => {
  const bakery = { id: 'b', kind: 'customer' as const, he: '', q: 0, r: 0, required: ['salt' as const] };
  it('bakery rejects salt water and sandy salt, accepts dry salt', () => {
    expect(judge(bakery, { salt: 2, water: 7 }).accepted).toBe(false);
    expect(judge(bakery, { salt: 2, sand: 3 }).accepted).toBe(false);
    expect(judge(bakery, { salt: 2 }).accepted).toBe(true);
  });
  it('vinegar customer accepts acetic acid in water, rejects plain water', () => {
    const pickle = { ...bakery, required: ['aceticAcid' as const], allowed: ['water' as const] };
    expect(judge(pickle, { aceticAcid: 0.5, water: 5.5 }).accepted).toBe(true);
    expect(judge(pickle, { water: 5.5 }).accepted).toBe(false);
    expect(judge(pickle, { oil: 4, aceticAcid: 0.5, water: 5.5 }).accepted).toBe(false);
  });
});

describe('substance data sanity', () => {
  it('boiling points used in the game match Workbook (water 100 °C, alcohol 78 °C)', () => {
    expect(SUBSTANCES.water.boilingPoint).toBe(100);
    expect(SUBSTANCES.ethanol.boilingPoint).toBe(78);
  });
});
