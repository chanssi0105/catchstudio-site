/* 웨비나 발표 자료 사례: 첫 화면 사진 시차, 걷힘 비교(온라인 리포트 online_docs.js 방식), 06 화면 고정 두 단계, 마무리 흐르는 벽 */
(() => {
  'use strict';
  const page = document.querySelector('.wbn-page');
  if (!page) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = v => Math.max(0, Math.min(1, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width:1199px)');
  const touch = matchMedia('(hover: none), (pointer: coarse)');
  const heroPic = $('.wbn-heroPicture');
  const scenes = $$('.wbn-scene', page);
  const s6 = $('.wbn-s6', page);
  const rows = $$('.wbn-wallRow', page);
  let vh = innerHeight, frame = 0, observer, lastY = scrollY, speedBoost = 0, lastT = performance.now();
  const offsets = rows.map(() => 0);

  // ---- 걷힘 비교: 보이는 쪽(PC 무대 또는 모바일 흐름) 각각 ----
  const comps = $$('.wbn-compare', page).map(el => ({ el, input: $('.wbn-range', el), scene: el.closest('.wbn-scene'), manual: false }));
  function setSplit(item, v) {
    v = Math.max(0, Math.min(100, v));
    item.el.style.setProperty('--wbn-split', `${v}%`);
    item.input.value = String(Math.round(v));
    item.input.setAttribute('aria-valuetext', `기획안 ${Math.round(v)}%, 완성 ${Math.round(100 - v)}%`);
    const host = item.el.closest('.wbn-stage, .wbn-flow');
    if (host) host.classList.toggle('is-done', v <= 1);
  }
  comps.forEach(item => item.input.addEventListener('input', () => { item.manual = true; setSplit(item, +item.input.value); }));

  // 장면이 화면 아래에 들어올 때 시작해 가운데에서 끝나는 진행도(G5)
  const progress = el => {
    const r = el.getBoundingClientRect();
    return clamp((vh - r.top) / (vh * 0.5 + r.height * 0.5));
  };

  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    const y = scrollY;
    // 첫 화면 사진: 제목(사이트 공통, 위로 빠르게)보다 느리게 올라가 층이 갈라져 보이게
    if (heroPic) {
      const p = clamp(y / vh);
      heroPic.style.transform = `translate3d(0, ${-40 * p}px, 0) scale(${1.02 + 0.04 * p})`;
    }
    comps.forEach(item => {
      if (!item.el.offsetParent || item.manual) return;
      const p = progress(item.el);
      setSplit(item, 100 - p * 100);
    });
    if (s6) {
      const r = s6.getBoundingClientRect();
      let p;
      if (mobile.matches) { const box = $('.wbn-pinBox', s6), part = $('.wbn-pinPart', s6); const b = box.getBoundingClientRect(), st = parseFloat(getComputedStyle(part).top) || 0; p = clamp((st - b.top) / Math.max(1, b.height - part.offsetHeight)); }
      else p = clamp(-r.top / Math.max(1, r.height - vh));
      s6.classList.toggle('is-beat2', p >= 0.5);
      s6.classList.toggle('is-leaving', !mobile.matches && p >= 0.98);
    }
    // 흐르는 벽: 일정 속도 + (마우스·트랙패드에서만) 스크롤하면 빨라짐
    const dt = Math.min(64, now - lastT); lastT = now;
    const dy = Math.abs(y - lastY); lastY = y;
    speedBoost = touch.matches ? 0 : Math.min(6, speedBoost * 0.9 + dy * 0.08);
    rows.forEach((row, i) => {
      const track = row.firstElementChild; const half = track.scrollWidth / 2;
      const dir = +row.dataset.dir, sp = +row.dataset.speed;
      offsets[i] = (offsets[i] + dir * (sp + speedBoost) * dt * 0.06) % half;
      if (offsets[i] > 0) offsets[i] -= half;
      track.style.transform = `translate3d(${offsets[i]}px,0,0)`;
    });
    frame = requestAnimationFrame(tick);
  }

  function applyMode() {
    cancelAnimationFrame(frame); frame = 0;
    if (observer) observer.disconnect();
    page.classList.toggle('wbn-motion', !reduce.matches);
    vh = innerHeight;
    if (reduce.matches) {
      if (heroPic) heroPic.style.removeProperty('transform');
      comps.forEach(item => setSplit(item, 0));
      $$('[data-wbn-enter]', page).forEach(el => el.classList.add('is-in'));
      rows.forEach(row => row.firstElementChild.style.removeProperty('transform'));
      return;
    }
    comps.forEach(item => { item.manual = false; });
    observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    $$('[data-wbn-enter]:not(.is-in)', page).forEach(el => observer.observe(el));
    lastT = performance.now();
    frame = requestAnimationFrame(tick);
  }
  addEventListener('resize', () => { vh = innerHeight; }, { passive: true });
  reduce.addEventListener('change', applyMode); mobile.addEventListener('change', applyMode);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce.matches && !frame) { lastT = performance.now(); frame = requestAnimationFrame(tick); } });
  applyMode();
})();
