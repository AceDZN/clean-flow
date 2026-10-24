import { LEVELS, type LevelSpec } from '../src/sim/levels';
import type { StationType, StillTemp } from '../src/sim/stations';
import { World, type SimEvent } from '../src/sim/world';

export function level(id: string): LevelSpec {
  const l = LEVELS.find((x) => x.id === id);
  if (!l) throw new Error(`no level ${id}`);
  return l;
}

/** A plan in player terms: stations to place and pipes to draw. */
export interface Plan {
  stations?: { name: string; type: StationType; q: number; r: number; temp?: StillTemp }[];
  /** [fromName, port, toName]; names are node ids or plan station names */
  pipes: [string, string, string][];
}

/** Builds the plan. Pipes touching a not-yet-revealed node are returned as deferred. */
export function build(world: World, plan: Plan, ids: Record<string, string> = {}): [string, string, string][] {
  for (const n of world.nodes.keys()) ids[n] ??= n;
  for (const s of plan.stations ?? []) {
    const res = world.placeStation(s.type, { q: s.q, r: s.r });
    if (!res.ok) throw new Error(`place ${s.name}: ${res.reason}`);
    ids[s.name] = res.id!;
    if (s.temp) world.setStillTemp(res.id!, s.temp);
  }
  const deferred: [string, string, string][] = [];
  for (const [a, port, b] of plan.pipes) {
    const res = world.connect(ids[a], port, ids[b]);
    if (!res.ok && res.reason === 'hidden') deferred.push([a, port, b]);
    else if (!res.ok) throw new Error(`pipe ${a}.${port}->${b}: ${res.reason}`);
  }
  return deferred;
}

/** Run like a player: press play, continue after each mid-week event pause. */
export function play(world: World, maxSeconds = 400, onEvent?: () => void): SimEvent[] {
  const log: SimEvent[] = [];
  world.start();
  let guard = 0;
  while (guard++ < maxSeconds * 20) {
    if (world.state === 'paused') {
      onEvent?.();
      world.start();
    }
    if (world.state !== 'running') break;
    world.advance(0.05);
    log.push(...world.events);
    world.events = [];
  }
  return log;
}

export function run(levelId: string, plan: Plan) {
  const world = new World(level(levelId));
  const ids: Record<string, string> = {};
  for (const n of world.nodes.keys()) ids[n] = n;
  let deferred = build(world, plan, ids);
  const log = play(world, 400, () => {
    // the player builds the rest when the new source appears
    deferred = build(world, { pipes: deferred }, ids);
  });
  const rejects = log.filter((e) => e.type === 'deliver' && !e.accepted) as Extract<SimEvent, { type: 'deliver' }>[];
  return { world, ids, log, rejects };
}
