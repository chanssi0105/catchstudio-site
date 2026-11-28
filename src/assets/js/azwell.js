/* Azwell AI × NVIDIA 사례: 첫 화면 층별 패럴랙스(마우스·스크롤·기울기 + 오브제마다 둥둥), 01 걷힘 비교(위→아래, 끌기), 02 머리표 → 오브제 차례로, 마무리 사진 */
(() => {
  'use strict';
  const page = document.querySelector('.azw-page');
  if (!page) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const moSet = matchMedia('(max-width:768px), (max-width:1199px) and (max-aspect-ratio:85/100)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let vh = innerHeight, frame = 0, observer;

  /* ================= 첫 화면 ================= */
  const hero = $('.azw-hero');
  const title = hero && $('.azw-heroTitle', hero);
  const layers = hero ? $$('.azw-layer', hero).map(el => ({ el, k: el.dataset.layer })) : [];
  const objs = hero ? $$('.azw-obj', hero) : [];
  // 층마다 움직이는 양(px, 1920 기준 화면에서): 마우스, 스크롤 비율
  const DEPTH = { back: { m: 12, s: 0.12 }, mid: { m: 26, s: 0.3 }, front: { m: 46, s: 0.62 } };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let heroScale = 1;

  // 디자인 좌표(PC 1920×1080, 모바일 390×844)를 화면에 놓기: 크기는 두 축 비율의 기하평균, 위치는 가까운 가장자리 기준
  function layoutHero() {
    if (!hero) return;
    const mo = moSet.matches, W = mo ? 390 : 1920, H = mo ? 844 : 1080;
    const vw = hero.clientWidth, hh = hero.clientHeight;
    const s = Math.sqrt((vw / W) * (hh / H)); heroScale = Math.min(vw / W, hh / H) * (mo ? 1.6 : 1);
    // 제목 줄 상자(변형 없는 자리)
    const inner = $('.p-heroFx__inner', hero).getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const ty = title ? new DOMMatrix(getComputedStyle(title).transform).m42 || 0 : 0;
    const ln0 = title && $('.azw-ln', title);
    const lineEls = title ? $$(ln0 && getComputedStyle(ln0).display === 'block' ? '.azw-ln' : '.p-heroFx__line', title) : [];
    const pad = mo ? 14 : 24;
    const lines = lineEls.map(l => { const r = l.getBoundingClientRect(); return { l: r.left - hr.left - pad, r: r.right - hr.left + pad, t: r.top - hr.top - ty - pad, b: r.bottom - hr.top - ty - pad * -1 }; });
    const tTop = Math.min(...lines.map(l => l.t)), tBot = Math.max(...lines.map(l => l.b)), tMid = (tTop + tBot) / 2;
    objs.forEach(o => {
      const [x, y, w, h] = o.dataset[mo ? 'mo' : 'pc'].split(',').map(Number);
      const [bl, bt, br, bb] = o.dataset[mo ? 'bbMo' : 'bbPc'].split(',').map(Number);
      const ww = w * s, hh2 = h * s;
      let left = (x + w / 2 < W / 2) ? x * s : vw - (W - x - w) * s - ww;
      let top = (y + h / 2 < H / 2) ? y * s : hh - (H - y - h) * s - hh2;
      // 제목 글자와 겹치면 위·아래로 비켜 놓기(그림의 불투명한 부분 기준)
      const A = () => ({ l: left + bl * ww, r: left + br * ww, t: top + bt * hh2, b: top + bb * hh2 });
      for (const ln of lines) {
        const a = A();
        if (a.r > ln.l && a.l < ln.r && a.b > ln.t && a.t < ln.b) {
          if ((a.t + a.b) / 2 < tMid) top -= (a.b - tTop); else top += (tBot - a.t);
        }
      }
      o.style.left = left.toFixed(1) + 'px'; o.style.top = top.toFixed(1) + 'px'; o.style.width = ww.toFixed(1) + 'px';
    });
  }

  function onPointer(e) {
    if (!fine.matches) return;
    mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5;
  }
  function onTilt(e) {
    if (e.gamma == null) return;
    mouse.tx = clamp(e.gamma / 40, -0.5, 0.5) * 0.7;
    mouse.ty = clamp(((e.beta || 45) - 45) / 40, -0.5, 0.5) * 0.7;
  }

  /* ================= 01 걷힘 비교 ================= */
  const comps = $$('.azw-cmp', page).map(el => ({ el, handle: $('.azw-handle', el),
    afters: $$('.azw-after', el.closest('.azw-stage, .azw-flow')), manual: false, b: -1 }));
  function setB(c, v) {
    v = clamp(v, 0, 100);
    if (Math.abs(v - c.b) < 0.05) return;
    c.b = v;
    c.el.style.setProperty('--azw-b', v.toFixed(2));
    c.handle.setAttribute('aria-valuenow', String(Math.round(v)));
    c.handle.setAttribute('aria-valuetext', `완성 eDM ${Math.round(v)}%까지 보임`);
    c.el.classList.toggle('is-done', v >= 99.5);
    c.afters.forEach(a => a.classList.toggle('is-on', v >= parseFloat(a.dataset.after) - 0.5));
  }
  comps.forEach(c => {
    let drag = false;
    const fromY = y => { const r = c.el.getBoundingClientRect(); return (y - r.top) / r.height * 100; };
    c.handle.addEventListener('pointerdown', e => { drag = true; c.manual = true; c.handle.setPointerCapture(e.pointerId); e.preventDefault(); });
    c.handle.addEventListener('pointermove', e => { if (drag) setB(c, fromY(e.clientY)); });
    const end = () => { drag = false; };
    c.handle.addEventListener('pointerup', end); c.handle.addEventListener('pointercancel', end);
    c.handle.addEventListener('keydown', e => {
      const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { c.manual = true; setB(c, c.b + step); e.preventDefault(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { c.manual = true; setB(c, c.b - step); e.preventDefault(); }
      if (e.key === 'Home') { c.manual = true; setB(c, 0); e.preventDefault(); }
      if (e.key === 'End') { c.manual = true; setB(c, 100); e.preventDefault(); }
    });
  });

  /* ================= 02·마무리 ================= */
  const s2 = $('.azw-s2', page);
  const closePic = $('.azw-closePic', page);
  // 03: 창 안 스크롤 — 고정 구간 진행도(시작·끝을 부드럽게) × (페이지 그림 높이 − 창 높이)만큼 페이지를 올림
  const pins = $$('.azw-pin', page).map(el => ({ el, stage: $('.azw-pinStage', el), view: $('.azw-browser__view', el), pg: $('.azw-browser__page', el), cur: 0 }));
  const ease = p => p * p * (3 - 2 * p);
  function measureNav() {
    const bar = document.querySelector('.p-navSticky .p-navBar');
    page.style.setProperty('--azw-navh', `${bar ? Math.round(bar.getBoundingClientRect().height) : 0}px`);
  }
  // 장면이 화면 아래로 들어올 때 시작해 가운데에서 끝나는 진행도(G5)
  const progress = el => { const r = el.getBoundingClientRect(); return clamp((vh - r.top) / (vh * 0.5 + r.height * 0.5)); };

  function tick() {
    frame = 0;
    if (document.hidden) return;
    const y = scrollY;
    // 첫 화면: 층별 시차(스크롤 + 마우스/기울기), 화면 밖이면 멈춤
    if (hero) {
      const inView = y < vh * 1.3;
      hero.classList.toggle('is-paused', !inView);
      if (inView) {
        mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
        const k = Math.min(1.4, Math.max(0.5, heroScale));
        layers.forEach(({ el, k: ly }) => {
          const d = DEPTH[ly];
          el.style.transform = `translate3d(${(mouse.x * d.m * 2 * k).toFixed(2)}px, ${(mouse.y * d.m * 1.4 * k - y * d.s).toFixed(2)}px, 0)`;
        });
      }
    }
    // 01: 화면 높이 62% 선을 지나는 자리까지 완성 eDM으로 바뀜
    comps.forEach(c => {
      if (!c.el.offsetParent || c.manual) return;
      const r = c.el.getBoundingClientRect();
      setB(c, (vh * 0.62 - r.top) / r.height * 100);
    });
    if (s2) {
      const vis = $$('.azw-stage, .azw-flow', s2).find(e => e.offsetParent);
      const p = vis ? progress(vis.querySelector('.azw-head') || vis) : 0;
      const n = p >= 0.92 ? 3 : p >= 0.72 ? 2 : p >= 0.5 ? 1 : 0;
      s2.classList.toggle('is-s1', n === 1); s2.classList.toggle('is-s2', n === 2); s2.classList.toggle('is-s3', n === 3);
    }
    if (closePic) {
      const p = progress(closePic.parentElement);
      closePic.style.transform = `scale(${(1.32 - 0.32 * ease(p)).toFixed(4)})`;
    }
    pins.forEach(pn => {
      if (!pn.el.offsetParent) return;
      const r = pn.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const top = parseFloat(getComputedStyle(pn.stage).top) || 0;
      const run = Math.max(1, pn.el.offsetHeight - pn.stage.offsetHeight);
      const p = ease(clamp((top - r.top) / run));
      const travel = Math.max(0, pn.pg.offsetHeight - pn.view.clientHeight);
      const target = p * travel;
      pn.cur += (target - pn.cur) * 0.2; if (Math.abs(target - pn.cur) < 0.3) pn.cur = target;
      pn.pg.style.transform = `translate3d(0, ${(-pn.cur).toFixed(1)}px, 0)`;
    });
    frame = requestAnimationFrame(tick);
  }

  function applyMode() {
    cancelAnimationFrame(frame); frame = 0;
    if (observer) observer.disconnect();
    page.classList.toggle('azw-motion', !reduce.matches);
    vh = innerHeight;
    layoutHero(); measureNav();
    if (reduce.matches) {
      layers.forEach(({ el }) => el.style.removeProperty('transform'));
      pins.forEach(pn => { pn.cur = 0; pn.pg.style.removeProperty('transform'); });
      comps.forEach(c => setB(c, 100));
      if (s2) s2.classList.add('is-s3');
      if (closePic) closePic.style.removeProperty('transform');
      $$('[data-azw-enter]', page).forEach(el => el.classList.add('is-in'));
      return;
    }
    comps.forEach(c => { c.manual = false; });
    observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    $$('[data-azw-enter]:not(.is-in)', page).forEach(el => observer.observe(el));
    frame = requestAnimationFrame(tick);
  }

  let rz = 0;
  addEventListener('resize', () => { vh = innerHeight; cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layoutHero(); measureNav(); }); }, { passive: true });
  addEventListener('load', measureNav);
  addEventListener('pointermove', onPointer, { passive: true });
  // 기울기: 허락 창 없이 쓸 수 있는 기기(안드로이드 등)에서만
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') addEventListener('deviceorientation', onTilt, { passive: true });
  reduce.addEventListener('change', applyMode); moSet.addEventListener('change', applyMode);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce.matches && !frame) frame = requestAnimationFrame(tick); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHero);
  addEventListener('load', layoutHero);
  applyMode();
})();
