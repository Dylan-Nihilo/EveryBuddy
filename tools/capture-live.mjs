import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const showcaseDir = path.join(projectRoot, 'showcase');

const TARGETS = [
  {
    name: 'share',
    url: `file://${path.join(showcaseDir, 'share.html')}`,
    output: path.join(showcaseDir, 'everybuddy-share.apng'),
    viewport: { width: 1080, height: 1920, deviceScaleFactor: 2 },
    frames: 18,
    delayMs: 300,
    fps: 4,
  },
  {
    name: 'homepage',
    url: `file://${path.join(showcaseDir, 'index.html')}`,
    output: path.join(showcaseDir, 'everybuddy-homepage.apng'),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    frames: 18,
    delayMs: 300,
    fps: 4,
  },
];

async function captureTarget(browser, target) {
  const framesDir = path.join(projectRoot, `.tmp-frames-${target.name}`);
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
  mkdirSync(framesDir, { recursive: true });

  console.log(`\n[${target.name}] Opening ${target.url}`);
  const page = await browser.newPage();
  await page.setViewport(target.viewport);
  await page.goto(target.url, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  console.log(`[${target.name}] Capturing ${target.frames} frames...`);
  for (let i = 0; i < target.frames; i++) {
    const framePath = path.join(framesDir, `frame-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png', fullPage: target.name === 'share' });
    await new Promise(r => setTimeout(r, target.delayMs));
  }

  await page.close();
  console.log(`[${target.name}] Assembling APNG...`);

  execFileSync('ffmpeg', [
    '-y',
    '-framerate', String(target.fps),
    '-i', path.join(framesDir, 'frame-%03d.png'),
    '-plays', '0',
    '-f', 'apng',
    target.output,
  ], { stdio: 'inherit' });

  rmSync(framesDir, { recursive: true });

  const size = statSync(target.output).size;
  console.log(`[${target.name}] Done! ${target.output} (${(size / 1024 / 1024).toFixed(1)}MB)`);
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const target of TARGETS) {
    await captureTarget(browser, target);
  }

  await browser.close();
  console.log('\nAll done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
