---
name: custom-motion
description: Three.js 및 웹 모션 그래픽(Canvas/WebGL/CSS/GSAP) 애니메이션 코드를 작성하거나 수정할 때 항상 적용하는 렌더링·이징·성능 룰셋. Use whenever writing or editing web animation, Three.js scenes, canvas rendering, or motion graphics code.
---

# Motion & Rendering Rules

1. **Frame Rate:** 모든 애니메이션 코드 작성 시 60fps 기준 부드러운 궤적(`requestAnimationFrame`)을 보장할 것.
   - `setInterval`/`setTimeout` 기반 애니메이션 루프 금지.
   - 프레임 간 경과 시간(delta time)을 기준으로 위치를 계산해 주사율(60/120Hz)에 관계없이 속도가 일정하도록 할 것.
2. **Easing:** 기본 전환 효과는 하드코딩된 선형 이동을 지양하고, 부드러운 큐빅 베지어 곡선(`cubic-bezier(0.25, 1, 0.5, 1)`)을 적용할 것.
   - CSS: `transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);`
   - GSAP: `CustomEase.create("motion", "0.25,1,0.5,1")` 또는 근사값 `power3.out`.
   - JS 직접 보간 시 아래 함수 사용.
3. **Performance:** 불필요한 DOM 리렌더링을 막고 Canvas / WebGL 버퍼 최적화를 우선 고려할 것.
   - DOM 애니메이션은 `transform`/`opacity`만 변경(레이아웃 유발 속성 금지).
   - 루프 안에서 객체·Geometry·Material 새로 생성 금지 — 재사용 및 `BufferGeometry` 사용.
   - 동일 메시가 많으면 `InstancedMesh`, 끝난 리소스는 `dispose()`.
   - `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

## Reference: cubic-bezier(0.25, 1, 0.5, 1) in JS

```js
// Solve x(t) = progress for t, return y(t). P1=(0.25,1), P2=(0.5,1)
function easeMotion(x) {
  const x1 = 0.25, y1 = 1, x2 = 0.5, y2 = 1;
  const bx = (t) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3;
  const by = (t) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 20; i++) { t = (lo + hi) / 2; bx(t) < x ? (lo = t) : (hi = t); }
  return by(t);
}

let last = performance.now();
function tick(now) {
  const dt = (now - last) / 1000; last = now;
  // update(dt) ... renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```
