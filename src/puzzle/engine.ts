// Clean Flow v2 puzzle engine: a fixed pipe graph with machine sockets. Running a puzzle pushes
// one packet of every source through the graph (all packets are identical, so one is enough)
// and returns what every pipe carried and every customer's verdict. Pure, instant, testable.
import { EPS, add, mass, scale, total, undissolvedSolidMass, units, type Comp } from '../sim/mixture';
import { STATIONS, runStation, type StationType, type StillTemp } from '../sim/stations';
import { sub, type UnitId } from '../sim/substances';
import { judge, type Verdict } from '../sim/world';
import type { CustomerLook, NodeSpec, SourceLook } from '../sim/levels';

export type SocketShape = 'inline' | 'fork';

export interface PSource {
  id: string;
  kind: 'source';
  he: string;
  x: number;
  z: number;
  look: SourceLook;
  packet: Comp;
}
export interface PSocket {
  id: string;
  kind: 'socket';
  shape: SocketShape;
  x: number;
  z: number;
}
export interface PCustomer {
  id: string;
  kind: 'customer';
  he: string;
  x: number;
  z: number;
  look: CustomerLook;
  required: UnitId[];
  allowed?: UnitId[];
  purity?: number;
  wantHe: string;
}
export interface PDrain {
  id: string;
  kind: 'drain';
  he: string;
  x: number;
  z: number;
}
export type PNode = PSource | PSocket | PCustomer | PDrain;

/** fork sockets have two outlets: 'a' (upper branch on screen) and 'b' (lower) */
export type Outlet = 'out' | 'a' | 'b';

export interface PPipe {
  from: string;
  outlet: Outlet;
  to: string;
  /** optional bend points (board units) between the two ends */
  via?: [number, number][];
}

export interface Puzzle {
  id: string;
  chapter: number;
  index: number; // 1-based within the whole game
  he: string;
  subtitle: string;
  intro: string;
  nodes: PNode[];
  pipes: PPipe[];
  tray: StationType[]; // one card per entry (duplicates allowed)
  hints: string[];
  noHints?: boolean;
  newMachines: StationType[];
  tutorial?: boolean;
}

export interface Placement {
  type: StationType;
  flipped: boolean;
  temp?: StillTemp;
}
export type Placements = Record<string, Placement>;

export interface CustomerResult {
  id: string;
  deliveries: { comp: Comp; verdict: Verdict }[];
  happy: boolean;
  /** first problem, for feedback */
  problem?: { kind: 'impure' | 'missing' | 'nothing'; impurity?: UnitId; reason: string };
}

export interface RunResult {
  solved: boolean;
  /** composition carried by each pipe (index into puzzle.pipes) */
  flows: Comp[];
  customers: CustomerResult[];
  /** machine notes per socket (dry filter, nothing magnetic, wet magnet, pure compound...) */
  notes: Record<string, string>;
  /** vapour that left each socket (evaporation pan) */
  vapor: Record<string, Comp>;
  drained: Comp;
}

/** Which socket shapes a machine fits: one outlet → inline, two → fork. */
export function shapeFor(type: StationType): SocketShape {
  return STATIONS[type].outputs.length === 2 ? 'fork' : 'inline';
}

/** Which station output leaves through outlet a / b for a placed fork machine. */
export function outletPorts(p: Placement): { a: string; b: string } {
  const outs = STATIONS[p.type].outputs.map((o) => o.id);
  return p.flipped ? { a: outs[1], b: outs[0] } : { a: outs[0], b: outs[1] };
}

/** The dissolving tank brings its own water: enough to dissolve every soluble solid, plus a margin. */
export function tankWater(input: Comp): number {
  let need = 0;
  for (const u of units(input)) {
    const s = sub(u);
    if (s.phase === 'solid' && s.solubility > 0) need = Math.max(need, undissolvedSolidMass(input, u) / s.solubility);
  }
  return need > EPS ? Math.ceil(need * 1.25 + 1) : 0;
}

function topoOrder(pz: Puzzle): string[] {
  const indeg = new Map<string, number>();
  for (const n of pz.nodes) indeg.set(n.id, 0);
  for (const p of pz.pipes) indeg.set(p.to, (indeg.get(p.to) ?? 0) + 1);
  const q = pz.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const out: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(id);
    for (const p of pz.pipes) {
      if (p.from !== id) continue;
      const d = (indeg.get(p.to) ?? 0) - 1;
      indeg.set(p.to, d);
      if (d === 0) q.push(p.to);
    }
  }
  if (out.length !== pz.nodes.length) throw new Error(`puzzle ${pz.id} has a cycle`);
  return out;
}

export function runPuzzle(pz: Puzzle, placements: Placements): RunResult {
  const inbox = new Map<string, Comp>();
  const flows: Comp[] = pz.pipes.map(() => ({}));
  const notes: Record<string, string> = {};
  const vapor: Record<string, Comp> = {};
  const received = new Map<string, Comp[]>();
  let drained: Comp = {};
  const nodeById = new Map(pz.nodes.map((n) => [n.id, n]));

  const send = (from: string, outlet: Outlet, comp: Comp) => {
    pz.pipes.forEach((p, i) => {
      if (p.from !== from || p.outlet !== outlet) return;
      flows[i] = comp;
      const to = nodeById.get(p.to)!;
      if (to.kind === 'customer') {
        if (total(comp) > EPS) received.set(to.id, [...(received.get(to.id) ?? []), comp]);
      } else if (to.kind === 'drain') drained = add(drained, comp);
      else inbox.set(to.id, add(inbox.get(to.id) ?? {}, comp));
    });
  };

  for (const id of topoOrder(pz)) {
    const n = nodeById.get(id)!;
    if (n.kind === 'source') {
      send(n.id, 'out', { ...n.packet });
      continue;
    }
    if (n.kind !== 'socket') continue;
    const input = inbox.get(n.id) ?? {};
    const pl = placements[n.id];
    if (!pl) {
      // empty socket: inline is a plain pipe, a fork splits the stream evenly
      if (n.shape === 'inline') send(n.id, 'out', input);
      else {
        send(n.id, 'a', scale(input, 0.5));
        send(n.id, 'b', scale(input, 0.5));
      }
      continue;
    }
    if (total(input) <= EPS) {
      if (n.shape === 'inline') send(n.id, 'out', {});
      else {
        send(n.id, 'a', {});
        send(n.id, 'b', {});
      }
      continue;
    }
    let feed = input;
    if (pl.type === 'tank') {
      const w = tankWater(input);
      if (w > 0) feed = add(input, { water: w });
    }
    const res = runStation(pl.type, feed, { stillTemp: pl.temp ?? 100 });
    const only = units(feed);
    if (only.length === 1 && shapeFor(pl.type) === 'fork') res.note = 'pure-' + (Object.keys(sub(only[0]).atoms).length > 1 ? 'compound' : 'element');
    if (res.note) notes[n.id] = res.note;
    if (total(res.vapor) > EPS) vapor[n.id] = res.vapor;
    if (n.shape === 'inline') {
      const port = STATIONS[pl.type].outputs[0].id;
      send(n.id, 'out', res.outputs[port] ?? {});
    } else {
      const ports = outletPorts(pl);
      send(n.id, 'a', res.outputs[ports.a] ?? {});
      send(n.id, 'b', res.outputs[ports.b] ?? {});
    }
  }

  const customers: CustomerResult[] = pz.nodes
    .filter((n): n is PCustomer => n.kind === 'customer')
    .map((c) => {
      const spec = c as unknown as NodeSpec;
      const deliveries = (received.get(c.id) ?? []).map((comp) => ({ comp, verdict: judge(spec, comp) }));
      if (deliveries.length === 0) return { id: c.id, deliveries, happy: false, problem: { kind: 'nothing' as const, reason: 'nothing' } };
      const bad = deliveries.find((d) => !d.verdict.accepted);
      if (bad) {
        const kind = bad.verdict.reason.startsWith('missing') ? ('missing' as const) : ('impure' as const);
        return { id: c.id, deliveries, happy: false, problem: { kind, impurity: bad.verdict.impurity, reason: bad.verdict.reason } };
      }
      const credit = deliveries.reduce((a, d) => a + d.verdict.credit, 0);
      return credit > EPS ? { id: c.id, deliveries, happy: true } : { id: c.id, deliveries, happy: false, problem: { kind: 'nothing' as const, reason: 'nothing' } };
    });

  return { solved: customers.every((c) => c.happy), flows, customers, notes, vapor, drained };
}

/** Every legal way to put the tray's cards into the sockets (cards may stay in the tray). */
export function* allPlacements(pz: Puzzle): Generator<Placements> {
  const sockets = pz.nodes.filter((n): n is PSocket => n.kind === 'socket');
  const cards = pz.tray;
  const used = new Array(cards.length).fill(false);
  const cur: Placements = {};
  function* rec(i: number): Generator<Placements> {
    if (i === sockets.length) {
      yield { ...cur };
      return;
    }
    const s = sockets[i];
    yield* rec(i + 1); // leave empty
    const tried = new Set<StationType>();
    for (let c = 0; c < cards.length; c++) {
      if (used[c] || tried.has(cards[c]) || shapeFor(cards[c]) !== s.shape) continue;
      tried.add(cards[c]);
      used[c] = true;
      const flips = s.shape === 'fork' ? [false, true] : [false];
      const temps: (StillTemp | undefined)[] = cards[c] === 'still' ? [78, 100] : [undefined];
      for (const flipped of flips) {
        for (const temp of temps) {
          cur[s.id] = { type: cards[c], flipped, temp };
          yield* rec(i + 1);
        }
      }
      delete cur[s.id];
      used[c] = false;
    }
  }
  yield* rec(0);
}

export function solutions(pz: Puzzle): Placements[] {
  const out: Placements[] = [];
  for (const p of allPlacements(pz)) if (runPuzzle(pz, p).solved) out.push(p);
  return out;
}

export function productOf(c: PCustomer): string {
  return c.required.map((u) => sub(u).he).join(' + ');
}

export function massIn(c: Comp, u: UnitId): number {
  return mass(c, u);
}
