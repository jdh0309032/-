// Synthesised score + CC0 SFX, built from the SAME timeline the visuals use
// (src/timeline.js), so every kick / snare / hit lines up with the particle bursts.
//   node scripts/audio.mjs  →  out/score.wav (synth only) + out/audio.m4a (final mix, -14 LUFS)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as TL from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const SFX = path.resolve(ROOT, '../.claude/skills/sound-effects/sfx');
fs.mkdirSync(OUT, { recursive: true });

const SR = 48000;
const N = Math.ceil(TL.DURATION * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N); // reverb bus
const rnd = TL.mulberry32(99);
const TAU = Math.PI * 2;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const idx = (t) => Math.round(t * SR);
const { T, BEAT } = TL;

function add(i, l, r, send = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (send) { sendL[i] += l * send; sendR[i] += r * send; }
}
// PolyBLEP saw (cheap, alias-reduced)
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
const kickEnv = (t) => TL.envelope(t, TL.KICKS, 7);

// ------------------------------------------------------------- 1. opening: sub drone + shimmer
for (let i = 0; i < idx(3.2); i++) {
  const t = i / SR;
  const sw = Math.min(1, t / 1.2) * (t < 2.85 ? 1 : Math.max(0, 1 - (t - 2.85) / 0.3));
  const sub = Math.sin(TAU * 41.2 * t + Math.sin(TAU * 0.3 * t) * 0.5) * 0.17 * sw;
  const shim = (Math.sin(TAU * midi(86) * t) * 0.5 + Math.sin(TAU * midi(93) * t * 1.002)) * 0.012 * sw * (0.6 + 0.4 * Math.sin(TAU * 5.3 * t));
  add(i, sub + shim, sub + shim * 0.8, 0.6);
}
// reverse swell into the burst (filtered noise riser + rising tone)
{
  let lp = 0;
  for (let i = idx(T.zoomStart); i < idx(T.burst); i++) {
    const k = (i / SR - T.zoomStart) / (T.burst - T.zoomStart);
    const a = k ** 3;
    lp += (rnd() * 2 - 1 - lp) * (0.02 + a * 0.5);
    const tone = Math.sin(TAU * (180 + 1400 * k * k) * (i / SR)) * 0.08 * a;
    add(i, lp * 0.35 * a + tone, lp * 0.35 * a - tone * 0.5, 0.4);
  }
}
// bell chimes (inharmonic partials)
function bell(t0, f, amp, dur = 2.5, pan = 0) {
  const parts = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]];
  for (let i = idx(t0); i < Math.min(N, idx(t0 + dur)); i++) {
    const t = i / SR - t0;
    let s = 0;
    for (const [m, a] of parts) s += Math.sin(TAU * f * m * t) * a * Math.exp(-t * (1.6 + m * 0.6));
    s *= amp * Math.min(1, t * 400);
    add(i, s * (1 - pan * 0.5), s * (1 + pan * 0.5), 0.9);
  }
}
bell(0.2, midi(86), 0.09, 3, -0.4);
bell(0.95, midi(93), 0.06, 3, 0.5);
bell(1.6, midi(90), 0.05, 2.5, -0.2);

// ------------------------------------------------------------- 2. drums
function kick(t0, amp = 0.9) {
  let ph = 0;
  for (let i = idx(t0); i < Math.min(N, idx(t0 + 0.5)); i++) {
    const t = i / SR - t0;
    const f = 48 + 140 * Math.exp(-t * 32);
    ph += TAU * f / SR;
    const s = (Math.sin(ph) * Math.exp(-t * 6) + (t < 0.004 ? (rnd() - 0.5) * 0.6 : 0)) * amp;
    add(i, s, s);
  }
}
function snare(t0, amp = 0.35) {
  let hp = 0, prev = 0;
  for (let i = idx(t0); i < Math.min(N, idx(t0 + 0.35)); i++) {
    const t = i / SR - t0;
    const n = rnd() * 2 - 1;
    hp = 0.9 * (hp + n - prev); prev = n; // one-pole highpass
    const s = (hp * Math.exp(-t * 16) * 0.9 + Math.sin(TAU * 185 * t) * Math.exp(-t * 30) * 0.5) * amp;
    add(i, s * 0.9, s, 0.35);
  }
}
function hat(t0, amp = 0.06, open = false) {
  let hp = 0, prev = 0;
  for (let i = idx(t0); i < Math.min(N, idx(t0 + (open ? 0.25 : 0.06))); i++) {
    const t = i / SR - t0;
    const n = rnd() * 2 - 1;
    hp = 0.6 * (hp + n - prev); prev = n;
    const s = hp * Math.exp(-t * (open ? 14 : 70)) * amp;
    add(i, s * 0.7, s);
  }
}
for (const k of TL.KICKS) kick(k, k >= T.drop ? 1.0 : 0.8);
for (const s of TL.SNARES) {
  const roll = s >= 6 && s < T.drop;
  snare(s, roll ? 0.12 + (s - 6) * 0.25 : 0.38);
}
for (let t = 3.25; t < 6.0; t += BEAT) hat(t, 0.07, true);
for (let t = T.drop; t < T.converge; t += BEAT / 4) hat(t, (Math.round((t - T.drop) / (BEAT / 4)) % 2 ? 0.05 : 0.08));
kick(T.burst, 1.1);

// ------------------------------------------------------------- 3. harmony (D minor)
// bars of 4 beats from t=3.0: Dm9 | Bbmaj7 | Fadd9 | C(add9) ...
const CHORDS = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [41, 45, 48, 55, 57], [48, 52, 55, 62, 64]];
const chordAt = (t) => CHORDS[Math.floor(Math.max(0, t - 3) / (BEAT * 4)) % 4];

// arpeggio pluck (Scene 2), filter opens over time
{
  const step = BEAT / 4;
  for (let t0 = 3.0; t0 < T.drop - 0.01; t0 += step) {
    const n = Math.round((t0 - 3) / step);
    const ch = chordAt(t0);
    const note = ch[[0, 2, 4, 3, 1, 4, 2, 3][n % 8]] + 12;
    const f = midi(note);
    const open = 0.05 + 0.5 * ((t0 - 3) / 4) ** 2;
    let lp = 0, ph = rnd();
    const pan = Math.sin(n * 1.7) * 0.6;
    for (let i = idx(t0); i < Math.min(N, idx(t0 + 0.3)); i++) {
      const t = i / SR - t0;
      ph = (ph + f / SR) % 1;
      const saw = 2 * ph - 1 - blep(ph, f / SR);
      lp += (saw - lp) * (open * Math.exp(-t * 12) + 0.03);
      const s = lp * Math.exp(-t * 9) * 0.11;
      add(i, s * (1 - pan), s * (1 + pan), 0.5);
    }
  }
}
// bass (offbeat pluck in Scene 2, sidechained sustain in the drop)
{
  let ph = 0, lp = 0;
  for (let i = idx(3.0); i < idx(T.converge + 0.05); i++) {
    const t = i / SR;
    const f = midi(chordAt(t)[0] - 12);
    ph = (ph + f / SR) % 1;
    const saw = 2 * ph - 1 - blep(ph, f / SR);
    let amp, cut;
    if (t < T.drop) {
      const b = ((t - 3) % BEAT) / BEAT; // offbeat pump
      amp = b > 0.5 ? Math.exp(-(b - 0.5) * BEAT * 10) * 0.22 : 0;
      cut = 0.03;
      if (t > 6.0) amp *= Math.max(0, 1 - (t - 6) / 0.6);
    } else {
      amp = 0.26 * (1 - kickEnv(t) * 0.9);
      cut = 0.06 + kickEnv(t) * 0.02;
    }
    lp += (saw - lp) * cut;
    const sub = Math.sin(TAU * f * t) * (t >= T.drop ? 0.18 * (1 - kickEnv(t)) : 0);
    const s = lp * amp + sub;
    add(i, s, s);
  }
}
// supersaw chords in the drop (7 detuned voices / note), sidechained to the kick
{
  const det = [-0.11, -0.07, -0.035, 0, 0.035, 0.07, 0.11];
  const voices = [];
  for (let c = 0; c < 4; c++) for (let n = 0; n < 5; n++) for (const d of det) voices.push({ c, n, d, ph: rnd(), pan: d * 6 });
  let lpL = 0, lpR = 0;
  for (let i = idx(T.drop); i < idx(T.converge + 0.4); i++) {
    const t = i / SR;
    const ci = CHORDS.indexOf(chordAt(t));
    let sL = 0, sR = 0;
    for (const v of voices) {
      if (v.c !== ci) continue;
      const f = midi(CHORDS[ci][v.n] + 12) * 2 ** (v.d / 12);
      v.ph = (v.ph + f / SR) % 1;
      const s = 2 * v.ph - 1 - blep(v.ph, f / SR);
      sL += s * (1 - v.pan); sR += s * (1 + v.pan);
    }
    const cut = 0.12 + 0.08 * Math.sin(TAU * 0.25 * (t - T.drop));
    lpL += (sL - lpL) * cut; lpR += (sR - lpR) * cut;
    const duck = 1 - kickEnv(t) * 0.85;
    const fade = t > T.converge ? Math.max(0, 1 - (t - T.converge) / 0.4) : Math.min(1, (t - T.drop) / 0.02);
    const g = 0.024 * duck * fade;
    add(i, lpL * g, lpR * g, 0.25);
  }
}
// riser into the drop + reverse swell into the logo
function noiseRiser(t0, t1, amp) {
  let lp = 0, hp = 0, prev = 0;
  for (let i = idx(t0); i < idx(t1); i++) {
    const k = (i / SR - t0) / (t1 - t0);
    const n = rnd() * 2 - 1;
    lp += (n - lp) * (0.02 + k * k * 0.6);
    hp = 0.95 * (hp + lp - prev); prev = lp;
    const s = hp * amp * k ** 2.2;
    add(i, s, s * 0.9, 0.5);
  }
}
noiseRiser(5.0, T.drop, 0.5);
noiseRiser(T.converge, T.logo, 0.55);
// sub drops on the hits
for (const h of TL.HITS) {
  let ph = 0;
  for (let i = idx(h); i < Math.min(N, idx(h + 1.6)); i++) {
    const t = i / SR - h;
    ph += TAU * (30 + 60 * Math.exp(-t * 3)) / SR;
    const s = Math.sin(ph) * Math.exp(-t * 2.2) * 0.45;
    add(i, s, s);
  }
}

// ------------------------------------------------------------- 4. ending: original 4-note chime + warm pad
const MOTIF = [[T.chime, 74], [T.chime + 0.24, 81], [T.chime + 0.48, 78], [T.chime + 0.8, 86]]; // D5 A5 F#5 D6
MOTIF.forEach(([t0, m], i) => { bell(t0, midi(m), 0.2, 2.4, [-0.4, 0.4, -0.2, 0.2][i]); bell(t0, midi(m - 12), 0.09, 2.0); });
{
  const pad = [50, 57, 62, 66, 69]; // D major add9 voicing
  const ph = pad.map(() => [rnd(), rnd()]);
  let lpL = 0, lpR = 0;
  for (let i = idx(T.logo); i < N; i++) {
    const t = i / SR - T.logo;
    let sL = 0, sR = 0;
    pad.forEach((m, k) => {
      for (let v = 0; v < 2; v++) {
        const f = midi(m) * (v ? 1.004 : 0.996);
        ph[k][v] = (ph[k][v] + f / SR) % 1;
        const s = 2 * ph[k][v] - 1 - blep(ph[k][v], f / SR);
        if (v) sR += s; else sL += s;
      }
    });
    lpL += (sL - lpL) * 0.035; lpR += (sR - lpR) * 0.035;
    const env = Math.min(1, t / 0.4) * Math.min(1, (TL.DURATION - (i / SR)) / 1.2);
    add(i, lpL * 0.045 * env, lpR * 0.045 * env, 0.7);
  }
}

// ------------------------------------------------------------- 5. reverb (Schroeder: 4 combs + 2 allpass per side)
function reverb(src, spread) {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.7 + c.lp * 0.3;
      c.buf[c.i] = src[n] * 0.25 + c.lp * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y - s * 0.5;
    }
    out[n] = s;
  }
  return out;
}
const wetL = reverb(sendL, 0), wetR = reverb(sendR, 23);
for (let i = 0; i < N; i++) { L[i] += wetL[i] * 0.35; R[i] += wetR[i] * 0.35; }

// ------------------------------------------------------------- write WAV (16-bit) with soft clip
function writeWav(file) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(Math.tanh(L[i] * 0.9) * 32000), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.tanh(R[i] * 0.9) * 32000), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}
const scoreFile = path.join(OUT, 'score.wav');
writeWav(scoreFile);
console.log('wrote', scoreFile);

// ------------------------------------------------------------- 6. SFX layer (CC0, from the vendored sound-effects skill) + master
const CUES = [
  [T.burst - 0.12, 'transition/fs-683096-woosh.ogg', 0.7],
  [T.burst, 'impact/fs-177242-cinematic-impact.ogg', 0.85],
  ...TL.KEYWORDS.map((k) => [k.shatter - 0.05, 'transition/fs-786514-swoosh-v2.ogg', 0.45]),
  ...TL.KEYWORDS.map((k) => [k.appear, 'typing/fs-416777-digital-typing-wav.ogg', 0.35, 0.3]), // typed into the prompt bar
  [T.drop - 2.46, 'riser/fs-685256-riser-sound-effect-short-wav.ogg', 0.45],
  [T.drop, 'impact/fs-222517-dramatic-hit.ogg', 0.8],
  [T.drop, 'transition/fs-856168-cyberpunk-glitch-hologram-tran.ogg', 0.35],
  [T.converge, 'transition/fs-856168-cyberpunk-glitch-hologram-tran.ogg', 0.25],
  [T.logo, 'impact/fs-177242-cinematic-impact.ogg', 0.95],
].filter(([, f]) => fs.existsSync(path.join(SFX, f)));

const inputs = ['-i', scoreFile];
const filters = [];
CUES.forEach(([t, f, v, dur], i) => {
  inputs.push('-i', path.join(SFX, f));
  const ms = Math.max(0, Math.round(t * 1000));
  const trim = dur ? `atrim=0:${dur},afade=t=out:st=${dur - 0.05}:d=0.05,` : '';
  filters.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,${trim}volume=${v},adelay=${ms}|${ms}[s${i}]`);
});
const mixIn = ['[0:a]', ...CUES.map((_, i) => `[s${i}]`)].join('');
filters.push(`${mixIn}amix=inputs=${CUES.length + 1}:normalize=0:duration=first,atrim=0:${TL.DURATION},` +
  `afade=t=out:st=${TL.DURATION - 0.6}:d=0.6,loudnorm=I=-14:TP=-1.5:LRA=11[out]`);
const final = path.join(OUT, 'audio.m4a');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'),
  '-map', '[out]', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', final], { stdio: 'inherit' });
console.log('wrote', final, `(${CUES.length} SFX cues)`);
