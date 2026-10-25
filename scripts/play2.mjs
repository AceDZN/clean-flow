// v2 headless playthroughs with real mouse input. Usage: node scripts/play2.mjs <scenario> [--out dir] [--size WxH]
// Scenarios: shots (map + level 1 flow), campaign (solve all 14 levels via the UI), fail (a wrong run), mobile
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const scenario = args[0] ?? 'shots';
const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:5195/';
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'output/v2';
const SIZE = args.includes('--size') ? args[args.indexOf('--size') + 1].split('x').map(Number) : [1600, 900];
fs.mkdirSync(outDir, { recursive: true });

// intended solutions (socket → machine), mirrors tests/puzzles.test.ts solver results
const SOL = {
  p1: { f1: ['magnet', false] },
  p2: { f1: ['magnet', true] },
  p3: { f1: ['filter', true], i1: ['pan', false] },
  p4: { f1: ['still', false, 100] },
  p5: { f1: ['filter', true], i1: ['pan', false], f2: ['still', false, 100] },
  p6: { f1: ['funnel', true] },
  p7: { f1: ['still', false, 100] },
  p8: { f1: ['magnet', false], i1: ['tank', false], f2: ['filter', true], i2: ['pan', false] },
  p9: { f1: ['magnet', false], i1: ['tank', false], f2: ['filter', true], i2: ['pan', false] },
  p10: { f1: ['chroma', false] },
  p11: { f1: ['still', false, 78] },
  t1: { f1: ['sieve', false], i1: ['pan', false] },
  t2: { f1: ['funnel', false], f2: ['magnet', true] },
  t3: { f2: ['magnet', false] },
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(viewport = { width: SIZE[0], height: SIZE[1] }, opts = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, ...opts });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForSelector('.badge', { timeout: 90000 });
  await page.evaluate(() => window.advanceTime(16));
  await page.screenshot({ timeout: 180000 }); // the first composite in headless SwiftShader is slow
  return page;
}
const step = (page, ms) => page.evaluate((m) => window.advanceTime(m), ms);
const state = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function shot(page, name) {
  await step(page, 16);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), timeout: 120000 });
  console.log('shot', name);
}
async function drag(page, a, b) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
    await step(page, 16);
  }
  await page.mouse.up();
  await step(page, 120);
}
async function openLevel(page, i) {
  await step(page, 100);
  await page.click(`.badge[data-level="${i}"]`);
  await step(page, 400);
}
async function placeAll(page, sol) {
  const st = await state(page);
  for (const [sid, [type, flip, temp]] of Object.entries(sol)) {
    const card = st.tray.find((c) => c.type === type);
    const box = await page.locator(`.mcard[data-card="${card.card}"]`).boundingBox();
    const to = await page.evaluate((id) => window.cf.screenOfSocket(id), sid);
    await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, to);
    await step(page, 300);
    if (flip || (temp && temp !== 100)) {
      await page.mouse.click(to.x, to.y);
      await step(page, 100);
      if (flip) await page.click('#pop [data-flip]');
      if (temp && temp !== 100) await page.click(`#pop [data-temp="${temp}"]`);
      await step(page, 500);
      await page.mouse.click(10, 300); // close the popover
      await step(page, 50);
    }
  }
}
async function playRun(page) {
  await page.click('#play');
  for (let i = 0; i < 80; i++) {
    await step(page, 250);
    const s = await state(page);
    if (s.phase === 'done') break;
  }
  await step(page, 1200);
  return state(page);
}

if (scenario === 'shots') {
  const page = await open();
  await step(page, 600);
  await shot(page, 'v2-00-map');
  await openLevel(page, 0);
  await step(page, 1200);
  await shot(page, 'v2-01-level1');
  // scan the mine
  const mine = await page.evaluate(() => window.cf.screenOfNode('mine'));
  await page.mouse.click(mine.x, mine.y);
  await step(page, 700);
  await shot(page, 'v2-05-scan');
  await page.click('[data-tag="heterogeneous"]');
  await step(page, 300);
  await shot(page, 'v2-05b-scan-stamped');
  await page.click('#scan .close');
  await placeAll(page, SOL.p1);
  await shot(page, 'v2-01b-placed');
  await page.click('#play');
  await step(page, 3800);
  await shot(page, 'v2-02-flowing');
  const s = await playRun(page);
  await shot(page, 'v2-02b-win');
  console.log('p1', JSON.stringify(s.result), JSON.stringify(s.customers));
  await page.close();
}

if (scenario === 'fail') {
  const page = await open();
  await page.evaluate(() => localStorage.setItem('cleanflow.v2.progress', JSON.stringify({ p1: 3, p2: 3 })));
  await page.reload();
  await page.waitForSelector('.badge');
  await openLevel(page, 2);
  await placeAll(page, { f1: ['filter', true] }); // forgets evaporation: salt water reaches the bakery
  await page.click('#play');
  for (let i = 0; i < 40; i++) {
    await step(page, 200);
    const sad = await page.$('.order.sad');
    if (sad) break;
  }
  await step(page, 400);
  await shot(page, 'v2-03-oops-moment');
  const s = await playRun(page);
  await shot(page, 'v2-03b-oops-card');
  console.log('fail', JSON.stringify(s.result), JSON.stringify(s.customers));
  await page.close();
}

if (scenario === 'campaign') {
  const page = await open();
  const ids = Object.keys(SOL);
  for (let i = 0; i < ids.length; i++) {
    await openLevel(page, i);
    await placeAll(page, SOL[ids[i]]);
    await shot(page, `c-${ids[i]}-built`);
    const s = await playRun(page);
    console.log(ids[i], s.result?.solved ? 'SOLVED' : 'FAILED', JSON.stringify(s.customers.filter((c) => !c.happy)));
    if (!s.result?.solved) {
      await shot(page, `c-${ids[i]}-fail`);
      break;
    }
    // back to the map via the win card
    await page.click('#b-map');
    await step(page, 300);
  }
  await page.close();
}

if (scenario === 'mobile') {
  const page = await open({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await step(page, 400);
  await shot(page, 'm-00-map');
  await page.tap('.badge[data-level="0"]');
  await step(page, 800);
  await shot(page, 'm-01-level');
  await page.close();
}

console.log('errors', JSON.stringify(errors));
await browser.close();
