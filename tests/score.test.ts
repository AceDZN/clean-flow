import { describe, expect, it } from 'vitest';
import { ScoreKeeper } from '../src/game/score';

describe('arcade score layer', () => {
  it('pure deliveries score, combos grow the multiplier, a rejection breaks the combo', () => {
    const s = new ScoreKeeper([]);
    for (let i = 0; i < 6; i++) s.deliver(i, 'a', true, 4);
    expect(s.combo).toBe(6);
    expect(s.total).toBe(10 + 10 + 10 + 20 + 20 + 20);
    const ev = s.deliver(7, 'a', false, 0);
    expect(ev[0].kind).toBe('combo-break');
    expect(s.combo).toBe(0);
    expect(s.bestCombo).toBe(6);
  });
  it('a long gap restarts the combo', () => {
    const s = new ScoreKeeper([]);
    s.deliver(0, 'a', true, 1);
    s.deliver(1, 'a', true, 1);
    s.deliver(20, 'a', true, 1);
    expect(s.combo).toBe(1);
  });
  it('rush orders start on schedule, pay a bonus when filled, expire otherwise', () => {
    const s = new ScoreKeeper([{ id: 'foundry', quota: 32, perPacket: 4 }], 1);
    expect(s.tick(5)).toEqual([]);
    const start = s.tick(9);
    expect(start[0].kind).toBe('rush-start');
    expect(start[0].rush!.need).toBe(12);
    s.deliver(10, 'foundry', true, 4);
    s.deliver(11, 'foundry', true, 4);
    const done = s.deliver(12, 'foundry', true, 4);
    expect(done.some((e) => e.kind === 'rush-done')).toBe(true);
    expect(s.rushBonus).toBe(100);
    const second = s.tick(19);
    expect(second[0].kind).toBe('rush-start');
    expect(s.tick(40).some((e) => e.kind === 'rush-missed')).toBe(true);
  });
  it('the finish bonus rewards time left, unused pipe and zero rejections', () => {
    const s = new ScoreKeeper([]);
    expect(s.finish(true, 30.4, 4, 0)).toEqual({ time: 60, pipe: 20, clean: 150 });
    expect(s.finish(false, 30, 4, 0)).toEqual({ time: 0, pipe: 0, clean: 0 });
  });
});
