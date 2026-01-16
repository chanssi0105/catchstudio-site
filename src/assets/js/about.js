/* =========================================================
   about.js (CLEAN FINAL)
   - is-ready 안정화 (중복 제거)
   - Mobile auto-scroll: 모바일에서 진입마다(페이지쇼 포함) / 유저 조작 시 취소 / 중복 리스너 방지
   - Hero split-words: 1회 split + 진입/복귀마다 is-animated 재트리거
   - Reveal(IO): data-reveal / data-reveal-title
   - S2 marquee: start 1회 + 리스너 중복 방지
   - S4 accordion: 기본 유지
   - S4 emoji: 리스너 중복 방지
   - S56 pin driver: 리스너 중복 방지 + update 안정화
   - S6 CTA svg 교체: 1회
========================================================= */

(() => {
  const root=document.documentElement;
  const prefersReduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clamp01=(v)=>clamp(v,0,1);

  const rafThrottle=(fn)=>{
    let raf=0,lastArgs=null;
    return (...args)=>{
      lastArgs=args;
      if(raf) return;
      raf=requestAnimationFrame(()=>{
        raf=0;
        fn(...(lastArgs||[]));
      });
    };
  };

  const getHeaderH=()=>{
    const v=getComputedStyle(root).getPropertyValue("--header-h").trim();
    const n=parseFloat(v);
    return Number.isFinite(n)?n:70;
  };

  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

  /* ----------------------------------------------------------
     0) is-ready (stable)
  ---------------------------------------------------------- */
  const markReady=()=>{
    if(root.classList.contains("is-ready")) return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add("is-ready")));
  };

  document.addEventListener("DOMContentLoaded",markReady,{once:true});
  window.addEventListener("load",markReady,{once:true});

  /* =========================================================
     1) Mobile auto-scroll (About -> data-hero-sub) - ALWAYS like Contact
  ========================================================= */
  const autoScrollHeroSub=(()=>{
    let armed=false;
    let canceled=false;

    const isMobile=()=>window.matchMedia&&window.matchMedia("(max-width: 820px)").matches;

    const smoothScrollTo=(targetY,duration)=>{
      const startY=window.scrollY;
      const dist=targetY-startY;
      const startT=performance.now();
      const ease=(t)=>t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

      const step=(now)=>{
        const p=Math.min(1,(now-startT)/duration);
        window.scrollTo(0,startY+dist*ease(p));
        if(p<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const cleanup=()=>{
      window.removeEventListener("wheel",cancel);
      window.removeEventListener("touchstart",cancel);
      window.removeEventListener("keydown",cancel);
    };

    const cancel=()=>{
      canceled=true;
      cleanup();
    };

    const run=async()=>{
      armed=false;
      if(prefersReduce) return;
      if(!isMobile()) return;

      const scroller=document.scrollingElement||document.documentElement;
      if((scroller.scrollTop||0)>10) return;

      const target=$("[data-hero-sub]");
      if(!target) return;

      canceled=false;

      // 유저 입력 취소 감지(중복 방지: run 때마다 다시 등록)
      cleanup();
      window.addEventListener("wheel",cancel,{passive:true});
      window.addEventListener("touchstart",cancel,{passive:true});
      window.addEventListener("keydown",cancel);

      try{
        if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,wait(500)]);
        else await wait(80);
      }catch(_){}
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      if(canceled) return;

      const headerH=getHeaderH();
      const rect=target.getBoundingClientRect();
      const maxScroll=scroller.scrollHeight-window.innerHeight;

      const EXTRA=50;
      let y=window.scrollY+rect.top-headerH-EXTRA;
      y=Math.max(0,Math.min(maxScroll,y));

      cleanup();
      smoothScrollTo(y,2000);
    };

    const arm=()=>{
      if(armed) return;
      armed=true;
      setTimeout(run,120);
    };

    return {arm,cleanup};
  })();

  /* =========================================================
     2) Hero title splitWords + animation retrigger
  ========================================================= */
  const heroSplit=(()=>{
    const splitWords=(el)=>{
      const html=el.innerHTML.replace(/<br\s*\/?>/gi,"\n");
      const tmp=document.createElement("div");
      tmp.innerHTML=html;

      const text=(tmp.textContent||"").replace(/[ \t]+/g," ").trim();
      const lines=text.split("\n").map(s=>s.trim()).filter(Boolean);

      el.innerHTML="";
      const frag=document.createDocumentFragment();

      let idx=0;
      lines.forEach((line,lineIndex)=>{
        line.split(" ").forEach((word)=>{
          if(!word) return;
          const w=document.createElement("span");
          w.className="w";
          const i=document.createElement("i");
          i.textContent=word;
          i.style.transitionDelay=`${Math.min(idx*45,520)}ms`;
          w.appendChild(i);
          frag.appendChild(w);
          frag.appendChild(document.createTextNode(" "));
          idx+=1;
        });
        if(lineIndex<lines.length-1) frag.appendChild(document.createElement("br"));
      });

      el.appendChild(frag);
    };

    const init=()=>{
      const heroTitle=$("[data-split-words]");
      if(!heroTitle) return;

      // reduce motion -> 즉시 노출
      if(prefersReduce){
        heroTitle.classList.add("is-animated");
        return;
      }

      // split은 1회만
      if(heroTitle.dataset.splitted!=="1"){
        heroTitle.dataset.splitted="1";
        splitWords(heroTitle);
      }

      // 진입/복귀마다 모션 재트리거
      heroTitle.classList.remove("is-animated");
      requestAnimationFrame(()=>requestAnimationFrame(()=>heroTitle.classList.add("is-animated")));
    };

    return {init};
  })();

  /* =========================================================
     3) Reveal on scroll (IO)
  ========================================================= */
  const reveal=(()=>{
    let io=null;

    const buildTitle=(el)=>{
      if(el.dataset.built==="1") return;
      const raw=el.innerHTML.replace(/<br\s*\/?>/gi,"\n");
      const lines=raw.split("\n").map(s=>s.trim()).filter(Boolean);
      el.innerHTML=lines.map(line=>`<span>${line}</span>`).join("<br />");
      $$("span",el).forEach((s,i)=>s.style.transitionDelay=`${Math.min(i*90,240)}ms`);
      el.dataset.built="1";
    };

    const init=()=>{
      const revealEls=$$("[data-reveal]");
      const titleEls=$$("[data-reveal-title]");

      if(prefersReduce || !("IntersectionObserver" in window)){
        revealEls.forEach(el=>el.classList.add("is-in"));
        titleEls.forEach(el=>{
          buildTitle(el);
          el.classList.add("is-in");
        });
        return;
      }

      if(!io){
        io=new IntersectionObserver((entries)=>{
          entries.forEach(e=>{
            if(!e.isIntersecting) return;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          });
        },{root:null,rootMargin:"0px 0px -10% 0px",threshold:0.12});
      }

      revealEls.forEach(el=>io.observe(el));
      titleEls.forEach(el=>{
        buildTitle(el);
        io.observe(el);
      });
    };

    return {init};
  })();

  /* =========================================================
     4) Section2 Marquee (inertial) - start once
  ========================================================= */
  const marquee=(()=>{
    const init=()=>{
      const wrap=$(".about-s2__marquee");
      const track=$("[data-marquee]");
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

      const shuffleOriginals=()=>{
        if(track.dataset.shuffled==="1") return;
        const originals=[...track.children];
        if(originals.length<2) return;
        for(let i=originals.length-1;i>0;i--){
          const j=Math.floor(Math.random()*(i+1));
          [originals[i],originals[j]]=[originals[j],originals[i]];
        }
        const frag=document.createDocumentFragment();
        originals.forEach(n=>frag.appendChild(n));
        track.textContent="";
        track.appendChild(frag);
        track.dataset.shuffled="1";
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
        track.style.setProperty("--about-marquee-distance",`${distance}px`);
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

        shuffleOriginals();
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
        const io2=new IntersectionObserver((entries)=>{
          entries.forEach(e=>{
            if(!e.isIntersecting) return;
            start();
            io2.disconnect();
          });
        },{root:null,threshold:0.01});
        io2.observe(wrap);
      }else{
        start();
      }
    };

    return {init};
  })();

  /* =========================================================
     5) Section4 Accordion
  ========================================================= */
  const accordion=(()=>{
    const init=()=>{
      const accList=$$(".about-s4__acc");
      if(!accList.length) return;

      const setOpen=(item,open,animate=true)=>{
        const btn=$(".about-s4__btn",item);
        const panel=$(".about-s4__panel",item);
        if(!btn||!panel) return;

        const shouldAnimate=animate && !prefersReduce;

        item.classList.toggle("is-open",open);
        btn.setAttribute("aria-expanded",open?"true":"false");
        if(open) panel.hidden=false;

        if(!shouldAnimate){
          panel.style.height=open?"auto":"0px";
          if(!open) panel.hidden=true;
          return;
        }

        if(open){
          panel.style.height="0px";
          panel.getBoundingClientRect();
          panel.style.height=`${panel.scrollHeight}px`;
          const onEnd=(e)=>{
            if(e.propertyName!=="height") return;
            panel.removeEventListener("transitionend",onEnd);
            panel.style.height="auto";
          };
          panel.addEventListener("transitionend",onEnd);
          return;
        }

        panel.style.height=`${panel.scrollHeight}px`;
        panel.getBoundingClientRect();
        panel.style.height="0px";
        const onEnd=(e)=>{
          if(e.propertyName!=="height") return;
          panel.removeEventListener("transitionend",onEnd);
          panel.hidden=true;
        };
        panel.addEventListener("transitionend",onEnd);
      };

      const initItem=(item)=>{
        const open=item.classList.contains("is-open");
        const btn=$(".about-s4__btn",item);
        const panel=$(".about-s4__panel",item);
        if(btn) btn.setAttribute("aria-expanded",open?"true":"false");
        if(panel){
          panel.hidden=!open;
          panel.style.height=open?"auto":"0px";
        }
      };

      accList.forEach(acc=>{
        if(acc.dataset.bound==="1") return;
        acc.dataset.bound="1";

        const items=$$(".about-s4__item",acc);
        items.forEach(initItem);

        items.forEach(item=>{
          const btn=$(".about-s4__btn",item);
          if(!btn) return;
          btn.addEventListener("click",()=>{
            const isOpen=item.classList.contains("is-open");
            setOpen(item,!isOpen,true);
          });
        });

        window.addEventListener("resize",()=>{
          items.forEach(item=>{
            if(!item.classList.contains("is-open")) return;
            const panel=$(".about-s4__panel",item);
            if(panel) panel.style.height="auto";
          });
        },{passive:true});
      });
    };

    return {init};
  })();

  /* =========================================================
     6) Section4 Emoji (v3) - bind once
  ========================================================= */
  const s4Emoji=(()=>{
    const init=()=>{
      const s4=$(".about-s4");
      if(!s4) return;
      if(s4.dataset.emojiBound==="1") return;
      s4.dataset.emojiBound="1";

      const kicker=$(".about-s4__kicker",s4);
      const emojiEl=$(".about-s4__emoji",s4);
      const acc=$(".about-s4__acc",s4);
      const items=$$(".about-s4__item",s4);
      if(!kicker||!emojiEl||!acc||!items.length) return;

      const PRAY="🙏";
      const ICONS=["🏢","⚙️","🖥️","♻️","🎯"];
      const mq=window.matchMedia("(max-width: 960px)");
      const num=(v)=>{const n=parseFloat(v);return Number.isFinite(n)?n:0;};

      let kickerTopPx=0,accStartY=0,itemStartY=[];
      let state=-2,shown=false,wasSticky=false,enabled=false;

      const pop=()=>{
        emojiEl.classList.remove("is-pop");
        requestAnimationFrame(()=>emojiEl.classList.add("is-pop"));
        setTimeout(()=>emojiEl.classList.remove("is-pop"),180);
      };

      const setState=(next)=>{
        if(next===state) return;
        state=next;

        if(state===-2){
          shown=false;
          emojiEl.classList.remove("is-visible");
          emojiEl.textContent="";
          return;
        }

        if(!shown){
          shown=true;
          emojiEl.classList.add("is-visible");
        }

        if(state===-1){
          if(emojiEl.textContent!==PRAY){
            emojiEl.textContent=PRAY;
            pop();
          }
          return;
        }

        const icon=ICONS[state]||PRAY;
        if(emojiEl.textContent!==icon){
          emojiEl.textContent=icon;
          pop();
        }
      };

      const measure=()=>{
        kickerTopPx=num(getComputedStyle(kicker).top);
        const sy=window.scrollY||0;
        accStartY=acc.getBoundingClientRect().top+sy;

        itemStartY=items.map(item=>{
          const btn=$(".about-s4__btn",item)||item;
          return btn.getBoundingClientRect().top+sy;
        });
      };

      const compute=()=>{
        if(!enabled) return;

        if(!kickerTopPx) measure();

        const kRect=kicker.getBoundingClientRect();
        const stickyOn=kRect.top<=kickerTopPx+0.5;

        if(!stickyOn){
          wasSticky=false;
          setState(-2);
          return;
        }

        if(!wasSticky){
          wasSticky=true;
          setState(-1);
          return;
        }

        const sy=window.scrollY||0;
        const kickerH=kicker.offsetHeight||0;
        const triggerLine=sy+kickerTopPx+kickerH+18;

        if(triggerLine<accStartY){
          setState(-1);
          return;
        }

        let idx=0;
        for(let i=itemStartY.length-1;i>=0;i--){
          if(triggerLine>=itemStartY[i]){idx=i;break;}
        }
        setState(idx);
      };

      const tick=rafThrottle(compute);

      const disable=()=>{
        enabled=false;
        wasSticky=false;
        kickerTopPx=0;
        setState(-2);
      };

      const enable=()=>{
        enabled=true;
        wasSticky=false;
        kickerTopPx=0;
        measure();
        compute();
      };

      const applyMode=()=>{
        if(mq.matches) disable();
        else enable();
      };

      window.addEventListener("scroll",()=>enabled&&tick(),{passive:true});

      window.addEventListener("resize",()=>{
        applyMode();
        if(enabled){measure();tick();}
      },{passive:true});

      window.addEventListener("orientationchange",()=>{
        applyMode();
        if(enabled){measure();tick();}
      });

      if(document.fonts&&document.fonts.ready){
        document.fonts.ready.then(()=>{
          if(enabled){measure();tick();}
        });
      }

      window.addEventListener("load",()=>{
        applyMode();
        if(enabled){measure();tick();}
      },{once:true});

      s4.addEventListener("transitionend",(e)=>{
        if(!enabled) return;
        if(!e.target||!e.target.classList) return;
        if(!e.target.classList.contains("about-s4__panel")) return;
        measure();
        tick();
      });

      $$(".about-s4__btn",s4).forEach(btn=>{
        btn.addEventListener("click",()=>{
          if(!enabled) return;
          requestAnimationFrame(()=>{measure();tick();});
          setTimeout(()=>{measure();tick();},480);
        });
      });

      if("ResizeObserver" in window){
        const ro=new ResizeObserver(()=>{
          if(!enabled) return;
          measure();
          tick();
        });
        ro.observe(s4);
        ro.observe(acc);
      }

      applyMode();
    };

    return {init};
  })();

  /* =========================================================
     7) S56 PIN Driver (OPTION A - NO RESTORE) - bind once
  ========================================================= */
  const s56Pin=(()=>{
    const init=()=>{
      root.classList.add("is-js");

      const s56=$("[data-s56]");
      const wrap=s56?.querySelector("[data-s56-wrap]");
      const stage=s56?.querySelector("[data-s56-stage]");
      const s5=s56?.querySelector("[data-s5]");
      const s6=s56?.querySelector("[data-s6]");
      if(!s56||!wrap||!stage||!s5||!s6) return;

      if(s56.dataset.bound==="1"){
        // 이미 바인딩 됐으면 업데이트만
        requestAnimationFrame(()=>requestAnimationFrame(update));
        return;
      }
      s56.dataset.bound="1";

      const headerH=()=>parseFloat(getComputedStyle(root).getPropertyValue("--header-h"))||0;

      /* ===== 튜닝 ===== */
      const S5_SLIDES=3;
      const S5_RATIO=0.45;
      const COVER_RATIO=0.92;
      const BG_RATIO=0.55;
      const RELEASE_RATIO=0.20;
      const MIN_DIST=180;

      let stageH=1,s5Dist=1,coverDist=1,bgDist=1,releaseDist=1,totalDist=1;
      let prevT=0,vel=0;
      let ticking=false;

      const layout=()=>{
        stageH=Math.max(1,window.innerHeight-headerH());
        s5Dist=Math.max(MIN_DIST,stageH*S5_RATIO);
        coverDist=Math.max(MIN_DIST,stageH*COVER_RATIO);
        bgDist=Math.max(MIN_DIST,stageH*BG_RATIO);
        releaseDist=Math.max(80,stageH*RELEASE_RATIO);
        totalDist=s5Dist+coverDist+bgDist+releaseDist;
        wrap.style.height=`${stageH+totalDist}px`;
      };

      /* -------------------------
         S5
      ------------------------- */
      const track=s5.querySelector("[data-s5-track]");
      const slides=track?[...track.querySelectorAll(".about-s5__slide")]:[];

      const buildS5TitleSpans=()=>{
        $("[data-s5-title]",s56) && $$("[data-s5-title]",s56).forEach(el=>{
          if(el.dataset.built==="1") return;
          const raw=el.innerHTML.replace(/<br\s*\/?>/gi,"\n");
          const lines=raw.split("\n").map(s=>s.trim()).filter(Boolean);
          el.innerHTML=lines.map(line=>`<span>${line}</span>`).join("<br />");
          $$("span",el).forEach((sp,i)=>sp.style.transitionDelay=`${Math.min(i*90,240)}ms`);
          el.dataset.built="1";
        });
      };
      buildS5TitleSpans();

      const btnPrev=s5.querySelector("[data-s5-prev]");
      const btnNext=s5.querySelector("[data-s5-next]");
      const pad2=(n)=>String(n).padStart(2,"0");
      let s5Index=0;

      const syncCounter=()=>{
        const curText=pad2(s5Index+1);
        const totText=pad2(slides.length||S5_SLIDES);
        $$("[data-s5-count]",s5).forEach(el=>{
          const curEl=el.querySelector("[data-s5-cur]");
          const totEl=el.querySelector("[data-s5-total]");
          if(curEl) curEl.textContent=curText;
          if(totEl) totEl.textContent=totText;
        });
      };

      const bootTitle=(slide)=>{
        if(prefersReduce) return;
        const h=slide?.querySelector("[data-s5-title]");
        if(!h) return;
        h.classList.add("is-boot");
        void h.offsetWidth;
        requestAnimationFrame(()=>h.classList.remove("is-boot"));
      };

      const showS5=(idx)=>{
        if(!slides.length) return;
        const next=clamp(idx,0,slides.length-1);
        slides.forEach((s,i)=>s.classList.toggle("is-active",i===next));
        s5Index=next;
        syncCounter();
        bootTitle(slides[next]);
      };

      if(slides.length){
        slides.forEach((s,i)=>s.classList.toggle("is-active",i===0));
        syncCounter();
        bootTitle(slides[0]);
      }

      btnPrev && btnPrev.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();showS5(s5Index-1);});
      btnNext && btnNext.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();showS5(s5Index+1);});

      /* -------------------------
         S6: reveal + bg + theme
      ------------------------- */
      const bgItems=[...s6.querySelectorAll("[data-s6-bg-item]")];
      const titleEl=s6.querySelector("[data-s6-title]");

      const buildS6TitleSpans=()=>{
        if(!titleEl||titleEl.dataset.built==="1") return;
        const raw=titleEl.innerHTML.replace(/<br\s*\/?>/gi,"\n");
        const lines=raw.split("\n").map(s=>s.trim()).filter(Boolean);
        titleEl.innerHTML=lines.map(line=>`<span>${line}</span>`).join("<br />");
        $$("span",titleEl).forEach((sp,i)=>sp.style.transitionDelay=`${Math.min(i*90,240)}ms`);
        titleEl.dataset.built="1";
      };
      buildS6TitleSpans();

      let s6Revealed=false;
      const revealS6=()=>{
        if(s6Revealed) return;
        s6Revealed=true;
        $$("[data-s6-reveal]",s6).forEach(el=>el.classList.add("is-in"));
        const t=s6.querySelector("[data-s6-reveal-title]");
        if(t) t.classList.add("is-in");
        if(titleEl) titleEl.classList.add("is-in");
      };

      const applyS6ColorsFromBg=(idx)=>{
        const item=bgItems[idx];
        if(!item) return;

        const fg=item.getAttribute("data-fg");
        const fgDim=item.getAttribute("data-fg-dim");
        const btnBg=item.getAttribute("data-btn-bg");
        const btnFg=item.getAttribute("data-btn-fg");
        const scrim=item.getAttribute("data-scrim");

        fg && root.style.setProperty("--s6-fg",fg);
        fgDim && root.style.setProperty("--s6-fg-dim",fgDim);
        btnBg && root.style.setProperty("--s6-btn-bg",btnBg);
        btnFg && root.style.setProperty("--s6-btn-fg",btnFg);
        if(scrim!=null) root.style.setProperty("--s6-scrim",String(clamp(parseFloat(scrim)||0,0,0.35)));
      };

      let bgIndex=0;
      const setBg=(idx,force=false)=>{
        if(!bgItems.length) return;
        const next=clamp(idx,0,bgItems.length-1);
        if(!force && next===bgIndex) return;
        bgItems.forEach((it,i)=>it.classList.toggle("is-active",i===next));
        bgIndex=next;
        applyS6ColorsFromBg(next);
      };

      // jitter
      let jitterRAF=0;
      let jitterOn=false;

      const startJitter=()=>{
        if(prefersReduce||!titleEl||jitterOn) return;
        jitterOn=true;
        titleEl.classList.add("is-jitter");

        const loop=()=>{
          if(!jitterOn) return;

          const amp=clamp(vel*0.004,0,1);
          const baseX=1.2,baseY=0.9,baseR=0.10;
          const addX=3.8*amp,addY=3.0*amp,addR=0.35*amp;

          const jx=((Math.random()*2-1)*(baseX+addX)).toFixed(2);
          const jy=((Math.random()*2-1)*(baseY+addY)).toFixed(2);
          const rot=((Math.random()*2-1)*(baseR+addR)).toFixed(2);

          titleEl.style.setProperty("--s6-jx",`${jx}px`);
          titleEl.style.setProperty("--s6-jy",`${jy}px`);
          titleEl.style.setProperty("--s6-rot",`${rot}deg`);

          jitterRAF=requestAnimationFrame(loop);
        };

        jitterRAF=requestAnimationFrame(loop);
      };

      const stopJitter=()=>{
        jitterOn=false;
        if(jitterRAF) cancelAnimationFrame(jitterRAF);
        jitterRAF=0;
        if(!titleEl) return;
        titleEl.classList.remove("is-jitter");
        titleEl.style.removeProperty("--s6-jx");
        titleEl.style.removeProperty("--s6-jy");
        titleEl.style.removeProperty("--s6-rot");
      };

      function update(){
        ticking=false;
        layout();

        const r=wrap.getBoundingClientRect();
        const t=clamp(-r.top,0,totalDist);

        const dt=Math.max(1,Math.abs(t-prevT));
        vel=vel*0.85+dt*0.15;
        prevT=t;

        // S5 scroll-driven
        const pS5=clamp01(t/s5Dist);
        const slideIdx=Math.min(S5_SLIDES-1,Math.floor(pS5*(S5_SLIDES-1)+1e-6));
        showS5(slideIdx);

        // cover
        const pCover=clamp01((t-s5Dist)/coverDist);
        s56.style.setProperty("--s56-p",String(pCover));
        s56.style.setProperty("--s56-cover",String(pCover));
        if(pCover>0.06) revealS6();

        // BG after cover done
        const coverDone=pCover>=0.995;
        if(coverDone){
          s6.classList.add("is-bg-on");
          const pBG=clamp01((t-s5Dist-coverDist)/bgDist);
          const bgIdx=Math.min(3,Math.floor(pBG*3+1e-6));
          setBg(bgIdx);
        }else{
          s6.classList.remove("is-bg-on");
        }

        const inBG=coverDone && t>s5Dist+coverDist+10 && t<s5Dist+coverDist+bgDist-10;
        if(inBG) startJitter();
        else stopJitter();
      }

      const onScroll=()=>{
        if(ticking) return;
        ticking=true;
        requestAnimationFrame(update);
      };

      window.addEventListener("scroll",onScroll,{passive:true});
      window.addEventListener("resize",()=>requestAnimationFrame(update),{passive:true});
      if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(update));

      requestAnimationFrame(()=>requestAnimationFrame(update));
    };

    return {init};
  })();

  /* =========================================================
     8) S6 CTA SVG 교체 (1회)
  ========================================================= */
  const forceCtaSvg=(()=>{
    const init=()=>{
      const a=$(".about-s6__cta");
      if(!a) return;
      const svg=$("svg",a);
      if(!svg) return;
      if(svg.dataset.forced==="1") return;
      svg.dataset.forced="1";

      const vb=svg.getAttribute("viewBox")||"";
      if(vb==="0 0 24 24") return;

      svg.setAttribute("viewBox","0 0 24 24");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.innerHTML=`<path d="M5 12H19M19 12L13 6M19 12L13 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    return {init};
  })();

  /* ----------------------------------------------------------
     Boot orchestration (중복 실행 방지)
  ---------------------------------------------------------- */
  const bootAll=()=>{
    // 모바일 자동 스크롤: 진입마다 재-암(내부에서 중복 방지)
    autoScrollHeroSub.arm();

    // 나머지는 재실행해도 안전(내부 guard로 중복 리스너 방지)
    heroSplit.init();
    reveal.init();
    marquee.init();
    accordion.init();
    s4Emoji.init();
    s56Pin.init();
    forceCtaSvg.init();
  };

  document.addEventListener("DOMContentLoaded",bootAll);
  window.addEventListener("load",bootAll,{once:true});

  // bfcache 대응: 뒤로가기/앞으로가기 복귀 시 다시 “진입”처럼
  window.addEventListener("pageshow",()=>{
    bootAll();
  });
})();
