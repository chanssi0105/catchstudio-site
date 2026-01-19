/* =========================================================
   black_belt.js (hero side character parallax)
========================================================= */
(() => {
  const root=document.documentElement;
  const prefersReduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  const heroCharsParallax=()=>{
    const hero=$("[data-hero]");
    if(!hero) return;

    const left=hero.querySelector("[data-hero-char='left']");
    const right=hero.querySelector("[data-hero-char='right']");
    if(!left && !right) return;

    let raf=0;

    const getHeroH=()=>hero.getBoundingClientRect().height || window.innerHeight;
    const readScroll=()=>window.scrollY || window.pageYOffset || 0;

    const tick=()=>{
      raf=0;
      if(prefersReduce) return;

      const h=getHeroH();
      const y=readScroll();

      /* hero가 fixed라서: 스크롤 0~h 구간만 반응하게 */
      const t=clamp(y / Math.max(1,h), 0, 1);

      /* 튜닝 포인트: */
      const leftY=t * 80;     // 아래로 56px
      const leftX=t * 40;     // 안쪽으로 18px
      const rightY=t * -100;    // 아래로 34px (시차)
      const rightX=t * 1;   // 안쪽으로 -14px

      if(left){
        root.style.setProperty("--hero-char-left-y", `${leftY}px`);
        root.style.setProperty("--hero-char-left-x", `${leftX}px`);
      }
      if(right){
        root.style.setProperty("--hero-char-right-y", `${rightY}px`);
        root.style.setProperty("--hero-char-right-x", `${rightX}px`);
      }
    };

    const onScroll=()=>{
      if(raf) return;
      raf=requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, {passive:true});
    window.addEventListener("resize", onScroll);
    tick();
  };

  const init=()=>{
    heroCharsParallax();
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", init, {once:true});
  }else{
    init();
  }
})();





(() => {
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqMobile = window.matchMedia("(max-width: 768px)");
  const isMobile = () => mqMobile.matches;

  const init = () => {
    const wrap = document.querySelector("[data-opt3d]");
    const container = document.querySelector("[data-opt3d-container]");
    if (!wrap || !container) return;

    const slides = [...container.querySelectorAll("[data-opt3d-slide]")];
    if (slides.length < 3) return;

    let order = slides.slice();            // [left, center, right] 역할
    let locked = false;

    // ✅ 모바일에서 "3장 다 봤는지" 체크
    const total = slides.length;
    let seenIndex = 0;                     // 0(첫장) -> 1 -> 2
    let mobileDone = false;                // true면 아래로 스크롤 허용

    const apply = () => {
      order.forEach((el) => el.classList.remove("is-left","is-center","is-right"));
      order[0].classList.add("is-left");
      order[1].classList.add("is-center");
      order[2].classList.add("is-right");
    };

    const lockFor = (ms) => {
      locked = true;
      window.setTimeout(() => { locked = false; }, ms);
    };

    const next = (byUser=false) => {
      if (locked || prefersReduce) return;
      order = [order[1], order[2], order[0]];
      apply();
      lockFor(520);

      // ✅ 모바일 휠로 넘길 때만 "끝까지 봤는지" 갱신
      if (byUser && isMobile()){
        seenIndex = Math.min(seenIndex + 1, total - 1);
        if (seenIndex >= total - 1) mobileDone = true;
      }
    };

    const prev = () => {
      if (locked || prefersReduce) return;
      order = [order[2], order[0], order[1]];
      apply();
      lockFor(520);

      // 모바일에서 위로 올리면 다시 볼 수 있게(선택)
      if (isMobile()){
        seenIndex = Math.max(seenIndex - 1, 0);
        if (seenIndex < total - 1) mobileDone = false;
      }
    };

    // 최초
    apply();

    // ✅ PC: 자동 슬라이드(휠 무관)
    let timer = 0;
    const startAuto = () => {
      if (timer || prefersReduce || isMobile()) return;
      timer = window.setInterval(() => next(false), 2200);
    };
    const stopAuto = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };
    startAuto();

    // ✅ 모바일: 휠로만 넘김 + 다 보면 아래 스크롤 허용
    let wheelAcc = 0;
    const WHEEL_THRESHOLD = 40;

    // ✅ 반응형 전환 처리
    mqMobile.addEventListener("change", () => {
      wheelAcc = 0;

      if (isMobile()){
        // 모바일 진입: 자동 끄고, 진행상태 리셋(원하면 유지해도 됨)
        stopAuto();
        seenIndex = 0;
        mobileDone = false;
      } else {
        // PC 복귀: 자동 다시 켜기
        startAuto();
      }
    });

    window.addEventListener("pagehide", () => { stopAuto(); }, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();