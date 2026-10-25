// Headless playthroughs with real mouse input (no state injection).
// Usage: node scripts/playtest.mjs <scenario> [--url http://localhost:5195/] [--out docs/captures]
// Scenarios: week1, week1-fail, lens, mobile, campaign, all
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const SOLUTIONS = JSON.parse(fs.readFileSync(new URL('../tests/solutions.json', import.meta.url), 'utf8'));

const args = process.argv.slice(2);
const scenario = args[0] ?? 'week1';
const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:5195/';
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'output/playtest';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(viewport = { width: 1600, height: 900 }, opts = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, ...opts });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForSelector('#start', { timeout: 60000 });
  return page;
}

const step = (page, ms) => page.evaluate((m) => window.advanceTime(m), ms);
const state = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const pos = (page, expr) => page.evaluate(expr);

async function shot(page, name) {
  await step(page, 16);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log('shot', name);
}

async function drag(page, a, b) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
  await page.mouse.up();
  await step(page, 50);
}

async function startWeek(page, idx = 0) {
  if (idx === 0) await page.click('#start');
  else await page.click(`.weekbtn[data-l="${idx}"]`);
  await page.click('[data-go]');
  await step(page, 2500);
}

const node = (page, id) => page.evaluate((i) => window.cf.screenOfNode(i), id);
const port = (page, id, p) => page.evaluate(([i, q]) => window.cf.screenOfPort(i, q), [id, p]);
const hex = (page, q, r) => page.evaluate(([a, b]) => window.cf.screenOfHex(a, b), [q, r]);

async function placeStation(page, type, q, r) {
  const card = await page.locator(`#tray .card[data-st="${type}"]`).boundingBox();
  const target = await hex(page, q, r);
  await drag(page, { x: card.x + card.width / 2, y: card.y + card.height / 2 }, target);
  const s = await state(page);
  return s.nodes.filter((n) => n.kind === 'station' && n.q === q && n.r === r)[0]?.id;
}

async function pipe(page, from, p, to) {
  const a = await port(page, from, p);
  const b = await node(page, to);
  await drag(page, a, b);
}

async function runUntilDone(page, maxMs = 120000) {
  for (let t = 0; t < maxMs; t += 500) {
    await step(page, 500);
    const s = await state(page);
    if (s.state === 'won' || s.state === 'failed') return s;
    if (s.state === 'paused') await page.click('#playbtn');
  }
  return state(page);
}

async function week1(page, prefix = 'w1') {
  await startWeek(page, 0);
  await shot(page, `${prefix}-00-planning`);
  const mine = await node(page, 'mine');
  await page.mouse.click(mine.x, mine.y);
  await step(page, 700);
  await page.click('[data-tag="heterogeneous"]');
  await step(page, 300);
  await shot(page, `${prefix}-01-lens-mine`);
  await page.click('#lens [data-close]');
  const m = await placeStation(page, 'magnet', 0, 0);
  if (!m) throw new Error('magnet not placed');
  await step(page, 400);
  await pipe(page, 'mine', 'out', m);
  await pipe(page, m, 'magnetic', 'foundry');
  await pipe(page, m, 'rest', 'builder');
  await pipe(page, 'spring', 'out', 'village');
  await step(page, 200);
  await shot(page, `${prefix}-02-built`);
  await page.click('#playbtn');
  await step(page, 7000);
  await shot(page, `${prefix}-03-flowing`);
  const s = await runUntilDone(page);
  await step(page, 1500);
  await shot(page, `${prefix}-04-result`);
  console.log(prefix, 'result', s.state, JSON.stringify(s.result));
  return s;
}

async function week1Fail(page) {
  await startWeek(page, 0);
  await page.click('#coach [data-skip]');
  await pipe(page, 'mine', 'out', 'foundry');
  await pipe(page, 'spring', 'out', 'village');
  await page.click('#playbtn');
  let s;
  for (let i = 0; i < 40; i++) {
    await step(page, 250);
    s = await state(page);
    const f = s.nodes.find((n) => n.id === 'foundry');
    if (f.rejected >= 1) break;
  }
  await step(page, 350);
  await shot(page, 'w1fail-01-rejection');
  s = await runUntilDone(page);
  await step(page, 1500);
  await shot(page, 'w1fail-02-result');
  console.log('fail result', s.state, JSON.stringify(s.result));
}

async function lensShot(page) {
  // week 2 salt marsh in the lens, like mockup 02
  await page.evaluate(() => localStorage.setItem('cleanflow.progress.v1', JSON.stringify({ 'w1-iron': 3, 'w2-salt': 3, 'w3-oil': 3, 'w4-classic': 3, 'w5-ink': 3 })));
  await page.reload();
  await page.waitForSelector('#start');
  await startWeek(page, 3);
  const mine = await node(page, 'mine');
  await page.mouse.click(mine.x, mine.y);
  await step(page, 700);
  await shot(page, 'w4-lens-mine');
}


async function unlockAll(page) {
  await page.evaluate(() => localStorage.setItem('cleanflow.progress.v1', JSON.stringify({ 'w1-iron': 1, 'w2-salt': 1, 'w3-oil': 1, 'w4-classic': 1, 'w5-ink': 1 })));
  await page.reload();
  await page.waitForSelector('#start');
}

/** Build a level's intended network with mouse drags, like a player. */
async function buildPlan(page, plan, ids, onlyPipes) {
  if (!onlyPipes) {
    for (const st of plan.stations ?? []) {
      const id = await placeStation(page, st.type, st.q, st.r);
      if (!id) throw new Error(`could not place ${st.type} at ${st.q},${st.r}`);
      ids[st.name] = id;
      await step(page, 400);
      if (st.temp && st.temp !== 100) {
        const c = await node(page, id);
        await page.mouse.click(c.x, c.y);
        await page.click(`[data-temp="${st.temp}"]`);
        await page.click('#inspector [data-x]');
      }
    }
  }
  const deferred = [];
  for (const [a, p, b] of plan.pipes) {
    const visible = await page.evaluate(([x, y]) => {
      const s = JSON.parse(window.render_game_to_text());
      return [x, y].every((id) => s.nodes.some((n) => n.id === id));
    }, [ids[a] ?? a, ids[b] ?? b]);
    if (!visible) {
      deferred.push([a, p, b]);
      continue;
    }
    await pipe(page, ids[a] ?? a, p, ids[b] ?? b);
  }
  return deferred;
}

async function campaign(page) {
  await unlockAll(page);
  const levels = Object.keys(SOLUTIONS);
  const results = [];
  for (let i = 0; i < levels.length; i++) {
    await page.click(`.weekbtn[data-l="${i}"]`);
    await page.click('[data-go]');
    await step(page, 2500);
    if (await page.locator('#coach [data-skip]').isVisible()) await page.click('#coach [data-skip]');
    const ids = {};
    let deferred = await buildPlan(page, SOLUTIONS[levels[i]], ids, false);
    await shot(page, `c${i + 1}-a-built`);
    await page.click('#playbtn');
    let s;
    let midShot = false;
    for (let t = 0; t < 200000; t += 500) {
      await step(page, 500);
      s = await state(page);
      if (!midShot && s.time > 14) {
        await shot(page, `c${i + 1}-b-running`);
        midShot = true;
      }
      if (s.state === 'paused' && s.pauseReason === 'event') {
        await shot(page, `c${i + 1}-event`);
        await page.click('#modal [data-x]');
        deferred = await buildPlan(page, { pipes: deferred }, ids, true);
        await page.click('#playbtn');
      }
      if (s.state === 'won' || s.state === 'failed') break;
    }
    await step(page, 1500);
    await shot(page, `c${i + 1}-c-result`);
    results.push({ level: levels[i], state: s.state, t: s.time, result: s.result });
    console.log(levels[i], s.state, s.time, JSON.stringify(s.result));
    if (s.state !== 'won') break;
    // pick a perk and move on via the title screen for a clean start
    if (i < levels.length - 1) {
      await page.click('.perk[data-perk="pipe"]');
      await page.click('[data-replay]');
      await page.click('#b-menu');
      await page.click('[data-a="title"]');
    }
  }
  return results;
}

if (scenario === 'campaign' || scenario === 'all') {
  const p = await open();
  await campaign(p);
  await p.close();
}
if (scenario === 'week1' || scenario === 'all') {
  const p = await open();
  await week1(p);
  await p.close();
}
if (scenario === 'week1-fail' || scenario === 'all') {
  const p = await open();
  await week1Fail(p);
  await p.close();
}
if (scenario === 'lens' || scenario === 'all') {
  const p = await open();
  await lensShot(p);
  await p.close();
}
if (scenario === 'mobile' || scenario === 'all') {
  const p = await open({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await startWeek(p, 0);
  await shot(p, 'mobile-00-planning');
  await p.close();
}
console.log('errors', JSON.stringify(errors));
await browser.close();
