// Particle target shapes. All generated once at startup into typed arrays
// (seeded → identical every render). Coordinates are LOCAL to each shape's center.

const PAL = { // Google four colours + Gemini gradient (blue → purple → pink)
  violet: [0.61, 0.45, 0.8],
  blue: [0.26, 0.52, 0.96],
  cyan: [0.54, 0.71, 0.97],
  gold: [0.98, 0.74, 0.02],
  pink: [0.85, 0.4, 0.44],
  red: [0.92, 0.26, 0.21],
  green: [0.2, 0.66, 0.33],
  white: [1.0, 1.0, 1.0],
};
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

function put(pos, col, i, p, c) {
  pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
  col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
}

// --- Scene 2a: cyber city -------------------------------------------------------
export function city(n, rnd, pos, col, off) {
  const towers = [];
  for (let gx = -6; gx <= 6; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const x = gx * 0.3, z = gz * 0.3;
      const r = Math.hypot(x / 2.0, z / 1.0);
      if (r > 1 || rnd() < 0.18) continue;
      const h = 0.25 + (1 - r) * (1 - r) * 1.9 * (0.55 + rnd() * 0.6);
      towers.push({ x: x + (rnd() - 0.5) * 0.05, z, w: 0.09 + rnd() * 0.06, d: 0.09 + rnd() * 0.06, h });
    }
  }
  const base = -0.95;
  for (let k = 0; k < n; k++) {
    const i = off + k;
    const roll = rnd();
    if (roll < 0.08) { // ground grid
      const along = rnd() < 0.5;
      const line = Math.round((rnd() - 0.5) * 14) * 0.15;
      const u = (rnd() - 0.5) * 4.2;
      const p = along ? [u, base, line * 0.5] : [line, base, u * 0.5];
      put(pos, col, i, p, mix(PAL.violet, PAL.blue, rnd()).map((v) => v * 0.7));
      continue;
    }
    const t = towers[Math.floor(rnd() * towers.length)];
    const hx = t.w / 2, hz = t.d / 2;
    if (roll < 0.62) { // vertical + roof edges
      const cx = rnd() < 0.5 ? -hx : hx, cz = rnd() < 0.5 ? -hz : hz;
      if (rnd() < 0.7) {
        const y = base + rnd() * t.h;
        put(pos, col, i, [t.x + cx, y, t.z + cz], mix(PAL.blue, PAL.cyan, (y - base) / 2.2));
      } else {
        const e = rnd() < 0.5;
        const p = e ? [t.x + (rnd() * 2 - 1) * hx, base + t.h, t.z + cz] : [t.x + cx, base + t.h, t.z + (rnd() * 2 - 1) * hz];
        put(pos, col, i, p, mix(PAL.violet, PAL.white, 0.5));
      }
    } else if (roll < 0.94) { // window lattice
      const face = Math.floor(rnd() * 4);
      const fy = Math.floor(rnd() * Math.max(2, t.h / 0.06)) * 0.06;
      const fu = (Math.floor(rnd() * 3) - 1) * 0.33;
      let p;
      if (face === 0) p = [t.x + fu * t.w, base + fy, t.z + hz];
      else if (face === 1) p = [t.x + fu * t.w, base + fy, t.z - hz];
      else if (face === 2) p = [t.x + hx, base + fy, t.z + fu * t.d];
      else p = [t.x - hx, base + fy, t.z + fu * t.d];
      put(pos, col, i, p, rnd() < 0.75 ? PAL.gold : PAL.cyan);
    } else { // antenna beams on tallest towers
      const y = base + t.h + rnd() * 0.35 * (t.h > 1.2 ? 1 : 0.2);
      put(pos, col, i, [t.x, y, t.z], PAL.red);
    }
  }
}

// --- Scene 2b: simulated planet with rings -----------------------------------------
export function planet(n, rnd, pos, col, off) {
  const R = 0.82;
  const tiltX = 0.38, tiltZ = -0.32;
  const cx = Math.cos(tiltX), sx = Math.sin(tiltX), cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
  for (let k = 0; k < n; k++) {
    const i = off + k;
    const roll = rnd();
    if (roll < 0.55) { // sphere surface w/ bands
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const p = [s * Math.cos(th) * R, u * R, s * Math.sin(th) * R];
      const band = 0.5 + 0.5 * Math.sin(u * 14 + Math.sin(th * 3) * 0.8);
      put(pos, col, i, p, mix(mix(PAL.blue, PAL.violet, band), PAL.cyan, Math.max(0, u) * 0.4));
    } else if (roll < 0.62) { // atmosphere haze
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const rr = R * (1.04 + rnd() * 0.12);
      put(pos, col, i, [s * Math.cos(th) * rr, u * rr, s * Math.sin(th) * rr], PAL.cyan.map((v) => v * 0.5));
    } else if (roll < 0.97) { // ring
      const rr = R * (1.35 + Math.pow(rnd(), 0.8) * 1.05);
      const th = rnd() * Math.PI * 2;
      let x = Math.cos(th) * rr, y = (rnd() - 0.5) * 0.015, z = Math.sin(th) * rr;
      // tilt
      let y1 = y * cx - z * sx, z1 = y * sx + z * cx;
      let x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
      const gap = Math.abs(rr - R * 1.85) < 0.05 ? 0.15 : 1;
      put(pos, col, i, [x2, y2, z1], mix(PAL.gold, PAL.white, rnd() * 0.5).map((v) => v * gap));
    } else { // moon
      const m = rnd() < 0.5 ? [-1.55, 0.7, 0.3] : [1.45, -0.75, -0.2];
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      put(pos, col, i, [m[0] + s * Math.cos(th) * 0.11, m[1] + u * 0.11, m[2] + s * Math.sin(th) * 0.11], PAL.white);
    }
  }
}

// --- Scene 2c: torus-knot "artwork" sculpture ---------------------------------------
export function art(n, rnd, pos, col, off) {
  const P = 2, Q = 3;
  const grad = [PAL.blue, PAL.violet, PAL.pink, PAL.red, PAL.gold, PAL.green, PAL.blue];
  for (let k = 0; k < n; k++) {
    const i = off + k;
    const t = rnd() * Math.PI * 2;
    const knot = (tt) => {
      const r = 0.95 + 0.38 * Math.cos(Q * tt);
      return [r * Math.cos(P * tt), 0.38 * Math.sin(Q * tt) * 1.6, r * Math.sin(P * tt) * 0.8];
    };
    const a = knot(t), b = knot(t + 0.001);
    const tg = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(...tg);
    tg[0] /= tl; tg[1] /= tl; tg[2] /= tl;
    // orthonormal frame
    let nx = -tg[2], ny = 0, nz = tg[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; nz /= nl;
    const bx = tg[1] * nz - tg[2] * ny, by = tg[2] * nx - tg[0] * nz, bz = tg[0] * ny - tg[1] * nx;
    const phi = rnd() * Math.PI * 2;
    const ribbon = rnd() < 0.7;
    const rad = ribbon ? 0.13 : 0.13 + rnd() * 0.25;
    const c = Math.cos(phi) * rad, s = Math.sin(phi) * rad * (ribbon ? 0.25 : 1);
    const p = [a[0] + nx * c + bx * s, a[1] + ny * c + by * s, a[2] + nz * c + bz * s];
    const g = (t / (Math.PI * 2)) * (grad.length - 1);
    const gi = Math.floor(g);
    const cc = mix(grad[gi], grad[Math.min(gi + 1, grad.length - 1)], g - gi);
    put(pos, col, i, p, ribbon ? cc : cc.map((v) => v * 0.35));
  }
}

// --- Scene 3: giant organic neon flower + vine ecosystem ----------------------------
export function flower(n, rnd, pos, col, off) {
  const layers = [
    { petals: 10, L: 2.15, cup: 0.9, phase: 0.0, a: PAL.violet, b: PAL.blue },
    { petals: 8, L: 1.65, cup: 1.1, phase: 0.3, a: PAL.blue, b: PAL.cyan },
    { petals: 7, L: 1.15, cup: 1.25, phase: 0.6, a: PAL.pink, b: PAL.red },
    { petals: 6, L: 0.7, cup: 1.4, phase: 0.1, a: PAL.gold, b: PAL.white },
  ];
  for (let k = 0; k < n; k++) {
    const i = off + k;
    const roll = rnd();
    if (roll < 0.66) {
      const ly = layers[Math.min(3, Math.floor(Math.pow(rnd(), 1.7) * 4))];
      const pi = Math.floor(rnd() * ly.petals);
      const ang = (pi / ly.petals) * Math.PI * 2 + ly.phase;
      const u = Math.sqrt(rnd());
      const edge = rnd() < 0.35;
      const v = edge ? (rnd() < 0.5 ? -1 : 1) : rnd() * 2 - 1;
      const w = Math.sin(Math.PI * Math.pow(u, 0.8)) * 0.32 * ly.L;
      const rho = u * ly.L, s = v * w;
      const z = ly.cup * u * u * 0.9 - v * v * 0.08;
      const x = Math.cos(ang) * rho - Math.sin(ang) * s;
      const y = Math.sin(ang) * rho + Math.cos(ang) * s;
      const c = edge ? mix(ly.b, PAL.white, 0.6) : mix(ly.a, ly.b, u);
      put(pos, col, i, [x, y, z], c.map((q) => q * (edge ? 1 : 0.75)));
    } else if (roll < 0.69) { // pistil / pollen core
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const r = 0.25 * Math.cbrt(rnd());
      put(pos, col, i, [s * Math.cos(th) * r, u * r, 0.9 + s * Math.sin(th) * r * 0.5], PAL.gold);
    } else if (roll < 0.93) { // vines spiralling up & down the tall frame
      const vine = Math.floor(rnd() * 6);
      const dir = vine % 2 === 0 ? 1 : -1;
      const h = rnd();
      const y = dir * (0.9 + h * 4.2);
      const th = h * 9 + vine * 1.1;
      const r = 0.6 + h * 1.2 + Math.sin(h * 20 + vine) * 0.08;
      const leaf = rnd() < 0.25 ? (rnd() - 0.5) * 0.25 : 0;
      put(pos, col, i, [Math.cos(th) * r + leaf, y + leaf, Math.sin(th) * r * 0.6 - 0.5],
        mix(vine % 2 === 0 ? PAL.green : PAL.blue, PAL.gold, h * 0.6));
    } else { // floating spores filling the frame
      put(pos, col, i, [(rnd() - 0.5) * 5.6, (rnd() - 0.5) * 9.6, (rnd() - 0.5) * 3 - 0.5],
        mix(PAL.gold, PAL.cyan, rnd()).map((q) => q * 0.8));
    }
  }
}

// Sample a text canvas into points on a plane of the given world size.
export function sampleText(canvas, n, rnd, worldW, worldH, center, pos, off) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (data[(y * w + x) * 4 + 3] > 120) pts.push(x, y);
  const count = pts.length / 2;
  for (let k = 0; k < n; k++) {
    const j = Math.floor(rnd() * count);
    const px = pts[j * 2] + rnd() * 2, py = pts[j * 2 + 1] + rnd() * 2;
    const i = off + k;
    pos[i * 3] = center[0] + (px / w - 0.5) * worldW;
    pos[i * 3 + 1] = center[1] - (py / h - 0.5) * worldH;
    pos[i * 3 + 2] = center[2] + (rnd() - 0.5) * 0.04;
  }
}
