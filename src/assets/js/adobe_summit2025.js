/* =========================================================
   Speakers Marquee (About S2 port -> project)
   - auto move (left)
   - wheel/scroll input boosts speed
   - clones 2 sets for seamless loop
========================================================= */
(() => {
  const prefersReduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const marqueeSpeakers=()=>{
    const wrap=$(".p-speakerMarquee");
    const track=$("[data-speaker-marquee]");
    if(!wrap||!track) return;
    if(prefersReduce) return;
    if(track.dataset.bound==="1") return;
    track.dataset.bound="1";

    const BASE_PX_PER_SEC=55;
    const BOOST_MAX=2.0;
    const INPUT_GAIN=0.06;
    const FRICTION=0.92;
    const RETURN=0.035;
    const MIN_DT=0.010;
    const MAX_DT=0.050;

    const getGapPx=()=>{
      const cs=getComputedStyle(track);
      const gap=parseFloat(cs.columnGap||cs.gap||"0");
      return Number.isFinite(gap)?gap:0;
    };

    const ensureTwoSets=()=>{
      if(track.dataset.cloned==="1") return;
      const originals=[...track.children];
      if(!originals.length) return;
      track.dataset.cloned="1";
      originals.forEach(node=>track.appendChild(node.cloneNode(true)));
    };

    let distance=1;
    const measureDistance=()=>{
      const kids=[...track.children];
      if(!kids.length) return;

      const half=Math.floor(kids.length/2);
      if(half<1) return;

      const gap=getGapPx();
      let w=0;

      for(let i=0;i<half;i++){
        w+=kids[i].getBoundingClientRect().width;
        if(i<half-1) w+=gap;
      }

      if(!w||w<10){
        const sw=track.scrollWidth;
        if(sw&&sw>10) w=sw/2;
      }
      if(!w||w<10) w=1;

      distance=w;
    };

    let x=0,vBoost=0,lastT=0;
    const apply=()=>{track.style.transform=`translate3d(${x}px,0,0)`;};

    const step=(t)=>{
      if(!lastT) lastT=t;
      let dt=(t-lastT)/1000;
      lastT=t;
      dt=Math.max(MIN_DT,Math.min(MAX_DT,dt));

      vBoost+=(0-vBoost)*RETURN;
      vBoost*=FRICTION;

      const maxExtra=BASE_PX_PER_SEC*BOOST_MAX;
      const extra=Math.max(-maxExtra,Math.min(maxExtra,vBoost));
      const v=-(BASE_PX_PER_SEC+extra);

      x+=v*dt;

      if(distance>0){
        while(x<=-distance) x+=distance;
        while(x>0) x-=distance;
      }

      apply();
      requestAnimationFrame(step);
    };

    const onWheel=(e)=>{
      let dy=e.deltaY||0;
      if(e.deltaMode===1) dy*=16;
      else if(e.deltaMode===2) dy*=window.innerHeight;
      dy=Math.abs(dy);
      vBoost+=dy*(BASE_PX_PER_SEC*INPUT_GAIN);
    };

    const onScroll=(()=>{
      let lastY=window.scrollY||0;
      return ()=>{
        const y=window.scrollY||0;
        const dy=Math.abs(y-lastY);
        lastY=y;
        vBoost+=dy*(BASE_PX_PER_SEC*INPUT_GAIN*0.9);
      };
    })();

    const start=()=>{
      if(track.dataset.started==="1") return;
      track.dataset.started="1";

      ensureTwoSets();

      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        measureDistance();
        apply();
      }));

      $$("img",track).forEach(img=>{
        img.addEventListener("load",()=>requestAnimationFrame(measureDistance),{once:true});
        img.addEventListener("error",()=>requestAnimationFrame(measureDistance),{once:true});
      });

      window.addEventListener("resize",()=>requestAnimationFrame(measureDistance),{passive:true});
      window.addEventListener("wheel",onWheel,{passive:true});
      window.addEventListener("scroll",onScroll,{passive:true});

      requestAnimationFrame(step);
    };

    if(wrap.classList.contains("is-in")){
      start();
    }else if("IntersectionObserver" in window){
      const io=new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if(!e.isIntersecting) return;
          start();
          io.disconnect();
        });
      },{root:null,threshold:0.01});
      io.observe(wrap);
    }else{
      start();
    }
  };

  const boot=()=>{
    marqueeSpeakers();
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();








/* =========================================================
   Extension: mouse micro parallax (section-only)
   - keeps absolute collage layout
   - tiny movement by depth
   - rAF smoothing
========================================================= */
(() => {
  const prefersReduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  const init=()=>{
    const sec=document.querySelector("[data-ext-collage]");
    if(!sec||prefersReduce||isCoarse) return;

    const cards=[...sec.querySelectorAll(".p-extCard[data-depth]")];
    if(!cards.length) return;

    let targetX=0,targetY=0,curX=0,curY=0,raf=0,active=false;
    const MAX_SHIFT=12;
    const EASE=0.10;

    const setTargets=(clientX,clientY)=>{
      const r=sec.getBoundingClientRect();
      const nx=((clientX-(r.left+r.width/2))/(r.width/2));
      const ny=((clientY-(r.top+r.height/2))/(r.height/2));
      targetX=clamp(nx,-1,1)*MAX_SHIFT;
      targetY=clamp(ny,-1,1)*MAX_SHIFT;
    };

    const apply=()=>{
      raf=0;
      curX+=(targetX-curX)*EASE;
      curY+=(targetY-curY)*EASE;

      for(const el of cards){
        const d=parseFloat(el.dataset.depth||"0.5");
        const px=curX*d;
        const py=curY*d;
        el.style.setProperty("--px",`${px.toFixed(2)}px`);
        el.style.setProperty("--py",`${py.toFixed(2)}px`);
      }

      if(active) raf=requestAnimationFrame(apply);
    };

    const start=()=>{
      if(active) return;
      active=true;
      if(!raf) raf=requestAnimationFrame(apply);
    };

    const stop=()=>{
      active=false;
      targetX=0; targetY=0;
      if(!raf) raf=requestAnimationFrame(apply);
      setTimeout(()=>{cards.forEach(el=>{el.style.setProperty("--px","0px"); el.style.setProperty("--py","0px");});},180);
    };

    sec.addEventListener("pointerenter",()=>start(),{passive:true});
    sec.addEventListener("pointerleave",()=>stop(),{passive:true});
    sec.addEventListener("pointermove",(e)=>{setTargets(e.clientX,e.clientY); if(!active) start();},{passive:true});
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();



/* extension-cards-reveal.js (IntersectionObserver) */
(() => {
  const root = document.documentElement;
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduce) return;

  const wrap = document.querySelector("[data-ext-collage]");
  if (!wrap) return;

  const cards = [...wrap.querySelectorAll(".p-extCard")];
  if (!cards.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }
  }, { root: null, threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

  cards.forEach((el) => io.observe(el));
})();






/* =========================================================
  Completion: auto bg height + monitor push (text wrap safe)
========================================================= */
(() => {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const update = () => {
    const block = document.querySelector(".p-completionBlock");
    if (!block) return;

    const text = block.querySelector(".p-completionBg__text");
    if (!text) return;

    const h = Math.ceil(text.getBoundingClientRect().height);

    // ===== 튜닝 =====
    // baseText: 이 높이까지는 extra 0 (겹침 없는 "정상" 텍스트 높이)
    // kBg: 초과분을 배경 높이에 얼마나 반영할지
    // kPush: 초과분을 모니터 top 보정에 얼마나 반영할지
    const baseText = 240;       // 필요하면 220~320 사이에서 조절
    const kBg = 0.85;           // 배경은 많이 반영 (0.7~1.0 추천)
    const kPush = 0.55;         // 모니터는 중간 반영 (0.35~0.75 추천)
    const maxExtra = 520;       // 배경이 과도하게 커지는 것 방지
    const maxPush = 280;        // 모니터가 과도하게 내려가는 것 방지

    const over = Math.max(0, h - baseText);
    const bgExtra = clamp(over * kBg, 0, maxExtra);
    const push = clamp(over * kPush, 0, maxPush);

    block.style.setProperty("--bgH-extra", `${bgExtra}px`);
    block.style.setProperty("--comp-text-push", `${push}px`);
  };

  const rafUpdate = () => requestAnimationFrame(update);

  window.addEventListener("resize", rafUpdate, { passive: true });
  window.addEventListener("orientationchange", rafUpdate);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rafUpdate, { once: true });
  } else {
    rafUpdate();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(rafUpdate).catch(() => {});
  }
})();


(() => {
  const isMobile=()=>window.matchMedia("(max-width: 768px)").matches;
  const raf=(fn)=>requestAnimationFrame(()=>requestAnimationFrame(fn));

  const fit=()=>{
    const block=document.querySelector(".p-completionBlock");
    if(!block) return;

    const next=block.querySelector(".p-completionNext");
    const img=block.querySelector(".p-completionMonitor__img");
    if(!next||!img) return;

    const run=()=>{
      if(!isMobile()){
        block.style.removeProperty("--comp-next-pad");
        return;
      }
      const h=Math.ceil(img.getBoundingClientRect().height||0);
      const pad=h>0 ? (h + 24) : 0; // +24는 아래 여유 (원하면 숫자만 조절)
      block.style.setProperty("--comp-next-pad", `${pad}px`);
    };

    const tick=()=>raf(run);

    tick();
    window.addEventListener("resize", ()=>tick(), {passive:true});
    if(!img.complete) img.addEventListener("load", tick, {once:true});
  };

  document.addEventListener("DOMContentLoaded", fit);
})();
