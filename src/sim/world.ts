// The authoritative network simulation: sources, pipes, stations, customers.
// Fixed-step and deterministic; the renderer only reads this state.
import { buildTerrain, hexDistance, hexKey, inBoard, type Hex, type Tile } from './hex';
import { CLASS_HE, EPS, add, classify, clean, dissolvedMass, mass, scale, total, undissolvedSolidMass, units, type Comp, type MatterClass } from './mixture';
import { STATIONS, runStation, type StationConfig, type StationType, type StillTemp } from './stations';
import { sub, type UnitId } from './substances';
import type { LevelSpec, NodeSpec } from './levels';

export const DT = 1 / 20;
export const PIPE_SPEED = 1.6; // tiles per second
export const PACKET_GAP = 0.55; // tiles between packets
export const IN_CAP = 2;
export const OUT_CAP = 3;
export const SRC_CAP = 5;
export const OVERFLOW_TIME = 14; // seconds of full backlog before a flood
export const TANK_CAP = 40;
export const TANK_SLICE = 20;

export type NodeKind = 'source' | 'customer' | 'waste' | 'lens' | 'station';

export interface Packet {
  id: number;
  comp: Comp;
}

export interface PipePacket extends Packet {
  pos: number;
}

export interface NodeRT {
  id: string;
  kind: NodeKind;
  he: string;
  q: number;
  r: number;
  spec?: NodeSpec;
  station?: StationType;
  cfg: StationConfig;
  visible: boolean;
  // source
  emitT: number;
  buffer: Packet[];
  overflow: number;
  // station
  inQueue: Packet[];
  vat: Comp;
  proc: { t: number; dur: number; packet: Packet } | null;
  outBuf: Record<string, Packet[]>;
  lastNote?: string;
  processed: number;
  vapor: number;
  // customer
  delivered: number;
  accepted: number;
  rejected: number;
  lastReject?: { reason: string; impurity?: UnitId };
  // tags
  tag?: MatterClass;
  tagAttempts: number;
  tagFirstCorrect?: boolean;
}

export interface PipeRT {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  length: number;
  packets: PipePacket[];
  /** last composition that entered, for the particle lens */
  lastComp?: Comp;
  delivered: number;
}

export type RunState = 'planning' | 'running' | 'paused' | 'won' | 'failed';

export type SimEvent =
  | { type: 'deliver'; node: string; accepted: boolean; comp: Comp; reason?: string; t: number }
  | { type: 'waste'; node: string; comp: Comp; t: number }
  | { type: 'processed'; node: string; station: StationType; note?: string; outputs: Record<string, Comp>; vapor: Comp; t: number }
  | { type: 'reveal'; nodes: string[]; he: string; t: number }
  | { type: 'win'; t: number }
  | { type: 'fail'; reason: 'flood' | 'dusk'; node?: string; t: number }
  | { type: 'overflowWarn'; node: string; t: number }
  | { type: 'emit'; node: string; t: number };

export type ActionResult = { ok: true; id?: string } | { ok: false; reason: string; he: string };

let PACKET_SEQ = 1;

function fail(reason: string, he: string): ActionResult {
  return { ok: false, reason, he };
}

export class World {
  level: LevelSpec;
  tiles: Map<string, Tile>;
  nodes = new Map<string, NodeRT>();
  pipes = new Map<string, PipeRT>();
  inventory: Record<StationType, number>;
  state: RunState = 'planning';
  pauseReason: 'planning' | 'user' | 'event' | null = 'planning';
  t = 0;
  speed = 1;
  firedEvents = new Set<number>();
  events: SimEvent[] = [];
  failReason?: { reason: 'flood' | 'dusk'; node?: string };
  runs = 0;
  bonus = 0;
  overflowTime = OVERFLOW_TIME;
  private seq = 1;
  private acc = 0;

  constructor(level: LevelSpec) {
    this.level = level;
    this.tiles = buildTerrain(level.terrain);
    this.inventory = { magnet: 0, filter: 0, sieve: 0, funnel: 0, tank: 0, pan: 0, still: 0, chroma: 0, ...level.inventory };
    for (const n of level.nodes) {
      this.nodes.set(n.id, this.makeNode(n.id, n.kind, n.he, n.q, n.r, n));
    }
    this.resetRun();
  }

  private makeNode(id: string, kind: NodeKind, he: string, q: number, r: number, spec?: NodeSpec, station?: StationType): NodeRT {
    const outBuf: Record<string, Packet[]> = {};
    if (station) for (const p of STATIONS[station].outputs) outBuf[p.id] = [];
    if (kind === 'source') outBuf.out = [];
    return {
      id, kind, he, q, r, spec, station, cfg: station === 'still' ? { stillTemp: 100 } : {}, visible: !spec?.hidden,
      emitT: 0, buffer: [], overflow: 0, inQueue: [], vat: {}, proc: null, outBuf, processed: 0, vapor: 0,
      delivered: 0, accepted: 0, rejected: 0, tagAttempts: 0,
    };
  }

  // ---------- queries ----------

  tileAt(h: Hex): Tile | undefined {
    return this.tiles.get(hexKey(h.q, h.r));
  }

  nodeAt(h: Hex): NodeRT | undefined {
    for (const n of this.nodes.values()) if (n.q === h.q && n.r === h.r) return n;
    return undefined;
  }

  canBuildAt(h: Hex): boolean {
    if (!inBoard(h)) return false;
    const t = this.tileAt(h);
    if (!t || t.water) return false;
    return !this.nodeAt(h);
  }

  outputsOf(n: NodeRT): string[] {
    if (n.kind === 'source') return ['out'];
    if (n.kind === 'station' && n.station) return STATIONS[n.station].outputs.map((p) => p.id);
    return [];
  }

  pipeFrom(nodeId: string, port: string): PipeRT | undefined {
    for (const p of this.pipes.values()) if (p.from === nodeId && p.fromPort === port) return p;
    return undefined;
  }

  pipesInto(nodeId: string): PipeRT[] {
    return [...this.pipes.values()].filter((p) => p.to === nodeId);
  }

  pipeUsed(): number {
    let s = 0;
    for (const p of this.pipes.values()) s += p.length;
    return s;
  }

  pipeLeft(): number {
    return this.level.pipeBudget - this.pipeUsed();
  }

  stationsUsed(): number {
    return [...this.nodes.values()].filter((n) => n.kind === 'station').length;
  }

  // ---------- build actions (allowed in any state except won) ----------

  placeStation(type: StationType, h: Hex): ActionResult {
    if (this.state === 'won') return fail('won', 'השבוע כבר הסתיים');
    if ((this.inventory[type] ?? 0) <= 0) return fail('no-stock', 'אין עוד מכונות מהסוג הזה השבוע');
    if (!this.canBuildAt(h)) return fail('blocked', 'אי אפשר לבנות כאן');
    const id = `st${this.seq++}`;
    this.nodes.set(id, this.makeNode(id, 'station', STATIONS[type].he, h.q, h.r, undefined, type));
    this.inventory[type]--;
    return { ok: true, id };
  }

  removeStation(id: string): ActionResult {
    const n = this.nodes.get(id);
    if (!n || n.kind !== 'station' || !n.station) return fail('not-station', 'זו לא מכונה');
    for (const p of [...this.pipes.values()]) if (p.from === id || p.to === id) this.pipes.delete(p.id);
    this.nodes.delete(id);
    this.inventory[n.station]++;
    return { ok: true };
  }

  moveStation(id: string, h: Hex): ActionResult {
    const n = this.nodes.get(id);
    if (!n || n.kind !== 'station') return fail('not-station', 'זו לא מכונה');
    if (!this.canBuildAt(h)) return fail('blocked', 'אי אפשר לבנות כאן');
    // pipe lengths change; check budget
    const old = { q: n.q, r: n.r };
    n.q = h.q;
    n.r = h.r;
    let used = 0;
    for (const p of this.pipes.values()) used += this.lengthOf(p.from, p.to);
    if (used > this.level.pipeBudget) {
      n.q = old.q;
      n.r = old.r;
      return fail('budget', 'אין מספיק צינור למיקום הזה');
    }
    for (const p of this.pipes.values()) p.length = this.lengthOf(p.from, p.to);
    return { ok: true };
  }

  setStillTemp(id: string, T: StillTemp): ActionResult {
    const n = this.nodes.get(id);
    if (!n || n.station !== 'still') return fail('not-still', 'זה לא מתקן זיקוק');
    n.cfg.stillTemp = T;
    return { ok: true };
  }

  lengthOf(from: string, to: string): number {
    const a = this.nodes.get(from)!;
    const b = this.nodes.get(to)!;
    return Math.max(1, hexDistance(a, b));
  }

  canConnect(from: string, port: string, to: string): ActionResult {
    const a = this.nodes.get(from);
    const b = this.nodes.get(to);
    if (!a || !b) return fail('missing', 'אין כאן כלום');
    if (!a.visible || !b.visible) return fail('hidden', 'עוד לא נפתח');
    if (from === to) return fail('self', 'צינור לא יכול לחזור לאותה מכונה');
    if (!this.outputsOf(a).includes(port)) return fail('no-port', 'אין יציאה כזו');
    if (this.pipeFrom(from, port)) return fail('port-busy', 'מהיציאה הזו כבר יוצא צינור');
    if (b.kind === 'source' || b.kind === 'lens') return fail('into-source', 'אי אפשר להזרים לתוך מקור');
    if (b.kind === 'station' && b.station && !STATIONS[b.station].multiInput && this.pipesInto(to).length >= 1)
      return fail('input-busy', 'למכונה הזו יש כבר צינור כניסה (רק למיכל ההמסה יש כמה כניסות)');
    if (this.lengthOf(from, to) > this.pipeLeft()) return fail('budget', 'נגמר הצינור — קצרו או פרקו צינור אחר');
    return { ok: true };
  }

  connect(from: string, port: string, to: string): ActionResult {
    const ok = this.canConnect(from, port, to);
    if (!ok.ok) return ok;
    const id = `p${this.seq++}`;
    this.pipes.set(id, { id, from, fromPort: port, to, length: this.lengthOf(from, to), packets: [], delivered: 0 });
    return { ok: true, id };
  }

  disconnect(pipeId: string): ActionResult {
    if (!this.pipes.delete(pipeId)) return fail('missing', 'אין צינור כזה');
    return { ok: true };
  }

  /** Stamp a class tag on a source / lens node. Wrong tags cost only the bonus. */
  tagNode(id: string, cls: MatterClass): { correct: boolean; truth: MatterClass } {
    const n = this.nodes.get(id)!;
    const truth = classify(n.spec?.packet ?? {});
    const correct = cls === truth;
    n.tagAttempts++;
    if (n.tagAttempts === 1) n.tagFirstCorrect = correct;
    if (correct) n.tag = cls;
    return { correct, truth };
  }

  // ---------- run control ----------

  /** Reset flow state but keep the player's network (Infinifactory-style retry). */
  resetRun(): void {
    this.t = 0;
    this.acc = 0;
    this.firedEvents.clear();
    this.failReason = undefined;
    this.events = [];
    for (const n of this.nodes.values()) {
      n.emitT = n.spec?.offset ?? 0;
      n.buffer = [];
      n.overflow = 0;
      n.inQueue = [];
      n.vat = {};
      n.proc = null;
      for (const k of Object.keys(n.outBuf)) n.outBuf[k] = [];
      n.processed = 0;
      n.vapor = 0;
      n.delivered = 0;
      n.accepted = 0;
      n.rejected = 0;
      n.lastReject = undefined;
      n.lastNote = undefined;
      n.visible = !n.spec?.hidden;
    }
    for (const p of this.pipes.values()) {
      p.packets = [];
      p.lastComp = undefined;
      p.delivered = 0;
    }
    this.state = 'planning';
    this.pauseReason = 'planning';
  }

  start(): void {
    if (this.state === 'planning' || this.state === 'paused') {
      if (this.state === 'planning') this.runs++;
      this.state = 'running';
      this.pauseReason = null;
    }
  }

  pause(reason: 'user' | 'event' = 'user'): void {
    if (this.state === 'running') {
      this.state = 'paused';
      this.pauseReason = reason;
    }
  }

  // ---------- simulation ----------

  /** advance by real seconds (multiplied by speed), in fixed steps */
  advance(seconds: number): void {
    if (this.state !== 'running') return;
    this.acc += seconds * this.speed;
    while (this.acc >= DT - 1e-9) {
      this.acc -= DT;
      this.step(DT);
      if (this.state !== 'running') {
        this.acc = 0;
        break;
      }
    }
  }

  step(dt: number): void {
    this.t += dt;
    // events (new sources / customers mid-week)
    this.level.events?.forEach((ev, i) => {
      if (!this.firedEvents.has(i) && this.t >= ev.at) {
        this.firedEvents.add(i);
        for (const id of ev.reveal) {
          const n = this.nodes.get(id);
          if (n) n.visible = true;
        }
        this.events.push({ type: 'reveal', nodes: ev.reveal, he: ev.he, t: this.t });
        this.pause('event');
      }
    });
    if (this.state !== 'running') return;

    for (const n of this.nodes.values()) if (n.visible && n.kind === 'source') this.stepSource(n, dt);
    for (const n of this.nodes.values()) if (n.kind === 'station') this.stepStation(n, dt);
    for (const n of this.nodes.values()) this.flushOutputs(n);
    for (const p of this.pipes.values()) this.stepPipe(p, dt);

    if (this.allQuotasMet()) {
      this.state = 'won';
      this.pauseReason = null;
      this.events.push({ type: 'win', t: this.t });
      return;
    }
    if (this.t >= this.level.dayLength) {
      this.state = 'failed';
      this.failReason = { reason: 'dusk' };
      this.events.push({ type: 'fail', reason: 'dusk', t: this.t });
    }
  }

  allQuotasMet(): boolean {
    let any = false;
    for (const n of this.nodes.values()) {
      if (n.kind !== 'customer') continue;
      any = true;
      if (n.delivered + EPS < (n.spec?.quota ?? 0)) return false;
    }
    return any;
  }

  private periodOf(n: NodeRT): number {
    let p = n.spec?.period ?? 2;
    for (const r of n.spec?.ramp ?? []) if (this.t >= r.at) p = r.period;
    return p;
  }

  private stepSource(n: NodeRT, dt: number): void {
    n.emitT -= dt;
    if (n.emitT <= 0) {
      n.emitT += this.periodOf(n);
      if (n.buffer.length < SRC_CAP) {
        n.buffer.push({ id: PACKET_SEQ++, comp: clean({ ...(n.spec?.packet ?? {}) }) });
        this.events.push({ type: 'emit', node: n.id, t: this.t });
      }
    }
    n.outBuf.out = n.buffer;
    const before = n.overflow;
    if (n.buffer.length >= SRC_CAP) n.overflow += dt / this.overflowTime;
    else n.overflow = Math.max(0, n.overflow - dt / (this.overflowTime * 2));
    if (before < 0.5 && n.overflow >= 0.5) this.events.push({ type: 'overflowWarn', node: n.id, t: this.t });
    if (n.overflow >= 1) {
      this.state = 'failed';
      this.failReason = { reason: 'flood', node: n.id };
      this.events.push({ type: 'fail', reason: 'flood', node: n.id, t: this.t });
    }
  }

  private outRoom(n: NodeRT): boolean {
    return Object.values(n.outBuf).every((b) => b.length < OUT_CAP);
  }

  private stepStation(n: NodeRT, dt: number): void {
    const type = n.station!;
    const def = STATIONS[type];
    if (n.proc) {
      n.proc.t -= dt;
      if (n.proc.t <= 0) {
        const res = runStation(type, n.proc.packet.comp, n.cfg);
        for (const [port, comp] of Object.entries(res.outputs)) {
          if (total(comp) > EPS) n.outBuf[port].push({ id: PACKET_SEQ++, comp });
        }
        n.vapor += total(res.vapor);
        n.processed++;
        n.lastNote = res.note;
        this.events.push({ type: 'processed', node: n.id, station: type, note: res.note, outputs: res.outputs, vapor: res.vapor, t: this.t });
        n.proc = null;
      }
    }
    if (n.proc || !this.outRoom(n)) return;
    if (type === 'tank') {
      const tot = total(n.vat);
      if (tot <= EPS) return;
      const feeds = this.pipesInto(n.id).length;
      const ready = allSolubleDissolved(n.vat) || feeds < 2 || tot >= TANK_CAP * 0.75;
      if (!ready) return;
      const take = Math.min(1, TANK_SLICE / tot);
      const slice = scale(n.vat, take);
      n.vat = take >= 1 ? {} : clean(subtract(n.vat, slice));
      n.proc = { t: def.procTime, dur: def.procTime, packet: { id: PACKET_SEQ++, comp: slice } };
      return;
    }
    const next = n.inQueue.shift();
    if (next) n.proc = { t: def.procTime, dur: def.procTime, packet: next };
  }

  private flushOutputs(n: NodeRT): void {
    for (const port of Object.keys(n.outBuf)) {
      const buf = n.outBuf[port];
      if (buf.length === 0) continue;
      const pipe = this.pipeFrom(n.id, port);
      if (!pipe) continue;
      const tail = pipe.packets[pipe.packets.length - 1];
      if (tail && tail.pos < PACKET_GAP) continue;
      const pk = buf.shift()!;
      pipe.packets.push({ ...pk, pos: 0 });
      pipe.lastComp = pk.comp;
    }
  }

  private canAccept(target: NodeRT, comp: Comp): boolean {
    if (target.kind === 'customer' || target.kind === 'waste') return true;
    if (target.kind !== 'station') return false;
    if (target.station === 'tank') return total(target.vat) + total(comp) <= TANK_CAP + EPS || total(target.vat) <= EPS;
    return target.inQueue.length < IN_CAP;
  }

  private stepPipe(p: PipeRT, dt: number): void {
    const target = this.nodes.get(p.to)!;
    let limit = p.length;
    for (let i = 0; i < p.packets.length; i++) {
      const pk = p.packets[i];
      pk.pos = Math.min(pk.pos + PIPE_SPEED * dt, limit);
      if (i === 0 && pk.pos >= p.length - 1e-9) {
        if (this.canAccept(target, pk.comp)) {
          p.packets.shift();
          i--;
          p.delivered++;
          this.receive(target, pk);
          limit = p.length;
          continue;
        }
      }
      limit = pk.pos - PACKET_GAP;
    }
  }

  private receive(target: NodeRT, pk: Packet): void {
    if (target.kind === 'waste') {
      target.delivered += total(pk.comp);
      this.events.push({ type: 'waste', node: target.id, comp: pk.comp, t: this.t });
      return;
    }
    if (target.kind === 'customer') {
      const verdict = judge(target.spec!, pk.comp);
      if (verdict.accepted) {
        target.delivered += verdict.credit;
        target.accepted++;
      } else {
        target.rejected++;
        target.lastReject = { reason: verdict.reason, impurity: verdict.impurity };
      }
      this.events.push({ type: 'deliver', node: target.id, accepted: verdict.accepted, comp: pk.comp, reason: verdict.accepted ? undefined : verdict.reason, t: this.t });
      return;
    }
    if (target.station === 'tank') target.vat = add(target.vat, pk.comp);
    else target.inQueue.push(pk);
  }

  // ---------- scoring ----------

  stars(): { done: boolean; tags: boolean; tidy: boolean; count: number } {
    const done = this.state === 'won';
    const taggable = [...this.nodes.values()].filter((n) => (n.kind === 'source' || n.kind === 'lens') && n.visible);
    const tags = taggable.length > 0 && taggable.every((n) => n.tagFirstCorrect === true);
    let rejected = 0;
    for (const n of this.nodes.values()) rejected += n.rejected;
    const tidy = done && rejected === 0 && this.stationsUsed() <= this.level.par.stations;
    return { done, tags, tidy, count: (done ? 1 : 0) + (done && tags ? 1 : 0) + (tidy ? 1 : 0) };
  }
}

function subtract(a: Comp, b: Comp): Comp {
  const out: Comp = { ...a };
  for (const k of Object.keys(b) as UnitId[]) out[k] = (out[k] ?? 0) - (b[k] ?? 0);
  return out;
}

export function allSolubleDissolved(c: Comp): boolean {
  for (const u of units(c)) {
    const s = sub(u);
    if (s.phase === 'solid' && s.solubility > 0 && undissolvedSolidMass(c, u) > EPS) return false;
  }
  return true;
}

export interface Verdict {
  accepted: boolean;
  credit: number;
  reason: string;
  impurity?: UnitId;
}

/**
 * Customer acceptance: purity threshold on components. `required` substances are the
 * product; `allowed` ones are tolerated carriers (e.g. water in vinegar); anything else
 * is an impurity. Every required substance must be present.
 */
export function judge(spec: NodeSpec, comp: Comp): Verdict {
  const req = spec.required ?? [];
  const allowed = spec.allowed ?? [];
  const tot = total(comp);
  let credit = 0;
  for (const u of req) credit += mass(comp, u);
  const missing = req.filter((u) => mass(comp, u) <= EPS);
  let worst: UnitId | undefined;
  let worstM = 0;
  let impure = 0;
  for (const u of units(comp)) {
    if (req.includes(u) || allowed.includes(u)) continue;
    impure += mass(comp, u);
    if (mass(comp, u) > worstM) {
      worstM = mass(comp, u);
      worst = u;
    }
  }
  const purity = spec.purity ?? 0.95;
  if (missing.length > 0 && worst) {
    return { accepted: false, credit: 0, reason: `missing:${missing.join(',')}`, impurity: worst };
  }
  if (missing.length > 0) return { accepted: false, credit: 0, reason: `missing:${missing.join(',')}` };
  if (tot > EPS && impure / tot > 1 - purity + EPS) return { accepted: false, credit: 0, reason: `impure:${worst}`, impurity: worst };
  return { accepted: true, credit, reason: 'ok' };
}

/** Hebrew sentence for a rejection, e.g. "פויה! יש חול במלח". */
export function rejectionHe(spec: NodeSpec, v: { reason: string; impurity?: UnitId }): string {
  const want = (spec.required ?? []).map((u) => sub(u).he).join(' + ');
  if (v.reason.startsWith('missing') && v.impurity) return `זה ${sub(v.impurity).he}, לא ${want}!`;
  if (v.reason.startsWith('missing')) return `איפה ה${want}?`;
  if (v.impurity) return `פויה! יש ${sub(v.impurity).he} ב${want}`;
  return 'לא מתאים';
}

export { CLASS_HE, classify, dissolvedMass };
