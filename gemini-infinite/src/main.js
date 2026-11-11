// Gemini: The Infinite Dimension — 9:16 motion graphic, 15s.
// Every frame is a pure function of time t (renderAt(t)), so the preview (rAF)
// and the frame-exact MP4 render produce the same picture.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TL from './timeline.js';
import { NOISE, EASE, HASH, POINT_FRAG } from './shaders.js';
import * as SH from './shapes.js';

const { ease, easeIn, easeInOut, prog, lerp, clamp01, envelope, T } = TL;
const RENDER_MODE = new URLSearchParams(location.search).has('render');
const FOV = 50;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const ASPECT = TL.WIDTH / TL.HEIGHT;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER_MODE });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.05, 200);
scene.add(camera);

const overlay = new THREE.Scene(); // pixel-space HUD (logo / tagline / CTA), drawn after post-fx
const ortho = new THREE.OrthographicCamera(-TL.WIDTH / 2, TL.WIDTH / 2, TL.HEIGHT / 2, -TL.HEIGHT / 2, -10, 10);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(TL.WIDTH, TL.HEIGHT), 0.8, 0.5, 0.7);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uFlash: { value: 0 }, uCA: { value: 0 }, uWarp: { value: 0 },
    uTime: { value: 0 }, uVig: { value: 0.9 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uFlash, uCA, uWarp, uTime, uVig;
    varying vec2 vUv;
    ${HASH}
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c * vec2(0.5625, 1.0), c * vec2(0.5625, 1.0)) * 4.0;
      vec2 uv = 0.5 + c * (1.0 - uWarp * r2);
      vec2 off = c * uCA;
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = max(mix(vec3(lum), col, 1.35), 0.0);
      col += vec3(0.95, 0.92, 1.0) * uFlash;
      float vig = smoothstep(1.25, 0.25, length(c * vec2(1.25, 1.0)) * 1.6);
      col *= mix(1.0, vig, uVig);
      col += (hash12(vUv * vec2(1080.0, 1920.0) + fract(uTime * 7.13) * 100.0) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(finalPass);

// ---------------------------------------------------------------- helpers
const rnd = TL.mulberry32(20261111);
const COL = {
  violet: new THREE.Color(0.42, 0.12, 1.0), blue: new THREE.Color(0.08, 0.42, 1.0),
  gold: new THREE.Color(1.0, 0.7, 0.18), cyan: new THREE.Color(0.2, 0.85, 1.0), white: new THREE.Color(1, 1, 1),
};
const FONT = 'Pretendard';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}
const fullVS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

// ================================================================ 1. Liquid neon background
const bgDist = 60;
const bgH = 2 * bgDist * TAN * 1.25;
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSplit: { value: 0 }, uIntensity: { value: 0 }, uHue: { value: 0 }, uRim: { value: 0 } },
  vertexShader: fullVS,
  fragmentShader: /* glsl */ `
    uniform float uTime, uSplit, uIntensity, uHue, uRim;
    varying vec2 vUv;
    ${HASH}
    void main(){
      vec2 p = (vUv - 0.5) * vec2(0.5625, 1.0) * 2.6;
      float t = uTime * 0.35;
      vec2 q = vec2(fbm(p + vec2(0.0, -t)), fbm(p + vec2(5.2, 1.3) + t * 0.6));
      vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) - vec2(0.0, t * 1.4)), fbm(p + 3.5 * q + vec2(8.3, 2.8)));
      float f = fbm(p + 3.5 * r);
      vec3 violet = vec3(0.30, 0.04, 0.85), blue = vec3(0.02, 0.35, 1.0), gold = vec3(1.0, 0.62, 0.12);
      vec3 col = mix(violet, blue, clamp(f * f * 3.2 + uHue * 0.3, 0.0, 1.0));
      col = mix(col, gold, clamp(length(q) * 1.1 - 0.55 + uHue * 0.2, 0.0, 1.0) * 0.85);
      float ridge = pow(1.0 - abs(sin(f * 16.0 - uTime * 1.5)), 14.0);
      col += ridge * mix(vec3(0.35, 0.5, 1.0), vec3(1.0, 0.7, 0.3), q.x) * 0.45;
      col *= (0.15 + f * f * 1.4) * 0.8;
      // liquid split band opening from the horizontal centre to the top & bottom edges
      float edge = abs(vUv.y - 0.5) * 2.0 + 0.05 * sin(vUv.x * 18.0 + uTime * 7.0) + 0.03 * sin(vUv.x * 41.0 - uTime * 11.0);
      float inside = smoothstep(uSplit, uSplit - 0.12, edge);
      float rim = exp(-abs(edge - uSplit) * 26.0) * uRim;
      col = col * inside * uIntensity + rim * vec3(0.7, 0.55, 1.0) * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthWrite: false, depthTest: false,
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(bgH * ASPECT, bgH), bgMat);
bg.position.z = -bgDist;
bg.renderOrder = -10;
camera.add(bg);

// ================================================================ 2. Speed-line tunnel (camera space)
const LINES = 1400;
const lineGeo = new THREE.BufferGeometry();
{
  const seed = new Float32Array(LINES * 2 * 4);
  const pos = new Float32Array(LINES * 2 * 3);
  for (let i = 0; i < LINES; i++) {
    const a = rnd() * Math.PI * 2, r = 0.6 + Math.pow(rnd(), 0.6) * 7, ph = rnd(), hue = rnd();
    for (let e = 0; e < 2; e++) seed.set([a, r, ph, hue + e * 10], (i * 2 + e) * 4);
  }
  lineGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lineGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
}
const lineMat = new THREE.ShaderMaterial({
  uniforms: { uTravel: { value: 0 }, uStreak: { value: 0.5 }, uOpacity: { value: 0 } },
  vertexShader: /* glsl */ `
    attribute vec4 aSeed; uniform float uTravel, uStreak;
    varying vec3 vColor; varying float vA;
    void main(){
      float isEnd = step(5.0, aSeed.w);
      float hue = aSeed.w - isEnd * 10.0;
      float L = 80.0;
      float z = -mod(aSeed.z * L - uTravel, L) - 1.0;   // moves toward camera
      z += isEnd * uStreak;
      vec3 p = vec3(cos(aSeed.x) * aSeed.y * 0.5625, sin(aSeed.x) * aSeed.y, z);
      vColor = hue < 0.4 ? vec3(0.45, 0.2, 1.0) : hue < 0.8 ? vec3(0.15, 0.55, 1.0) : vec3(1.0, 0.75, 0.3);
      vA = smoothstep(-80.0, -40.0, z) * smoothstep(-0.5, -6.0, z) * (1.0 - isEnd * 0.85);
      gl_Position = projectionMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `uniform float uOpacity; varying vec3 vColor; varying float vA; void main(){ gl_FragColor = vec4(vColor * vA * uOpacity * 1.6, 1.0); }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const lines = new THREE.LineSegments(lineGeo, lineMat);
lines.frustumCulled = false;
camera.add(lines);

// ================================================================ 3. 9:16 frame tunnel (optical illusion)
const frames = [];
const FRAME_N = 9, FRAME_GAP = 6;
const frameMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
  vertexShader: fullVS,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
    void main(){
      vec2 p = (vUv - 0.5) * vec2(0.5625, 1.0);
      vec2 b = vec2(0.5625, 1.0) * 0.5 - 0.06;
      vec2 q = abs(p) - b + 0.04; float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.04;
      float line = exp(-abs(sd) * 220.0) + exp(-abs(sd) * 40.0) * 0.12;
      gl_FragColor = vec4(uColor * line * uOpacity, 1.0);
    }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
for (let i = 0; i < FRAME_N; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * 10 * TAN * ASPECT, 2 * 10 * TAN), frameMat.clone());
  m.material.uniforms.uColor.value.copy([COL.violet, COL.blue, COL.gold][i % 3]);
  m.frustumCulled = false;
  camera.add(m);
  frames.push(m);
}

// ================================================================ 4. Starfield dust (world)
const DUST = 3000;
const dustGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(DUST * 3), c = new Float32Array(DUST * 3), s = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    const a = rnd() * Math.PI * 2, r = 0.25 + Math.pow(rnd(), 0.7) * 9;
    p.set([Math.cos(a) * r * 0.6, Math.sin(a) * r, 9 - rnd() * 60], i * 3);
    const col = [COL.violet, COL.blue, COL.white, COL.gold][Math.floor(rnd() * 4)];
    c.set([col.r, col.g, col.b], i * 3);
    s[i] = 0.4 + rnd() * 1.2;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  dustGeo.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
}
const sizeUniform = { value: 1 };
const dustMat = new THREE.ShaderMaterial({
  uniforms: { uSizeScale: sizeUniform, uOpacity: { value: 1 }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    attribute vec3 aColor; attribute float aSize; uniform float uSizeScale, uOpacity, uTime;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uSizeScale * 1.4 / max(0.2, -mv.z);
      vColor = aColor;
      vAlpha = uOpacity * (0.55 + 0.45 * sin(uTime * 3.0 + position.x * 13.0)) * smoothstep(0.1, 1.5, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: POINT_FRAG,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.frustumCulled = false;
scene.add(dust);

// ================================================================ 5. Gemini spark / centre symbol / emblem
const sparkMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uRot: { value: 0 }, uOpacity: { value: 1 }, uMetal: { value: 0 }, uFlare: { value: 1 }, uCore: { value: 1 } },
  vertexShader: fullVS,
  fragmentShader: /* glsl */ `
    uniform float uTime, uRot, uOpacity, uMetal, uFlare, uCore; varying vec2 vUv;
    void main(){
      vec2 p = (vUv - 0.5) * 2.0;
      float cr = cos(uRot), sr = sin(uRot);
      p = mat2(cr, -sr, sr, cr) * p;
      vec2 a = abs(p);
      float ds = (pow(a.x, 0.42) + pow(a.y, 0.42)) / pow(0.5, 0.42);   // slim 4-point star, tips at r=0.5
      float body = smoothstep(1.0, 0.94, ds);
      float glow = exp(-max(ds - 1.0, 0.0) * 2.6) * 0.55;
      float flare = (0.0022 / (a.y + 0.0025)) * smoothstep(1.0, 0.0, a.x) + (0.0022 / (a.x + 0.0025)) * smoothstep(1.0, 0.0, a.y);
      float ang = atan(p.y, p.x + 1e-4);
      vec3 blue = vec3(0.15, 0.5, 1.0), violet = vec3(0.55, 0.25, 1.0), gold = vec3(1.0, 0.75, 0.3);
      vec3 grad = mix(blue, violet, 0.5 + 0.5 * sin(ang + uTime * 1.2));
      grad = mix(grad, gold, smoothstep(0.35, 1.0, 0.5 + 0.5 * sin(ang * 2.0 - uTime * 1.7)));
      float sheen = 0.72 + 0.28 * sin(p.x * 5.0 - p.y * 3.0 + uTime * 3.0);
      vec3 metal = vec3(0.92, 0.94, 1.0) * sheen + grad * 0.08;
      vec3 base = mix(grad, metal, uMetal);
      vec3 col = base * body * 1.5 + mix(grad, vec3(1.0), 0.2) * glow * (1.0 - uMetal * 0.85) + vec3(1.0) * flare * uFlare;
      col += vec3(1.0) * exp(-ds * 7.0) * 1.6 * (1.0 - uMetal * 0.7) * uCore;
      float fade = pow(1.0 - smoothstep(0.15, 1.0, length(vUv - 0.5) * 2.0), 1.5);
      gl_FragColor = vec4(col * uOpacity * fade, 1.0);
    }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const spark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sparkMat);
spark.renderOrder = 5;
scene.add(spark);

// ================================================================ 6. Keyword 3D typography
const KW_W = 4.7, KW_CANVAS = [2048, 300];
const KW_H = KW_W * KW_CANVAS[1] / KW_CANVAS[0];
const KW_LAYERS = 7;
const hueCols = { blue: [COL.cyan, COL.blue], violet: [COL.violet, COL.cyan], gold: [COL.gold, new THREE.Color(1, 0.3, 0.7)] };
const keywordObjs = [];
function keywordCanvas(text) {
  const c = makeCanvas(...KW_CANVAS);
  const g = c.getContext('2d');
  let size = 190;
  g.font = `900 ${size}px ${FONT}`;
  const w = g.measureText(text).width;
  if (w > c.width * 0.94) { size *= (c.width * 0.94) / w; g.font = `900 ${size}px ${FONT}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
  return c;
}
const kwMatBase = new THREE.ShaderMaterial({
  uniforms: { uMap: { value: null }, uReveal: { value: 0 }, uOpacity: { value: 0 }, uLayer: { value: 0 }, uTime: { value: 0 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() } },
  vertexShader: fullVS,
  fragmentShader: /* glsl */ `
    uniform sampler2D uMap; uniform float uReveal, uOpacity, uLayer, uTime; uniform vec3 uColA, uColB; varying vec2 vUv;
    void main(){
      float a = texture2D(uMap, vUv).a;
      float edge = uReveal * 1.08 - 0.04;
      float m = smoothstep(edge + 0.01, edge - 0.03, vUv.x);
      vec3 grad = mix(uColA, uColB, clamp(vUv.x + 0.25 * sin(uTime * 2.5 + vUv.y * 4.0), 0.0, 1.0));
      float front = 1.0 - step(0.5, uLayer);
      vec3 col = front > 0.5 ? mix(grad, vec3(1.0), 0.15 + 0.35 * pow(1.0 - vUv.y, 3.0)) * 0.75 : grad * (0.5 - uLayer * 0.06);
      float alpha = a * m * (front > 0.5 ? 1.0 : 0.3);
      float caretOn = step(0.001, uReveal) * (1.0 - step(0.999, uReveal)) * front;
      float caret = exp(-abs(vUv.x - edge) * 140.0) * smoothstep(0.12, 0.25, vUv.y) * smoothstep(0.88, 0.75, vUv.y) * caretOn;
      gl_FragColor = vec4((col * alpha + vec3(0.8, 0.9, 1.0) * caret * 1.5) * uOpacity, 1.0);
    }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
for (const kw of TL.KEYWORDS) {
  const c = keywordCanvas(kw.text);
  const tex = canvasTexture(c);
  const group = new THREE.Group();
  const mats = [];
  for (let l = 0; l < KW_LAYERS; l++) {
    const m = kwMatBase.clone();
    m.uniforms.uMap.value = tex;
    m.uniforms.uLayer.value = l;
    m.uniforms.uColA.value.copy(hueCols[kw.hue][0]);
    m.uniforms.uColB.value.copy(hueCols[kw.hue][1]);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(KW_W, KW_H), m);
    mesh.position.set(l * 0.012, -l * 0.012, -l * 0.045); // extrusion illusion
    mesh.renderOrder = 10 - l;
    group.add(mesh);
    mats.push(m);
  }
  scene.add(group);
  keywordObjs.push({ kw, canvas: c, group, mats });
}

// ================================================================ 7. Main morphing particle system
const PER_GROUP = 18000;
const NP = PER_GROUP * 3;
const pGeo = new THREE.BufferGeometry();
{
  const text = new Float32Array(NP * 3), shape = new Float32Array(NP * 3), shape2 = new Float32Array(NP * 3);
  const col = new Float32Array(NP * 3), col2 = new Float32Array(NP * 3), info = new Float32Array(NP * 4);
  const gens = [SH.city, SH.planet, SH.art];
  keywordObjs.forEach((o, g) => {
    gens[g](PER_GROUP, rnd, shape, col, g * PER_GROUP);
    SH.sampleText(o.canvas, PER_GROUP, rnd, KW_W, KW_H, [0, o.kw.y, 0], text, g * PER_GROUP);
  });
  SH.flower(NP, rnd, shape2, col2, 0);
  // shuffle flower assignment so each group spreads over the whole flower
  for (let i = NP - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    for (let k = 0; k < 3; k++) {
      [shape2[i * 3 + k], shape2[j * 3 + k]] = [shape2[j * 3 + k], shape2[i * 3 + k]];
      [col2[i * 3 + k], col2[j * 3 + k]] = [col2[j * 3 + k], col2[i * 3 + k]];
    }
  }
  for (let i = 0; i < NP; i++) info.set([Math.floor(i / PER_GROUP), rnd(), rnd(), rnd()], i * 4);
  pGeo.setAttribute('position', new THREE.BufferAttribute(shape, 3));
  pGeo.setAttribute('aText', new THREE.BufferAttribute(text, 3));
  pGeo.setAttribute('aShape2', new THREE.BufferAttribute(shape2, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  pGeo.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
  pGeo.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
}
const pMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uSizeScale: sizeUniform, uKick: { value: 0 },
    uShatter: { value: new THREE.Vector3(...TL.KEYWORDS.map((k) => k.shatter)) },
    uForm: { value: new THREE.Vector3(...TL.KEYWORDS.map((k) => k.form)) },
    uSlotY: { value: new THREE.Vector3(...TL.KEYWORDS.map((k) => k.y)) },
    uDrop: { value: T.drop }, uConverge: { value: T.converge }, uTarget: { value: new THREE.Vector3(0, 1.25, 0) },
    uFlowerRot: { value: 0 }, uFlowerScale: { value: 1 },
  },
  vertexShader: /* glsl */ `
    attribute vec3 aText, aShape2, aColor, aColor2; attribute vec4 aInfo;
    uniform float uTime, uSizeScale, uKick, uDrop, uConverge, uFlowerRot, uFlowerScale;
    uniform vec3 uShatter, uForm, uSlotY, uTarget;
    varying vec3 vColor; varying float vAlpha;
    ${NOISE}
    ${EASE}
    void main(){
      int g = int(aInfo.x + 0.5);
      float sh = g == 0 ? uShatter.x : g == 1 ? uShatter.y : uShatter.z;
      float fm = g == 0 ? uForm.x : g == 1 ? uForm.y : uForm.z;
      float slot = g == 0 ? uSlotY.x : g == 1 ? uSlotY.y : uSlotY.z;

      // --- Scene 2: keyword text -> shape
      float k1 = clamp((uTime - sh - aInfo.y * 0.15) / fm, 0.0, 1.0);
      float e1 = easeMotion(k1);
      float spin = (uTime - sh) * (g == 1 ? 0.55 : 0.35) + (g == 2 ? 0.6 : 0.0);
      vec3 local = position;
      local.xz = rot2(spin) * local.xz;
      if (g == 2) local.xy = rot2(sin(uTime * 0.7) * 0.25) * local.xy;
      vec3 target = vec3(0.0, slot, 0.0) + local;
      vec3 p = mix(aText, target, e1);
      float arc = sin(3.14159 * e1);
      vec3 n = vec3(snoise(aText * 1.4 + vec3(0.0, 0.0, uTime * 0.6)), snoise(aText * 1.4 + 17.0), snoise(aText * 1.4 + 31.0));
      p += n * arc * 1.3 + vec3(0.0, 0.0, arc * 2.2 * (aInfo.z - 0.25));
      vec3 col = aColor + vec3(0.6) * arc;
      float alpha = step(sh, uTime);

      // --- Scene 3 (drop): explode out of the screen, re-form as the flower ecosystem
      float k2 = clamp((uTime - uDrop - aInfo.w * 0.18) / 1.15, 0.0, 1.0);
      float e2 = easeMotion(k2);
      vec3 f = aShape2 * uFlowerScale;
      float rr = length(f.xy);
      f.z += sin(rr * 3.5 - uTime * 5.0) * 0.12 + uKick * 0.08 * smoothstep(2.5, 0.0, rr);
      f.xy = rot2(uFlowerRot + rr * 0.08) * f.xy;
      vec3 dir = normalize(p - vec3(0.0, 0.0, -3.0) + n * 0.4);
      float burst = sin(3.14159 * e2);
      p = mix(p, f, e2) + dir * burst * (2.5 + aInfo.z * 5.0) + vec3(0.0, 0.0, burst * aInfo.y * 7.0);
      col = mix(col, aColor2, e2) + vec3(0.8, 0.7, 1.0) * burst * 0.3;
      alpha = max(alpha, step(0.0001, k2));

      // --- Scene 4: spiral convergence into the emblem
      float k3 = clamp((uTime - uConverge - aInfo.y * 0.3) / 0.75, 0.0, 1.0);
      float e3 = easeInCurve(k3);
      vec3 rel = p - uTarget;
      rel.xy = rot2(e3 * (5.0 + aInfo.z * 4.0)) * rel.xy;
      p = uTarget + rel * (1.0 - e3);
      col = mix(col, vec3(1.0, 0.9, 0.7), e3);
      alpha *= 1.0 - smoothstep(0.55, 0.92, k3);

      p *= 1.0 + uKick * 0.035;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float size = (0.7 + aInfo.z * 1.1) * (1.0 + arc * 1.0 + burst * 0.6 + uKick * 0.15);
      gl_PointSize = min(size * uSizeScale / max(0.3, -mv.z), uSizeScale * 0.9);
      vColor = col * (0.42 + uKick * 0.1) * mix(1.0, 0.3, e2 * (1.0 - e3)) * (1.0 - burst * 0.5);
      vAlpha = alpha * smoothstep(1.0, 4.5, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: POINT_FRAG,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const particles = new THREE.Points(pGeo, pMat);
particles.frustumCulled = false;
particles.renderOrder = 2;
scene.add(particles);

// ================================================================ 8. Data stream (rises bottom -> top)
const NDS = 9000;
const dsGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(NDS * 3), s = new Float32Array(NDS * 4);
  for (let i = 0; i < NDS; i++) {
    const col = Math.floor(rnd() * 46);
    p.set([(col / 45 - 0.5) * 6.2 + (rnd() - 0.5) * 0.04, rnd() * 14, -1 - rnd() * 5], i * 3);
    s.set([0.6 + rnd() * 2.2, rnd(), rnd(), col], i * 4);
  }
  dsGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  dsGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}
const dsMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSizeScale: sizeUniform, uFront: { value: -8 }, uOpacity: { value: 0 }, uKick: { value: 0 } },
  vertexShader: /* glsl */ `
    attribute vec4 aSeed; uniform float uTime, uSizeScale, uFront, uOpacity, uKick;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float y = mod(position.y + uTime * aSeed.x * 1.6, 14.0) - 7.0;
      float x = position.x + sin(y * 0.9 + uTime * 2.2 + aSeed.w * 0.4) * 0.28;
      vec3 p = vec3(x, y, position.z);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (0.8 + aSeed.y * 1.4) * uSizeScale / -mv.z * (1.0 + uKick);
      float bit = step(0.5, fract(sin(floor(uTime * 12.0 * (0.3 + aSeed.z)) + aSeed.w * 7.1) * 43758.5));
      vColor = mix(mix(vec3(0.1, 0.5, 1.0), vec3(0.5, 0.2, 1.0), aSeed.z), vec3(1.0, 0.8, 0.4), step(0.92, aSeed.y)) * (0.4 + bit * 0.9);
      vAlpha = uOpacity * smoothstep(uFront, uFront - 1.5, y) * (1.0 + 2.0 * exp(-abs(y - uFront) * 3.0));
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: POINT_FRAG,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const dataStream = new THREE.Points(dsGeo, dsMat);
dataStream.frustumCulled = false;
scene.add(dataStream);

// ================================================================ 9. Hologram layer 1: glass code panels
function codeCanvas() {
  const c = makeCanvas(1024, 2048);
  const g = c.getContext('2d');
  const r = TL.mulberry32(7);
  const kw = ['const', 'await', 'async', 'return', 'import', 'export', 'for', 'if', 'yield'];
  const ids = ['gemini', 'model', 'vision', 'tokens', 'stream', 'context', 'render', 'dream', 'cosmos', 'neuron', 'layer', 'matrix'];
  g.font = `700 25px JetBrains Mono, monospace`;
  g.textBaseline = 'top';
  for (let i = 0; i < 58; i++) {
    const y = 12 + i * 35, ind = Math.floor(r() * 4) * 28;
    let x = 30 + ind;
    const roll = r();
    const parts = roll < 0.15
      ? [['#ffcf6b', Array.from({ length: 8 }, () => (Math.floor(r() * 65535)).toString(16).padStart(4, '0')).join(' ')]]
      : roll < 0.25
        ? [['#5a6aa8', `// ${ids[Math.floor(r() * ids.length)]} → ${Math.floor(r() * 4096)} dims`]]
        : [
          ['#b18cff', kw[Math.floor(r() * kw.length)] + ' '],
          ['#7fd4ff', ids[Math.floor(r() * ids.length)] + '.' + ids[Math.floor(r() * ids.length)]],
          ['#e8ecff', '('],
          ['#ffcf6b', `"${['multimodal', 'imagine', '∞', 'ultra-hd', 'simulate', 'orbit'][Math.floor(r() * 6)]}"`],
          ['#e8ecff', `, ${(r() * 10).toFixed(3)});`],
        ];
    for (const [color, s] of parts) { g.fillStyle = color; g.fillText(s, x, y); x += g.measureText(s).width; }
    if (r() < 0.2) { // little bar charts between code
      for (let b = 0; b < 18; b++) { g.fillStyle = b % 3 ? '#3a7bff' : '#ffb84a'; g.fillRect(620 + b * 18, y + 26 - r() * 24, 12, r() * 24 + 2); }
    }
  }
  return c;
}
const codeTex = canvasTexture(codeCanvas());
codeTex.wrapS = codeTex.wrapT = THREE.RepeatWrapping;
const panelMat = new THREE.ShaderMaterial({
  uniforms: { uMap: { value: codeTex }, uScroll: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uGlitch: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) }, uRepeat: { value: 1 }, uTint: { value: new THREE.Color() } },
  vertexShader: fullVS,
  fragmentShader: /* glsl */ `
    uniform sampler2D uMap; uniform float uScroll, uOpacity, uTime, uGlitch, uRepeat; uniform vec2 uSize; uniform vec3 uTint;
    varying vec2 vUv;
    ${HASH}
    void main(){
      vec2 p = (vUv - 0.5) * uSize;
      vec2 q = abs(p) - (uSize * 0.5 - 0.22); float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.2;
      float inside = smoothstep(0.01, -0.01, sd);
      float border = exp(-abs(sd) * 60.0) + exp(-abs(sd) * 12.0) * 0.25;
      float row = floor(vUv.y * 60.0);
      float gl = (step(0.86, hash12(vec2(row, floor(uTime * 18.0)))) - 0.5) * uGlitch * 0.08;
      vec2 cuv = vec2(vUv.x * 1.04 - 0.02 + gl, vUv.y * uRepeat - uScroll);
      vec4 code = texture2D(uMap, cuv);
      float scan = 0.82 + 0.18 * sin(vUv.y * 900.0 + uTime * 20.0);
      vec3 glass = mix(vec3(0.22, 0.08, 0.55), vec3(0.04, 0.25, 0.7), vUv.y) * 0.07;
      float sheen = pow(max(0.0, 1.0 - abs((vUv.x + vUv.y * 0.5) - fract(uTime * 0.35) * 2.2 + 0.3) * 6.0), 3.0) * 0.1;
      vec3 col = (glass + sheen + code.rgb * code.a * scan * 0.55) * inside + border * uTint * 0.6;
      gl_FragColor = vec4(col * uOpacity, 1.0);
    }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const panels = [
  { w: 6.0, h: 10.6, pos: [0, 0, -6], ry: -0.18, scroll: 0.08, tint: COL.violet },
  { w: 2.5, h: 3.4, pos: [-1.65, 3.0, -2.6], ry: 0.42, scroll: 0.22, tint: COL.blue },
  { w: 2.5, h: 3.4, pos: [1.7, -3.1, -2.2], ry: -0.45, scroll: -0.15, tint: COL.gold },
].map((cfg) => {
  const m = panelMat.clone();
  m.uniforms.uSize.value.set(cfg.w, cfg.h);
  m.uniforms.uRepeat.value = (cfg.h / cfg.w) / 2;
  m.uniforms.uTint.value.copy(cfg.tint);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, cfg.h), m);
  mesh.position.set(...cfg.pos);
  mesh.rotation.y = cfg.ry;
  mesh.renderOrder = 1;
  scene.add(mesh);
  return { mesh, cfg };
});

// ================================================================ 10. Hologram layer 3: light-speed orbits (front)
const NO = 16000, RINGS = 8;
const oGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(NO * 3), s = new Float32Array(NO * 4);
  for (let i = 0; i < NO; i++) {
    const ring = i % RINGS;
    const comet = Math.floor(rnd() * 3);
    const u = Math.pow(rnd(), 1.6); // dense head, sparse tail
    p.set([ring, comet, u], i * 3);
    s.set([rnd(), rnd(), rnd(), rnd()], i * 4);
  }
  oGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  oGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}
const oMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSizeScale: sizeUniform, uGrow: { value: 0 }, uOpacity: { value: 0 }, uSpin: { value: 0 }, uKick: { value: 0 } },
  vertexShader: /* glsl */ `
    attribute vec4 aSeed; uniform float uTime, uSizeScale, uGrow, uOpacity, uSpin, uKick;
    varying vec3 vColor; varying float vAlpha;
    ${EASE}
    void main(){
      float ring = position.x, comet = position.y, u = position.z;
      float R = (1.1 + ring * 0.42) * uGrow;
      float speed = (ring < 4.0 ? 1.0 : -1.0) * (2.2 + mod(ring * 1.7, 2.3));
      float a = uSpin * speed + comet * 2.094 + ring * 0.7 - u * 1.9 * sign(speed);
      vec3 p = vec3(cos(a) * R, sin(a) * R * (0.28 + mod(ring, 3.0) * 0.08), 0.0);
      p += (aSeed.xyz - 0.5) * 0.05 * (1.0 + u * 3.0);
      p.yz = rot2(1.15 + ring * 0.17) * p.yz;
      p.xy = rot2(ring * 0.42 - 0.6) * p.xy;
      p.z += 0.6;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = min((1.6 - u) * (1.0 + aSeed.w) * uSizeScale / max(0.3, -mv.z) * (1.0 + uKick * 0.3), uSizeScale * 0.45);
      vec3 c = mod(ring, 3.0) < 1.0 ? vec3(1.0, 0.75, 0.3) : mod(ring, 3.0) < 2.0 ? vec3(0.25, 0.6, 1.0) : vec3(0.6, 0.3, 1.0);
      vColor = mix(vec3(1.0), c, smoothstep(0.0, 0.15, u)) * (1.4 - u) * 0.16;
      vAlpha = uOpacity * pow(1.0 - u, 1.5) * smoothstep(1.5, 5.0, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: POINT_FRAG,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const orbits = new THREE.Points(oGeo, oMat);
orbits.frustumCulled = false;
orbits.renderOrder = 4;
scene.add(orbits);

// ================================================================ 11. Ending overlay (pixel space)
function overlayPlane(c, x, y) {
  const tex = canvasTexture(c);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uOpacity: { value: 0 }, uSweep: { value: -1 } },
    vertexShader: fullVS,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uOpacity, uSweep; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(uMap, vUv);
        float band = exp(-pow((vUv.x - vUv.y * 0.35) - uSweep, 2.0) * 160.0);
        gl_FragColor = vec4(t.rgb + vec3(band) * t.a * 0.9, t.a * uOpacity);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(c.width, c.height), mat);
  mesh.position.set(x, y, 0);
  overlay.add(mesh);
  return mesh;
}
function wordmarkCanvas() {
  const c = makeCanvas(1000, 420);
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `600 64px ${FONT}`;
  g.letterSpacing = '6px';
  g.fillStyle = 'rgba(235,238,255,0.92)';
  g.fillText('Google', 500, 96);
  g.letterSpacing = '-4px';
  g.font = `900 220px ${FONT}`;
  const y = 330;
  // emboss: dark drop + light top-left edge + metallic gradient face
  g.fillStyle = 'rgba(20,10,60,0.85)'; g.fillText('Gemini', 506, y + 8);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText('Gemini', 497, y - 3);
  const m = g.createLinearGradient(0, y - 170, 0, y + 10);
  m.addColorStop(0, '#ffffff'); m.addColorStop(0.35, '#dfe3f0'); m.addColorStop(0.5, '#9aa0b8');
  m.addColorStop(0.58, '#f4f6ff'); m.addColorStop(1, '#c3c8de');
  g.fillStyle = m; g.fillText('Gemini', 500, y);
  return c;
}
function taglineCanvas() {
  const c = makeCanvas(1000, 110);
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 58px ${FONT}`;
  g.shadowColor = 'rgba(120,90,255,0.9)'; g.shadowBlur = 24;
  g.fillStyle = '#f2f0ff';
  g.fillText('당신의 상상, 그 이상의 속도로.', 500, 58);
  return c;
}
function ctaCanvas() {
  const c = makeCanvas(640, 200);
  const g = c.getContext('2d');
  const x = 60, y = 40, w = 520, h = 120, r = 60;
  const path = () => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  g.shadowColor = 'rgba(90,120,255,0.95)'; g.shadowBlur = 40;
  const grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#6a2bff'); grad.addColorStop(0.55, '#1f6bff'); grad.addColorStop(1, '#ffb43c');
  path(); g.fillStyle = grad; g.fill();
  g.shadowBlur = 0;
  const gl = g.createLinearGradient(0, y, 0, y + h);
  gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gl.addColorStop(1, 'rgba(255,255,255,0.0)');
  path(); g.fillStyle = gl; g.fill();
  path(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
  g.fillStyle = '#fff'; g.font = `800 50px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('지금 다운로드  →', 320, y + h / 2 + 2);
  return c;
}
let wordmark, tagline, cta, ctaRing;

// ================================================================ timing helpers
const kickEnv = (t) => envelope(t, TL.KICKS, 10);
const snareEnv = (t) => envelope(t, TL.SNARES, 14);
const hitEnv = (t, d = 5) => envelope(t, TL.HITS, d);

function speedAt(t) {
  if (t < T.zoomStart) return 0.4;
  if (t < T.burst) return lerp(0.4, 70, easeIn(prog(t, T.zoomStart, T.burst)));
  if (t < 3.4) return lerp(70, 6, ease(prog(t, T.burst, 3.4)));
  if (t < T.drop) return 6 + 4 * prog(t, 5.5, 7);
  if (t < T.converge) return lerp(110, 32, ease(prog(t, T.drop, 8.2)));
  return lerp(32, 0, ease(prog(t, T.converge, T.logo)));
}
// distance travelled = ∫ speed dt (deterministic for any t, also when scrubbing)
const travelCache = new Float32Array(TL.DURATION * 240 + 2);
for (let i = 1; i < travelCache.length; i++) travelCache[i] = travelCache[i - 1] + speedAt((i - 0.5) / 240) / 240;
const travelAt = (t) => {
  const f = Math.max(0, Math.min(travelCache.length - 2, t * 240));
  const i = Math.floor(f);
  return lerp(travelCache[i], travelCache[i + 1], f - i);
};

// ================================================================ renderAt(t)
function renderAt(t) {
  const kick = kickEnv(t), snare = snareEnv(t), hit = hitEnv(t);
  const sDrop = t >= T.drop && t < T.converge;

  // ---- camera
  let camZ = 10, camY = 0, roll = 0;
  if (t < T.burst) {
    camZ = lerp(10, 9.4, ease(prog(t, 0, T.zoomStart))) ;
    camZ = lerp(camZ, 0.32, easeIn(prog(t, T.zoomStart, T.burst)));
    camY = Math.sin(t * 1.3) * 0.04 * (1 - prog(t, T.zoomStart, T.burst));
  } else if (t < T.drop) {
    camZ = lerp(11.5, 10, ease(prog(t, T.burst, 3.6)));
    camY = Math.sin(t * 0.8) * 0.08;
    roll = Math.sin(t * 0.9) * 0.02;
  } else if (t < T.converge) {
    const k = prog(t, T.drop, T.converge);
    camZ = lerp(13, 9.0, ease(prog(t, T.drop, 8.0))) + Math.sin(k * Math.PI) * -0.6;
    roll = Math.sin(t * 1.4) * 0.05 + (ease(prog(t, T.drop, 7.8)) - 1) * 0.25;
    const shake = kick * 0.05 + hit * 0.2;
    camY = Math.sin(t * 53.1) * shake;
    camera.position.x = Math.sin(t * 61.7) * shake;
  } else {
    camZ = 10; camera.position.x = 0;
  }
  if (!sDrop) camera.position.x = 0;
  camera.position.y = camY;
  camera.position.z = camZ;
  camera.rotation.set(0, 0, roll);
  camera.updateMatrixWorld();

  // ---- background liquid
  const bu = bgMat.uniforms;
  bu.uTime.value = t;
  bu.uSplit.value = t < T.burst ? 0 : lerp(0, 1.35, ease(prog(t, T.burst, T.burst + 0.75)));
  bu.uRim.value = t < T.burst ? 0 : 1 - prog(t, T.burst + 0.4, T.burst + 0.9);
  let inten = 0;
  if (t >= T.burst) inten = lerp(1.1, 0.32, ease(prog(t, T.burst, 3.8)));
  if (t >= 3.8) inten = 0.32 + kick * 0.12;
  if (t >= T.drop) inten = lerp(0.8, 0.2, ease(prog(t, T.drop, 8.0))) + kick * 0.06;
  if (t >= T.converge) inten = lerp(0.45, 0.12, ease(prog(t, T.converge, T.logo)));
  bu.uIntensity.value = inten;
  bu.uHue.value = sDrop ? Math.sin(t * 1.2) * 0.8 : t > T.converge ? 0.4 : 0;

  // ---- speed lines + 9:16 frame tunnel
  const travel = travelAt(t);
  lineMat.uniforms.uTravel.value = travel;
  lineMat.uniforms.uStreak.value = Math.min(12, speedAt(t) * 0.06);
  lineMat.uniforms.uOpacity.value =
    t < T.burst ? easeIn(prog(t, T.zoomStart + 0.3, T.burst)) :
      t < T.drop ? lerp(1, 0.18, ease(prog(t, T.burst, 3.6))) :
        t < T.converge ? 0.55 + kick * 0.15 : 0.55 * (1 - prog(t, T.converge, T.logo));
  const frameOn = sDrop ? ease(prog(t, T.drop, 7.4)) * (1 - prog(t, 11.6, T.converge)) : 0;
  for (let i = 0; i < FRAME_N; i++) {
    const z = -(((i * FRAME_GAP - travel * 0.35) % (FRAME_N * FRAME_GAP)) + FRAME_N * FRAME_GAP) % (FRAME_N * FRAME_GAP) - 1.5;
    frames[i].position.z = z;
    frames[i].rotation.z = Math.sin(z * 0.08 + t) * 0.15;
    frames[i].material.uniforms.uOpacity.value = 0.38 * frameOn * clamp01((z + FRAME_N * FRAME_GAP) / 20) * clamp01((-z - 1.5) / 3) * (1 + kick * 0.4);
  }

  // ---- dust
  dustMat.uniforms.uTime.value = t;
  dustMat.uniforms.uOpacity.value = t < T.burst ? 0.4 + 0.6 * prog(t, 0, 1) : t < T.converge ? 0.55 : 0.55 * (1 - prog(t, T.converge, 13.5)) + 0.25;

  // ---- spark / symbol / emblem (one object across the whole film)
  const su = sparkMat.uniforms;
  su.uTime.value = t;
  if (t < T.burst) {
    const appear = ease(prog(t, 0.15, 1.1));
    spark.position.set(0, Math.sin(t * 2.1) * 0.03, 0);
    spark.scale.setScalar(lerp(0.15, 1.0, appear) * (1 + Math.sin(t * 9) * 0.03));
    su.uRot.value = t * 0.5 + easeIn(prog(t, T.zoomStart, T.burst)) * 2.5;
    su.uOpacity.value = appear * (0.85 + 0.15 * Math.sin(t * 13));
    su.uMetal.value = 0; su.uFlare.value = 0.6 + appear * 0.6; su.uCore.value = 1;
    spark.visible = true;
  } else if (t < 7.6) {
    spark.visible = false;
  } else if (t < T.logo) {
    spark.visible = true;
    const k = ease(prog(t, 7.6, 8.4));
    const shrink = ease(prog(t, T.converge, T.logo));
    spark.position.set(0, lerp(0, 1.25, shrink), lerp(1.0, 0.2, shrink));
    spark.scale.setScalar(lerp(0.1, 2.4, k) * (1 + kick * 0.15) * lerp(1, 0.3, shrink));
    su.uRot.value = (t - 7.6) * 1.8 + kick * 0.2;
    su.uOpacity.value = k * (0.3 + kick * 0.1) + shrink * 0.4;
    su.uMetal.value = 0; su.uFlare.value = 0.5 + kick * 0.2; su.uCore.value = 0.2;
  } else {
    spark.visible = true;
    const k = ease(prog(t, T.logo, T.logo + 0.6));
    spark.position.set(0, 1.25, 0.2);
    spark.scale.setScalar(lerp(0.6, 1.55, k));
    su.uRot.value = lerp((T.logo - 7.6) * 1.8, Math.ceil(((T.logo - 7.6) * 1.8) / (Math.PI / 2)) * (Math.PI / 2), ease(prog(t, T.logo, T.logo + 1.2)));
    su.uOpacity.value = lerp(0.35, 0.8, ease(prog(t, T.logo + 0.2, T.logo + 0.9)));
    su.uMetal.value = lerp(0.5, 1, k); su.uFlare.value = lerp(0.6, 0.25, k); su.uCore.value = 0.4;
  }

  // ---- keywords
  for (const o of keywordObjs) {
    const { kw, group, mats } = o;
    const enter = ease(prog(t, kw.appear, kw.appear + 0.6));
    const visible = t >= kw.appear && t < kw.shatter + 0.15;
    group.visible = visible;
    if (!visible) continue;
    group.position.set(0, lerp(kw.y - 3.2, kw.y, enter), lerp(-3, 0, enter));
    group.rotation.set(lerp(1.1, 0, enter), lerp(-0.4, 0, enter), 0);
    const pre = prog(t, kw.shatter - 0.12, kw.shatter);
    group.scale.setScalar(1 + pre * 0.06 + snare * 0.03);
    const op = enter * (1 - prog(t, kw.shatter, kw.shatter + 0.12));
    const reveal = prog(t, kw.appear + 0.1, kw.appear + 0.55);
    for (const m of mats) {
      m.uniforms.uOpacity.value = op * (1 + pre * 0.8);
      m.uniforms.uReveal.value = reveal;
      m.uniforms.uTime.value = t;
    }
  }

  // ---- particles
  const pu = pMat.uniforms;
  pu.uTime.value = t;
  pu.uKick.value = kick;
  pu.uFlowerRot.value = (t - T.drop) * 0.35;
  pu.uFlowerScale.value = 1 + Math.sin(t * 2) * 0.03;
  particles.visible = t >= TL.KEYWORDS[0].shatter && t < 13.2;

  // ---- data stream
  dsMat.uniforms.uTime.value = t;
  dsMat.uniforms.uKick.value = kick;
  dsMat.uniforms.uFront.value = lerp(-8, 8, ease(prog(t, T.burst + 0.1, 4.0)));
  dsMat.uniforms.uOpacity.value = t < T.burst ? 0 : t < T.drop ? 0.9 : t < T.converge ? 0.35 : 0.35 * (1 - prog(t, T.converge, 12.6));
  dataStream.visible = t >= T.burst && t < 12.7;

  // ---- glass code panels
  for (const { mesh, cfg } of panels) {
    const u = mesh.material.uniforms;
    const k = ease(prog(t, T.drop + 0.05, T.drop + 0.8));
    const out = ease(prog(t, T.converge, T.converge + 0.5));
    mesh.visible = t > T.drop && t < T.converge + 0.5;
    mesh.position.z = cfg.pos[2] - (1 - k) * 18 - out * 6;
    mesh.rotation.y = cfg.ry + Math.sin(t * 0.7 + cfg.pos[0]) * 0.06;
    u.uOpacity.value = k * (1 - out) * (0.7 + snare * 0.3);
    u.uScroll.value = (t - T.drop) * cfg.scroll * (1 + hit);
    u.uTime.value = t;
    u.uGlitch.value = snare + hit * 2;
  }

  // ---- orbits
  const ou = oMat.uniforms;
  const grow = ease(prog(t, T.drop + 0.15, T.drop + 1.1));
  const shrinkO = ease(prog(t, T.converge, T.converge + 0.6));
  orbits.visible = t > T.drop && t < T.converge + 0.6;
  ou.uTime.value = t;
  ou.uKick.value = kick;
  ou.uGrow.value = grow * (1 - shrinkO) * (1 + kick * 0.04);
  ou.uOpacity.value = grow * (1 - shrinkO) * 1.1;
  ou.uSpin.value = (t - T.drop) * 1.6 + (1 - grow) * -3;

  // ---- overlay (ending)
  const showEnd = t >= T.logo;
  overlay.visible = showEnd;
  if (showEnd) {
    const kw = ease(prog(t, T.logo, T.logo + 0.7));
    wordmark.position.y = lerp(-70, -100, 1 - kw);
    wordmark.scale.setScalar(lerp(1.12, 1, kw));
    wordmark.material.uniforms.uOpacity.value = kw;
    wordmark.material.uniforms.uSweep.value = lerp(-0.6, 1.4, easeInOut(prog(t, 13.3, 14.3)));
    const kt = ease(prog(t, 13.35, 13.95));
    tagline.position.y = lerp(-330, -300, kt);
    tagline.material.uniforms.uOpacity.value = kt;
    const kc = ease(prog(t, 13.75, 14.3));
    const pulse = t > 14.3 ? Math.sin((t - 14.3) * Math.PI * 2 * 1.4) * 0.025 : 0;
    cta.scale.setScalar(lerp(0.7, 1, kc) + pulse);
    cta.material.uniforms.uOpacity.value = kc;
    cta.material.uniforms.uSweep.value = lerp(-0.6, 1.5, prog((t - 13.9) % 1.1, 0, 0.8));
    const rp = ((t - 14.0) % 0.7) / 0.7;
    ctaRing.visible = t > 14.0;
    ctaRing.scale.set(1 + rp * 0.25, 1 + rp * 0.6, 1);
    ctaRing.material.uniforms.uOpacity.value = (1 - rp) * 0.6;
  }

  // ---- post fx
  bloom.strength = 0.75 + kick * 0.12 + hit * 0.5 + (t < T.burst ? 0.3 : 0);
  bloom.radius = 0.38 + hit * 0.2;
  const fu = finalPass.uniforms;
  fu.uFlash.value = hitEnv(t, 6.5) * (t < T.logo ? 0.75 : 0.5) + snare * 0.04 * (t > 6 && t < 7 ? 2 : 1) * (t < T.converge ? 1 : 0);
  fu.uCA.value = 0.0025 + kick * 0.006 + hit * 0.035 + (t < T.burst ? easeIn(prog(t, T.zoomStart, T.burst)) * 0.03 : 0);
  fu.uWarp.value = hit * 0.35 + (t < T.burst ? easeIn(prog(t, T.zoomStart, T.burst)) * 0.3 : 0);
  fu.uTime.value = t;

  renderer.autoClear = true;
  composer.render();
  if (showEnd) {
    renderer.autoClear = false;
    renderer.render(overlay, ortho);
    renderer.autoClear = true;
  }
}

// ================================================================ sizing & boot
function resize() {
  let w, h, dpr;
  if (RENDER_MODE) { w = TL.WIDTH; h = TL.HEIGHT; dpr = 1; }
  else {
    const vw = innerWidth, vh = innerHeight;
    h = Math.min(vh, vw / ASPECT); w = h * ASPECT;
    dpr = Math.min(devicePixelRatio || 1, 2, TL.HEIGHT / h);
  }
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, true);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  sizeUniform.value = (h * dpr / TL.HEIGHT) * 34;
}

async function boot() {
  await Promise.all([
    document.fonts.load(`900 100px ${FONT}`), document.fonts.load(`500 100px ${FONT}`),
    document.fonts.load(`600 100px ${FONT}`), document.fonts.load(`800 100px ${FONT}`),
    document.fonts.load(`700 25px "JetBrains Mono"`),
  ]);
  wordmark = overlayPlane(wordmarkCanvas(), 0, -120);
  tagline = overlayPlane(taglineCanvas(), 0, -262);
  cta = overlayPlane(ctaCanvas(), 0, -640);
  {
    const c = makeCanvas(640, 200), g = c.getContext('2d');
    g.beginPath(); g.roundRect(60, 40, 520, 120, 60); g.lineWidth = 4; g.strokeStyle = '#8fb4ff'; g.stroke();
    ctaRing = overlayPlane(c, 0, -640);
  }
  resize();
  addEventListener('resize', resize);
  renderAt(0);
  return true;
}

// index.html awaits the web fonts before importing this module, so keyword
// textures (and the particles sampled from them) always use Pretendard.
window.renderAt = (t) => { renderAt(t); return true; };
window.__ready = boot();

// ---------------- preview player (rAF, synced to the audio clock when playing)
if (!RENDER_MODE) {
  const audio = document.getElementById('audio');
  const ui = document.getElementById('ui');
  const bar = document.getElementById('bar');
  let playing = false, t0 = performance.now(), offset = Number(new URLSearchParams(location.search).get('t') || 0);
  const now = () => {
    if (!playing) return offset;
    if (audio && audio.readyState >= 2 && !audio.paused) return audio.currentTime;
    return offset + (performance.now() - t0) / 1000;
  };
  const play = () => {
    playing = true; t0 = performance.now();
    ui.classList.add('hide');
    if (audio) { audio.currentTime = offset; audio.play().catch(() => {}); }
  };
  const pause = () => { offset = now(); playing = false; audio?.pause(); ui.classList.remove('hide'); };
  ui.addEventListener('click', play);
  canvas.addEventListener('click', () => (playing ? pause() : play()));
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      offset = Math.max(0, Math.min(TL.DURATION, now() + (e.code === 'ArrowRight' ? 0.5 : -0.5)));
      if (playing) { t0 = performance.now(); if (audio) audio.currentTime = offset; }
    }
  });
  window.__ready.then(() => {
    const loop = () => {
      let t = now();
      if (t >= TL.DURATION) { offset = 0; t0 = performance.now(); if (audio) audio.currentTime = 0; t = 0; }
      renderAt(t);
      if (bar) bar.style.transform = `scaleX(${t / TL.DURATION})`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

// debug handle (used by scripts to isolate layers)
window.__objs = { bg, lines, frames, dust, spark, particles, dataStream, panels, orbits, bloom, finalPass, keywordObjs };
