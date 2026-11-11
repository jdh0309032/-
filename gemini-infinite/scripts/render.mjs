// Frame-exact render: drives window.renderAt(t) in headless Chromium and pipes
// every frame into ffmpeg → out/gemini-infinite.mp4 (1080x1920, 60fps, H.264 + AAC).
//
//   node scripts/render.mjs                 full video
//   node scripts/render.mjs --stills 1,4,9  PNG stills only (out/still-<t>.png)
//   node scripts/render.mjs --fps 30        faster draft
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { DURATION, FPS, WIDTH, HEIGHT } from '../src/timeline.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const stills = arg('--stills')?.split(',').map(Number);
const fps = Number(arg('--fps') || FPS);

const server = await serve(0);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => { console.error('[pageerror]', e); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${server.address().port}/?render`);
await page.waitForFunction(() => window.__ready !== undefined, null, { timeout: 60000 });
await page.evaluate(() => window.__ready);

const grab = (t, type) => page.evaluate(([t, type]) => {
  window.renderAt(t);
  return document.getElementById('stage').toDataURL(type, 0.95).split(',')[1];
}, [t, type]);

if (stills) {
  for (const t of stills) {
    const b64 = await grab(t, 'image/png');
    const f = path.join(OUT, `still-${t.toFixed(2)}.png`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log('wrote', f);
  }
} else {
  const audio = path.join(OUT, 'audio.m4a');
  const hasAudio = fs.existsSync(audio);
  const file = path.join(OUT, 'gemini-infinite.mp4');
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(hasAudio ? ['-c:a', 'copy', '-shortest'] : []),
    '-movflags', '+faststart', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(DURATION * fps);
  const start = Date.now();
  for (let f = 0; f < total; f++) {
    const buf = Buffer.from(await grab(f / fps, 'image/jpeg'), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) {
      const el = (Date.now() - start) / 1000;
      console.log(`frame ${f}/${total}  ${(el / (f + 1)).toFixed(2)}s/frame  eta ${Math.round((el / (f + 1)) * (total - f))}s`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', file, hasAudio ? '(with audio)' : '(no audio — run npm run audio first)');
}
await browser.close();
server.close();
