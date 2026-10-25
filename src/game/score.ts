// Arcade layer on top of the learning goals: points, combos, rush orders. Pure and deterministic
// (driven by sim time and sim events) so it can be unit tested. Stars stay the learning grade.

export const COMBO_WINDOW = 6; // sim seconds between pure deliveries to keep a combo alive
export const BASE_POINTS = 10;

export interface RushOrder {
  id: number;
  customer: string;
  need: number; // amount of the product to deliver inside the window
  got: number;
  start: number;
  end: number;
  state: 'live' | 'done' | 'missed';
}

export interface ScoreEvent {
  kind: 'points' | 'combo-break' | 'rush-start' | 'rush-done' | 'rush-missed';
  node?: string;
  points?: number;
  combo?: number;
  rush?: RushOrder;
}

export interface CustomerInfo {
  id: string;
  quota: number;
  /** product amount one accepted packet credits */
  perPacket: number;
}

export class ScoreKeeper {
  total = 0;
  combo = 0;
  bestCombo = 0;
  lastGood = -Infinity;
  rushes: RushOrder[] = [];
  private plan: { at: number; customer: string; need: number; window: number }[] = [];
  private seq = 1;
  rushBonus = 0;

  /**
   * Two rush orders per run, early enough to fire before a well-built week finishes. They ask for
   * roughly three packets' worth inside a short window; missing one costs nothing but the bonus.
   */
  constructor(customers: CustomerInfo[], seed = 1) {
    const list = customers.filter((c) => c.quota > 0 && c.perPacket > 0);
    if (list.length === 0) return;
    const pick = (k: number) => list[(seed * 7 + k * 3) % list.length];
    const a = pick(0);
    const b = pick(1);
    this.plan.push({ at: 9, customer: a.id, need: a.perPacket * 3, window: 12 });
    this.plan.push({ at: 19, customer: b.id, need: b.perPacket * 3, window: 12 });
  }

  /** advance sim time: start / expire rush orders */
  tick(t: number): ScoreEvent[] {
    const out: ScoreEvent[] = [];
    while (this.plan.length && t >= this.plan[0].at) {
      const p = this.plan.shift()!;
      const r: RushOrder = { id: this.seq++, customer: p.customer, need: p.need, got: 0, start: t, end: t + p.window, state: 'live' };
      this.rushes.push(r);
      out.push({ kind: 'rush-start', node: r.customer, rush: r });
    }
    for (const r of this.rushes) {
      if (r.state === 'live' && t > r.end) {
        r.state = 'missed';
        out.push({ kind: 'rush-missed', node: r.customer, rush: r });
      }
    }
    return out;
  }

  /** a delivery reached a customer (or the waste pond, which scores nothing) */
  deliver(t: number, node: string, accepted: boolean, credit: number): ScoreEvent[] {
    const out: ScoreEvent[] = [];
    if (!accepted) {
      if (this.combo > 1) out.push({ kind: 'combo-break', node, combo: this.combo });
      this.combo = 0;
      return out;
    }
    this.combo = t - this.lastGood <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastGood = t;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = Math.min(5, 1 + Math.floor((this.combo - 1) / 3));
    const pts = BASE_POINTS * mult;
    this.total += pts;
    out.push({ kind: 'points', node, points: pts, combo: this.combo });
    for (const r of this.rushes) {
      if (r.state !== 'live' || r.customer !== node) continue;
      r.got += credit;
      if (r.got + 1e-9 >= r.need) {
        r.state = 'done';
        this.rushBonus += 100;
        this.total += 100;
        out.push({ kind: 'rush-done', node, points: 100, rush: r });
      }
    }
    return out;
  }

  /** end-of-week bonus for a clean, lean network */
  finish(won: boolean, timeLeft: number, pipeLeft: number, rejected: number): { time: number; pipe: number; clean: number } {
    if (!won) return { time: 0, pipe: 0, clean: 0 };
    const b = { time: Math.round(timeLeft) * 2, pipe: pipeLeft * 5, clean: rejected === 0 ? 150 : 0 };
    this.total += b.time + b.pipe + b.clean;
    return b;
  }

  multiplier(): number {
    return Math.min(5, 1 + Math.floor((Math.max(1, this.combo) - 1) / 3));
  }
}
