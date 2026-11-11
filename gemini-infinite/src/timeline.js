// Shared timeline: imported by the browser renderer AND the Node audio synth,
// so every particle burst lands on the same kick/snare the audio plays.

export const DURATION = 15;
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5s → Scene 2 (3–7s) = 8 beats, Scene 3 (7–12s) = 10 beats

export const SCENES = {
  spark: [0, 3],
  expand: [3, 7],
  climax: [7, 12],
  ending: [12, 15],
};

// Key moments (seconds)
export const T = {
  zoomStart: 1.55,
  burst: 2.85,      // spark explodes into the liquid wave
  drop: 7.0,
  converge: 12.0,
  logo: 12.85,
  chime: 12.95,
};

// Keywords typed into Gemini (Scene 2). Each one: appears → types → shatters into
// particles that build its shape. y = vertical slot on the 9:16 canvas (world units).
export const KEYWORDS = [
  { text: '우주 도시 설계해줘', shape: 'city', appear: 3.0, shatter: 3.75, form: 0.95, y: 2.35, hue: 'blue' },
  { text: '시뮬레이션 돌려줘', shape: 'planet', appear: 4.25, shatter: 5.0, form: 0.95, y: 0.05, hue: 'violet' },
  { text: '초고해상도 일러스트', shape: 'art', appear: 5.5, shatter: 6.25, form: 0.7, y: -2.35, hue: 'gold' },
];

const range = (from, to, step) => {
  const out = [];
  for (let t = from; t < to - 1e-6; t += step) out.push(+t.toFixed(4));
  return out;
};

// Kick drum: four-on-the-floor in Scene 2 (with a 1-beat breakdown before the
// snare roll), full drive through the drop, silence for the ending.
export const KICKS = [
  ...range(3.0, 6.0, BEAT),
  ...range(7.0, 12.0, BEAT),
];

// Snare/clap on beats 2 & 4, plus an accelerating roll into the drop.
export const SNARES = [
  ...range(3.5, 6.0, BEAT * 2),
  ...[6.0, 6.25, 6.5, 6.625, 6.75, 6.8125, 6.875, 6.9375],
  ...range(7.5, 12.0, BEAT * 2),
];

// Big accents (impact SFX + screen flash)
export const HITS = [T.burst, T.drop, T.logo];

// ---------- easing (custom-motion rule: cubic-bezier(0.25, 1, 0.5, 1)) ----------
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { // Newton
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}

export const ease = cubicBezier(0.25, 1, 0.5, 1);      // default: fast-out, silky settle
export const easeIn = cubicBezier(0.7, 0, 0.84, 0);     // for intentional acceleration (zoom-in)
export const easeInOut = cubicBezier(0.65, 0, 0.35, 1);

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;

// Envelope of the most recent event (1 at the hit, exponential decay).
export function envelope(t, events, decay = 9) {
  let last = -1;
  for (const e of events) { if (e <= t) last = e; else break; }
  if (last < 0) return 0;
  return Math.exp(-(t - last) * decay);
}

// Seeded PRNG so every render is identical.
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
