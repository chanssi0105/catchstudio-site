/* project-hero-effects.js (CLEAN)
   - Hero title: split(옵션) + enter anim + fade + parallax
   - Reveal: title/body 분리 리빌 (1회)
   - Mobile: 진입 시 Overview로 자동 스크롤 (매번 실행 / 유저 조작 시 취소)
*/
(() => {
  const root=document.documentElement;
  const mqlReduce=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
  const prefersReduce=()=>!!(mqlReduce&&mqlReduce.matches);
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  /* =========================================================
     1) Split Words (keeps spaces + <br> + inline nodes)
     - text node -> <span class="sw" style="--sw-i:i">WORD</span>
  ========================================================= */
  const splitWords=(el)=>{
    if(!el||el.dataset.swDone==="1") return;
    el.dataset.swDone="1";

    const walk=(node)=>{
      if(node.nodeType===Node.TEXT_NODE){
        const txt=node.nodeValue||"";
        if(!txt.trim()) return;

        const frag=document.createDocumentFragment();
        const parts=txt.split(/(\s+)/);

        for(const p of parts){
          if(!p) continue;
          if(/^\s+$/.test(p)){
            frag.appendChild(document.createTextNode(p));
          }else{
            const span=document.createElement("span");
            span.className="sw";
            span.textContent=p;
            frag.appendChild(span);
          }
        }

        node.parentNode&&node.parentNode.replaceChild(frag,node);
        return;
      }

      if(node.nodeType===Node.ELEMENT_NODE){
        [...node.childNodes].forEach(walk);
      }
    };

    walk(el);

    const words=[...el.querySelectorAll(".sw")];
    words.forEach((w,i)=>w.style.setProperty("--sw-i",String(i)));
  };

  const triggerSplitAnim=(el)=>{
    if(!el) return;
    if(prefersReduce()){
      el.classList.add("is-animated");
      return;
    }
    el.classList.remove("is-animated");
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("is-animated")));
  };

  /* =========================================================
     2) Hero FX (fade + parallax)
  ========================================================= */
  const heroFx=(()=>{
    let raf=0;
    let hero=null;
    let title=null;
    let splitTarget=null;

    const getProgress=()=>{
      const h=Math.max(1,window.innerHeight);
      const y=window.scrollY||0;
      return clamp(y/h,0,1);
    };

    const update=()=>{
      raf=0;
      if(!title) return;

      const p=getProgress();

      // 1) Fade out
      const fadeEnd=0.75;
      const a=1-clamp(p/fadeEnd,0,1);
      title.style.opacity=String(a);

      // 2) Parallax move
      const move=-220*p;
      title.style.transform=`translate3d(0, ${move}px, 0)`;
      title.style.willChange="transform, opacity";
    };

    const requestUpdate=()=>{
      if(raf) return;
      raf=requestAnimationFrame(update);
    };

    const init=()=>{
      if(root.dataset.heroFxBooted==="1") return;
      root.dataset.heroFxBooted="1";

      hero=$("[data-hero]");
      if(!hero) return;

      // 우선순위: [data-split-words] > .p-heroFx__title
      splitTarget=hero.querySelector("[data-split-words]");
      title=splitTarget||hero.querySelector(".p-heroFx__title");
      if(!title) return;

      if(splitTarget){
        splitWords(splitTarget);
        triggerSplitAnim(splitTarget);
      }

      if(prefersReduce()) return;

      update();
      window.addEventListener("scroll",requestUpdate,{passive:true});
      window.addEventListener("resize",requestUpdate,{passive:true});

      window.addEventListener("pageshow",()=>{
        if(splitTarget) triggerSplitAnim(splitTarget);
        requestUpdate();
      });
    };

    return { init };
  })();

  /* =========================================================
     3) Reveal Driver (title vs body)
     - [data-reveal-title] / [data-reveal-body]
     - title 중 [data-split-words]면 split + is-animated도 같이
  ========================================================= */
  const revealDriver=(()=>{
    const init=()=>{
      const titleEls=$$("[data-reveal-title]");
      const bodyEls=$$("[data-reveal-body]");

      // title split 준비 (1회)
      titleEls.forEach(el=>{ if(el.hasAttribute("data-split-words")) splitWords(el); });

      if(prefersReduce()){
        titleEls.forEach(el=>{
          el.classList.add("is-revealed");
          if(el.hasAttribute("data-split-words")) el.classList.add("is-animated");
        });
        bodyEls.forEach(el=>el.classList.add("is-revealed"));
        return;
      }

      const io=new IntersectionObserver((entries)=>{
        entries.forEach((e)=>{
          if(!e.isIntersecting) return;
          const el=e.target;

          el.classList.add("is-revealed");
          if(el.hasAttribute("data-reveal-title")&&el.hasAttribute("data-split-words")){
            el.classList.add("is-animated");
          }

          io.unobserve(el);
        });
      },{threshold:0.15,rootMargin:"0px 0px -10% 0px"});

      titleEls.forEach(el=>io.observe(el));
      bodyEls.forEach(el=>io.observe(el));
    };

    return { init };
  })();

  /* =========================================================
     4) Mobile Auto-Scroll to Overview (ALWAYS ON ENTER)
     - mobile only (<=768px)
     - load + pageshow(bfcache)
     - cancels on user intent
     - respects prefers-reduced-motion
  ========================================================= */
  const mobileAutoScroll=(()=>{
    const isMobile=()=>window.matchMedia&&window.matchMedia("(max-width: 768px)").matches;

    // ✅ 속도 조절
    const DURATION=2000;

    const headerH=()=>parseFloat(getComputedStyle(root).getPropertyValue("--header-h"))||0;

    const pickOverview=()=>
      document.querySelector(".p-overviewCard")||
      document.querySelector('[aria-label="Overview"]');

    const getTargetTop=(el)=>{
      const y=window.scrollY||window.pageYOffset||0;
      return Math.max(0,Math.round(el.getBoundingClientRect().top+y-headerH()-8));
    };

    const smoothScrollTo=(targetY,duration,isCancelled)=>{
      const startY=window.scrollY||0;
      const diff=targetY-startY;
      if(Math.abs(diff)<2) return;

      const easeOutCubic=(t)=>1-Math.pow(1-t,3);
      let start=null;

      const step=(ts)=>{
        if(isCancelled()) return;
        if(!start) start=ts;
        const p=Math.min((ts-start)/duration,1);
        window.scrollTo(0,Math.round(startY+diff*easeOutCubic(p)));
        if(p<1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    const run=()=>{
      if(!isMobile()) return;
      if(prefersReduce()) return;

      // 스크롤 잠금(메뉴/모달 등) 상태면 중단
      if(root.classList.contains("is-scrollLocked")||document.body.classList.contains("is-scrollLocked")) return;

      // 유저가 이미 내려간 상태면 중단
      if((window.scrollY||0)>10) return;

      const overview=pickOverview();
      if(!overview) return;

      let cancelled=false;
      const isCancelled=()=>cancelled;

      const opt={passive:true};
      const cleanup=()=>{
        window.removeEventListener("touchstart",cancel,opt);
        window.removeEventListener("wheel",cancel,opt);
        window.removeEventListener("keydown",cancel);
        window.removeEventListener("mousedown",cancel);
      };

      const cancel=()=>{cancelled=true; cleanup();};

      window.addEventListener("touchstart",cancel,opt);
      window.addEventListener("wheel",cancel,opt);
      window.addEventListener("keydown",cancel);
      window.addEventListener("mousedown",cancel);

      // 레이아웃 안정화 후 실행
      setTimeout(()=>{
        if(isCancelled()) return;
        const y=getTargetTop(overview);
        smoothScrollTo(y,DURATION,isCancelled);
        setTimeout(cleanup,Math.max(700,DURATION+300));
      },480);
    };

    const init=()=>{
      window.addEventListener("load",run,{once:true});
      window.addEventListener("pageshow",()=>run());
    };

    return { init };
  })();

  /* =========================================================
     Boot
  ========================================================= */
  const boot=()=>{
    heroFx.init();
    revealDriver.init();
    mobileAutoScroll.init();
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();


/* =========================================================
   Meta label equal width (measure max -> CSS var)
========================================================= */
(() => {
  const root = document.documentElement;
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setMetaLabelWidth = () => {
    const labels = [...document.querySelectorAll(".p-overviewMetaLabel")];
    if (!labels.length) return;

    // 측정 위해 width 강제 제거
    root.style.removeProperty("--meta-label-w");

    let max = 0;
    labels.forEach(el => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      if (w > max) max = w;
    });

    if (max > 0) root.style.setProperty("--meta-label-w", `${max}px`);
  };

  const rafSet = () => requestAnimationFrame(() => requestAnimationFrame(setMetaLabelWidth));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rafSet, { once: true });
  else rafSet();

  // 폰트 로딩/리사이즈 대응
  if (!prefersReduce) window.addEventListener("resize", () => rafSet(), { passive: true });
})();


(() => {
  const root=document.documentElement;
  const isProject=document.body.classList.contains("is-project");
  if(!isProject) return;

  const $=(s,r=document)=>r.querySelector(s);

  const baseNav=$("[data-project-nav]");
  if(!baseNav) return;

  /* =========================
     Tuning
     - show when scroll progress passes this
     - 0.40 = 중반쯤 느낌
  ========================= */
  const SHOW_AT=0.40;

  // build sticky container + clone
  const stickyWrap=document.createElement("div");
  stickyWrap.className="p-navSticky";

  const clone=baseNav.cloneNode(true);
  clone.removeAttribute("data-project-nav"); // hook stays only on base
  stickyWrap.appendChild(clone);
  document.body.appendChild(stickyWrap);

  let baseInView=false;

  // hide sticky when base nav is on screen (footer area)
  const io=new IntersectionObserver((entries) => {
    for(const e of entries){
      if(e.target===baseNav) baseInView=!!e.isIntersecting;
    }
    update();
  }, {root:null, threshold:0.01});
  io.observe(baseNav);

  const getProgress=() => {
    const docH=Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const vh=window.innerHeight || 1;
    const max=Math.max(1, docH - vh);
    const y=window.scrollY || window.pageYOffset || 0;
    return y / max;
  };

  const setVisible=(v) => stickyWrap.classList.toggle("is-visible", !!v);

  let raf=0;
  const update=() => {
    const p=getProgress();
    const shouldShow=(p >= SHOW_AT) && !baseInView;
    setVisible(shouldShow);
  };

  const onScroll=() => {
    if(raf) return;
    raf=requestAnimationFrame(() => {
      raf=0;
      update();
    });
  };

  window.addEventListener("scroll", onScroll, {passive:true});
  window.addEventListener("resize", onScroll, {passive:true});

  // initial
  update();
})();
