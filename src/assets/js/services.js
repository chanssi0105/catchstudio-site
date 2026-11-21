/* =========================================================
   services.js
   - is-ready / About 공용 도우미 / 줄별 제목 등장
   - 본문 글자색 채우기는 공용 text-fill.js에서 처리 (질문 제외)
   - 모니터 화면 확대 → 실제 서비스 01 인계 (휴대폰은 같은 행에서 확대)
   - 실제 겹침 높이에 따른 서비스 축소·어두워짐
   - 아코디언 / FAQ 이모지 / Experience 벤토 / 글자 띠 / Process
   - CTA 사진·글자색 동시 교체 / 움직임 줄이기
========================================================= */

(() => {
  const root=document.documentElement;
  const page=document.querySelector(".svc-page");
  if(!page) return;

  const reduceQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery=window.matchMedia("(max-width: 767px)");
  let prefersReduce=reduceQuery.matches;
  const $=(s,r=page)=>r.querySelector(s);
  const $$=(s,r=page)=>[...r.querySelectorAll(s)];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clamp01=(v)=>clamp(v,0,1);
  const rafThrottle=(fn)=>{
    let raf=0;
    return ()=>{
      if(raf) return;
      raf=requestAnimationFrame(()=>{raf=0;fn();});
    };
  };
  const getHeaderH=()=>{
    const n=parseFloat(getComputedStyle(root).getPropertyValue("--header-h"));
    return Number.isFinite(n)?n:70;
  };
  const cards=$$(".svc-services > .svc-service");
  const gallery=$(".svc-gallery");
  const track=$(".svc-gallery__track");
  const galleryCards=$$(".svc-gallery__card");
  const center=$(".svc-gallery__center");
  const centerImage=$("img",center);
  const band=$(".svc-band");
  const experience=$(".svc-experience");
  const faq=$(".svc-faq");
  const bento=$(".svc-bento");
  const steps=$$(".svc-process li");
  const cta=$(".svc-cta");
  const backgrounds=$$(".svc-cta__backgrounds img");
  const panels=$$(".svc-accordion");
  const active=new Set();
  let lastY=window.scrollY;
  let ctaIndex=-1;

  /* ----------------------------------------------------------
     0) is-ready / 제목 등장
  ---------------------------------------------------------- */
  const markReady=()=>{
    if(root.classList.contains("is-ready")) return;
    requestAnimationFrame(()=>root.classList.add("is-ready"));
  };
  $$("[data-reveal-title]").forEach(el=>{
    const lines=el.innerHTML.split(/<br\s*\/?\s*>/i);
    el.innerHTML=lines.map((line,i)=>`<span class="svc-line" style="--svc-delay:${i*90}ms">${line}</span>`).join("<br />");
    // 서비스 영문과 CTA 제목은 읽는 동안 숨김 상태가 되지 않는다.
    if(el.closest(".svc-service,.svc-cta")) el.classList.add("is-in");
  });

  /* ----------------------------------------------------------
     2) 소개 사진 → 실제 서비스 01 (복제 화면 없음)
  ---------------------------------------------------------- */
  const stage=$(".svc-gallery__stage");
  const visual=document.createElement("div");
  visual.className="svc-gallery__visual";
  visual.setAttribute("aria-hidden","true");
  const shade=document.createElement("div");
  shade.className="svc-gallery__shade";
  shade.setAttribute("aria-hidden","true");
  stage.prepend(shade);
  stage.append(visual);
  visual.append(centerImage);
  const ease=(t)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const logLerp=(a,b,t)=>Math.exp(lerp(Math.log(a),Math.log(b),t));
  const firstPhoto=$(".svc-service__photo",cards[0]);
  const revealItems=$$(".svc-service__no,.svc-service__english .svc-line,h2,.svc-service__catch,.svc-service__desc,.svc-service__make,.svc-service__link",cards[0]);
  revealItems.forEach(el=>el.classList.add("svc-entry-reveal"));
  const mobileEntries=new Set();
  const entryObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting&&page.classList.contains("is-gallery-done")) mobileEntries.add(entry.target);
    });
    tick();
  },{threshold:.15});
  revealItems.forEach(el=>entryObserver.observe(el));
  const updateEntry=(done,r,travel,vh)=>{
    if(!done){
      mobileEntries.clear();
      revealItems.forEach(el=>el.style.setProperty("--svc-entry","0"));
      return;
    }
    if(mobileQuery.matches){
      // 휴대폰: 넘겨받은 뒤 스크롤한 거리만큼 글이 위에서부터 차례로 나타나고, 위로 되감으면 차례로 사라진다.
      // 넘겨주는 순간(카드 위 = 0)에는 모두 0이라 확대 화면과 이어지고, 화면 아래에 있는 글은 들어올 때 나타난다.
      const cardTop=cards[0].getBoundingClientRect().top;
      const past=Math.max(0,-cardTop);
      revealItems.forEach((el,i)=>{
        let y=0,node=el;
        while(node&&node!==cards[0]){
          y+=node.offsetTop;
          node=node.offsetParent;
        }
        const seq=clamp01((past-i*28)/120);
        const vis=clamp01((vh*1.02-(cardTop+y))/(vh*.1));
        el.style.setProperty("--svc-entry",String(Math.min(seq,vis)));
      });
      return;
    }
    const hold=parseFloat(getComputedStyle(cards[1]).marginTop)||vh*1.2;
    const part=parseFloat(getComputedStyle(page).getPropertyValue("--svc-entry-part"))||.55;
    const p=clamp01((-r.top-travel)/Math.max(1,hold*part));
    const duration=1-(revealItems.length-1)/revealItems.length*.8;
    revealItems.forEach((el,i)=>{
      el.style.setProperty("--svc-entry",String(clamp01((p-i/revealItems.length*.8)/duration)));
    });
  };
  let target=null;
  const measureTarget=()=>{
    const card=cards[0].getBoundingClientRect();
    let x=0,y=0,node=firstPhoto;
    while(node&&node!==cards[0]){
      x+=node.offsetLeft;
      y+=node.offsetTop;
      node=node.offsetParent;
    }
    target={x:card.left+x,y,w:firstPhoto.offsetWidth,h:firstPhoto.offsetHeight,cardH:cards[0].offsetHeight};
  };
  // cover와 서비스 translateY / scale을 같은 좌표계에서 계산한다.
  const cover=(w,h)=>{
    const ratio=2400/3000;
    const iw=Math.max(w,h*ratio);
    const ih=iw/ratio;
    return {x:(w-iw)/2,y:(h-ih)/2,w:iw,h:ih};
  };
  const updateGallery=(vh,vw)=>{
    const r=gallery.getBoundingClientRect();
    const mobile=mobileQuery.matches;
    const stageH=stage.offsetHeight;
    const travel=Math.max(1,r.height-stageH);
    const p=clamp01(-r.top/travel);
    const done=-r.top>=travel;
    page.classList.toggle("is-gallery-done",done);
    cards[0].inert=!done;
    updateEntry(done,r,travel,vh);
    if(!target) measureTarget();
    // 휴대폰은 22px에서 출발하고 모니터 컷까지 같은 행으로 이동한다.
    // 휴대폰은 사진 줄을 소개 글 쪽으로 끌어올렸으므로(CSS margin-top) 그만큼 늦게 출발시켜 첫 장이 22px에서 보이게 한다.
    const pull=mobile?64-(parseFloat(getComputedStyle(gallery).marginTop)||64):0;
    const lead=mobile?clamp01((vh-r.top-pull)/(vh+travel*.36-pull)):0;
    const destination=vw/2-(center.offsetLeft+center.offsetWidth/2);
    track.style.transform=mobile?`translate3d(${lerp(22,destination,ease(lead))}px,0,0)`:"translateX(-50%)";
    const base=center.getBoundingClientRect();
    const sr=stage.getBoundingClientRect();
    const start=mobile?.36:0;
    const end=mobile?.63:.4;
    const enter=ease(clamp01((p-start)/(end-start)));
    const hold=clamp01((p-end)/((mobile?.7:.5)-end));
    const retreat=ease(clamp01((p-(mobile?.7:.5))/((mobile?.95:.95)-(mobile?.7:.5))));
    const full={x:0,y:0,w:vw,h:stageH};
    const initial={x:base.left,y:base.top-sr.top,w:base.width,h:base.height};
    const frame={};
    ["x","y","w","h"].forEach(k=>frame[k]=lerp(lerp(initial[k],full[k],enter),target[k],retreat));
    const original=cover(initial.w,initial.h);
    const screen=centerImage.dataset.screen.split(" ").map(Number);
    // 모니터 폭 80%를 목표로 하되 사진 전체 cover 배율을 하한으로 한다.
    const zoomW=Math.max(vw*.8/screen[2],vw,stageH/1.25);
    const zoomH=zoomW*1.25;
    const zoom=mobile?cover(vw,stageH):{x:clamp(vw/2-(screen[0]+screen[2]/2)*zoomW,vw-zoomW,0),y:clamp(stageH/2-(screen[1]+screen[3]/2)*zoomH,stageH-zoomH,0),w:zoomW,h:zoomH};
    const push=1+hold*.02;
    const zoomed={x:vw/2+(zoom.x-vw/2)*push,y:stageH/2+(zoom.y-stageH/2)*push,w:zoom.w*push,h:zoom.h*push};
    const final=cover(target.w,target.h);
    const cardP=clamp01(vh/(vh+target.cardH));
    const scale=1+cardP*.06;
    const translate=(cardP-.5)*(mobile?14:28);
    final.x=target.w/2+(final.x-target.w/2)*scale;
    final.y=target.h/2+(final.y-target.h/2)*scale+translate;
    final.w*=scale;
    final.h*=scale;
    const image={};
    ["x","y"].forEach(k=>image[k]=lerp(lerp(original[k],zoomed[k],enter),final[k],retreat));
    ["w","h"].forEach(k=>image[k]=logLerp(logLerp(original[k],zoomed[k],enter),final[k],retreat));
    // 위치는 직선, 크기는 로그로 보간해서 중간에 사진이 칸보다 작아져 오른쪽이 비던 문제: 항상 칸을 덮도록 키우고 칸 안으로 맞춘다.
    const coverScale=Math.max(1,frame.w/image.w,frame.h/image.h);
    if(coverScale>1){
      const cx=image.x+image.w/2,cy=image.y+image.h/2;
      image.w*=coverScale;
      image.h*=coverScale;
      image.x=cx-image.w/2;
      image.y=cy-image.h/2;
    }
    image.x=clamp(image.x,frame.w-image.w,0);
    image.y=clamp(image.y,frame.h-image.h,0);
    Object.assign(visual.style,{left:`${frame.x}px`,top:`${frame.y}px`,width:`${frame.w}px`,height:`${frame.h}px`,borderRadius:`${(mobile?16:32)*(1-enter)}px`});
    Object.assign(centerImage.style,{left:`${image.x}px`,top:`${image.y}px`,width:`${image.w}px`,height:`${image.h}px`,filter:`brightness(${lerp(1,.64,retreat)})`});
    // 빈 불투명 면만 이동하며 실제 글자는 넘겨준 뒤 한 번만 등장한다.
    Object.assign(shade.style,{width:`${vw}px`,height:`${target.cardH}px`,transform:mobile?`translateY(${(1-retreat)*stageH}px)`:`translateX(${-(1-retreat)*vw}px)`});
    galleryCards.forEach((el,i)=>{
      if(el===center) return;
      const arriving=mobile?1:clamp01((vh-r.top-i*35)/(vh*.65));
      el.style.transform=`translate3d(${(mobile||i<2?-1:1)*enter*vw*.4}px,${(1-arriving)*150}px,0)`;
      el.style.opacity=String(arriving*(1-enter));
    });
  };

  /* ----------------------------------------------------------
     3) 서비스 겹침 / 사진 이동
  ---------------------------------------------------------- */
  const updateCards=(vh)=>{
    const rects=cards.map(card=>card.getBoundingClientRect());
    cards.forEach((card,i)=>{
      if(!active.has(card)&&!active.has(cards[i+1])) return;
      const r=rects[i],next=rects[i+1];
      // 화면 진입률이 아닌 실제 두 카드가 겹친 높이를 사용한다.
      const overlap=next?Math.max(0,Math.min(r.bottom,vh)-Math.max(next.top,r.top,0)):0;
      const cover=next?clamp01(overlap/Math.min(vh,r.height)):0;
      card.style.setProperty("--svc-cover",String(cover*.3));
      card.style.setProperty("--svc-card-scale",String(mobileQuery.matches?1-cover*.05:1));
      const p=clamp01((vh-r.top)/(vh+r.height));
      $(".svc-service__photo img",card).style.transform=`translateY(${(p-.5)*(mobileQuery.matches?14:28)}px) scale(${1+p*.06})`;
    });
    cards[cards.length-1].style.setProperty("--svc-cover","0");
    cards[cards.length-1].style.setProperty("--svc-card-scale","1");
  };

  /* ----------------------------------------------------------
     4) 아코디언 / 이모지
  ---------------------------------------------------------- */
  let faqClickY=null;
  const initialOpen=panels.map(item=>item.classList.contains("is-open"));
  const pop=(emoji)=>{
    if(!emoji||prefersReduce) return;
    emoji.getAnimations().forEach(animation=>animation.cancel());
    emoji.animate([{transform:"scale(1)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],{duration:250,easing:"ease-out"});
  };
  const syncPanel=(item,open)=>{
    item.classList.toggle("is-open",open);
    $("button",item).setAttribute("aria-expanded",String(open));
    $(".svc-accordion__panel",item).inert=!open;
  };
  panels.forEach(item=>{
    $("button",item).addEventListener("click",()=>{
      faqClickY=window.scrollY;
      setFaqEmoji(item.dataset.emoji);
      if(prefersReduce) return;
      syncPanel(item,!item.classList.contains("is-open"));
      tick();
    });
  });
  const updateExperience=(vh)=>{
    if(!active.has(experience)) return;
    const p=clamp01((vh*.7-$("h2",experience).getBoundingClientRect().top)/(vh*.4));
    experience.style.setProperty("--svc-mark",`${p*100}%`);

  };


  const setFaqEmoji=(icon)=>{
    const emoji=$(".svc-emoji",faq);
    if(!icon||emoji.textContent===icon) return;
    emoji.textContent=icon;
    pop(emoji);
  };
  const updateFaq=(vh)=>{
    if(!active.has(faq)||faqClickY===window.scrollY) return;
    faqClickY=null;
    // 왼쪽 아이콘 바로 옆에 걸린 질문의 아이콘을 보여준다.
    // 질문 제목 가운데가 아이콘 가운데 + 35px(접힌 질문 간격의 절반)을 마지막으로 지난 질문이 현재 질문, 아직 없으면 💬.
    const er=$(".svc-emoji",faq).getBoundingClientRect();
    const line=(er.top+er.bottom)/2+35;
    let current="💬";
    $$("[data-emoji]",faq).forEach(el=>{
      const r=($("button",el)||el).getBoundingClientRect();
      if((r.top+r.bottom)/2<=line) current=el.dataset.emoji;
    });
    setFaqEmoji(current);
  };

  /* ----------------------------------------------------------
     4b) Experience / 스크롤 등장 / 숫자 / 안경 / 점 지구본
  ---------------------------------------------------------- */
  const bentoTiles=$$(".svc-bento__tile",bento);
  const director=$(".svc-director",bento);
  const directorTile=bentoTiles[0];
  const odometers=$$("[data-odometer]",bento);
  const globe=$(".svc-globe",bento);
  const globeTile=$(".svc-bento__global",bento);
  const canvas=$("canvas",globe);
  const context=canvas.getContext("2d");
  const bentoAnimations=[];
  const playedTiles=new Set();
  let bentoGeneration=0,globeVisible=false,globeRaf=0,globeTime=0;
  let globeBoost=0,globeSize=0,globeElapsed=0;
  const radians=(degrees)=>degrees*Math.PI/180;
  const initialAngle=radians(-147);
  let globeAngle=initialAngle;
  const globePoints=[];
  for(let lat=-80;lat<=80;lat+=10){
    for(let lon=-180;lon<180;lon+=10) globePoints.push([lat,lon]);
  }
  // 도시는 가장 가까운 격자 점에 맞춰, 그 자리의 빨강 점을 흰 점으로 바꾼다(서울·뉴욕·샌프란시스코·런던·싱가포르·도쿄·시드니).
  const snap=(value)=>Math.round(value/10)*10;
  const cities=[[37.5,127],[40.7,-74],[37.8,-122.4],[51.5,-.1],[1.35,103.8],[35.7,139.7],[-33.9,151.2]].map(([lat,lon])=>[snap(lat),snap(lon)]);
  const cityKeys=new Set(cities.map(([lat,lon])=>`${lat},${lon}`));
  const projectPoint=(lat,lon)=>{
    const a=radians(lat),b=radians(lon)+globeAngle;
    const x=Math.cos(a)*Math.sin(b),y=Math.sin(a),z=Math.cos(a)*Math.cos(b);
    const tilt=radians(15);
    return {x,y:y*Math.cos(tilt)-z*Math.sin(tilt),z:y*Math.sin(tilt)+z*Math.cos(tilt)};
  };
  const drawGlobe=()=>{
    if(!context||!globeSize) return;
    const size=globeSize,radius=size*.46,dot=size*.0105;
    context.clearRect(0,0,size,size);
    const point=(p,r,color,alpha)=>{
      context.globalAlpha=alpha;
      context.fillStyle=color;
      context.beginPath();
      context.arc(size/2+p.x*radius,size/2-p.y*radius,r,0,Math.PI*2);
      context.fill();
    };
    globePoints.filter(([lat,lon])=>!cityKeys.has(`${lat},${lon}`)).map(([lat,lon])=>projectPoint(lat,lon)).filter(p=>p.z>0).sort((a,b)=>a.z-b.z).forEach(p=>{
      point(p,dot*(.35+.65*p.z),"#DC152A",.3+.7*p.z);
    });
    cities.forEach(([lat,lon],i)=>{
      const p=projectPoint(lat,lon);
      if(p.z<=0) return;
      point(p,dot*(.35+.65*p.z)*(i===0?1.5:1),"#fff",(.3+.7*p.z)*(i===0?1:.85));
      if(i!==0||prefersReduce) return;
      for(let ring=0;ring<2;ring++){
        const phase=(globeElapsed/2400+ring*.5)%1;
        context.globalAlpha=(1-phase)*.7;
        context.strokeStyle="#fff";
        context.lineWidth=Math.max(1,size/420);
        context.beginPath();
        context.arc(size/2+p.x*radius,size/2-p.y*radius,dot*(1.6+phase*6),0,Math.PI*2);
        context.stroke();
      }
    });
    context.globalAlpha=1;
    globe.classList.add("is-ready");
  };
  const sizeGlobe=()=>{
    if(!context) return;
    globeSize=globe.clientWidth;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(globeSize*dpr);
    canvas.height=Math.round(globeSize*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
    if(!prefersReduce) drawGlobe();
  };
  const animateGlobe=(now)=>{
    globeRaf=0;
    if(!globeVisible||prefersReduce||document.hidden||!context) return;
    const dt=Math.min(64,now-globeTime||0);
    globeTime=now;
    globeBoost*=Math.exp(-dt/350);
    globeAngle+=dt/40000*Math.PI*2*(1+globeBoost);
    globeElapsed+=dt;
    drawGlobe();
    globeRaf=requestAnimationFrame(animateGlobe);
  };
  const resumeBento=()=>{
    const running=globeVisible&&!prefersReduce&&!document.hidden;
    bentoAnimations.forEach(run=>{
      if(run.playState==="finished"||run.playState==="idle") return;
      const visible=active.has(bento)&&!document.hidden;
      if(visible&&!prefersReduce) run.play();
      else run.pause();
    });
    if(running&&context){
      globeTime=performance.now();
      if(!globeRaf) globeRaf=requestAnimationFrame(animateGlobe);
    }else{
      cancelAnimationFrame(globeRaf);
      globeRaf=0;
    }
  };
  // 등장하는 동안 0이 보이도록 숫자 띠를 미리 만든다.
  // 굴러가는 동안은 가장 넓은 숫자 폭, 멈추면 마지막 숫자의 실제 폭(1은 좁음)으로 줄인다.
  const digitWidth=(el,text)=>{
    const probe=document.createElement("span");
    probe.style.display="inline-block";
    probe.textContent=text;
    el.append(probe);
    const width=probe.getBoundingClientRect().width/parseFloat(getComputedStyle(el).fontSize);
    probe.remove();
    return width;
  };
  const buildNumber=(el)=>{
    const final=el.dataset.odometer;
    el.textContent="";
    const widest=Math.max(...[..."0123456789"].map(n=>digitWidth(el,n)));
    [...final].forEach(digit=>{
      const box=document.createElement("span");
      box.className="svc-odo__digit";
      box.style.width=`${widest}em`;
      box.dataset.width=`${digitWidth(el,digit)}em`;
      const strip=document.createElement("span");
      strip.className="svc-odo__strip";
      const stop=20+Number(digit);
      strip.innerHTML=Array.from({length:stop+1},(_,n)=>`<span>${n%10}</span>`).join("");
      box.append(strip);
      el.append(box);
    });
  };
  const startNumber=(tile)=>{
    const el=$("[data-odometer]",tile);
    if(!el) return;
    const generation=bentoGeneration;
    if(!$(".svc-odo__strip",el)) buildNumber(el);
    const runs=$$(".svc-odo__strip",el).map((strip,i)=>{
      const stop=strip.children.length-1;
      const run=strip.animate([{transform:"translateY(0)"},{transform:`translateY(-${stop/(stop+1)*100}%)`}],{duration:1200+i*200,easing:"cubic-bezier(.65,0,.35,1)",fill:"forwards"});
      bentoAnimations.push(run);
      return run.finished.then(()=>{
        if(generation===bentoGeneration) strip.parentElement.style.width=strip.parentElement.dataset.width;
      }).catch(()=>{});
    });
    Promise.all(runs).then(()=>{
      if(generation===bentoGeneration&&!prefersReduce) tile.classList.add("is-counted");
    });
  };
  const drawGlasses=()=>{
    directorTile.classList.add("is-drawn");
    $$("circle",director).forEach((circle,i)=>{
      const run=circle.animate([{strokeDashoffset:"282.744"},{strokeDashoffset:"0"}],{duration:450,delay:i*450,easing:"cubic-bezier(.65,0,.35,1)",fill:"both"});
      bentoAnimations.push(run);
    });
    bentoAnimations.push($("rect",director).animate([{opacity:0},{opacity:1}],{duration:120,delay:780,fill:"both"}));
  };
  const updateBento=(vh)=>{
    if(!active.has(bento)||prefersReduce) return;
    const commonTop=bento.getBoundingClientRect().top;
    const mobile=mobileQuery.matches;
    // 칸마다 스크롤 시차를 크게 줘서 하나씩 따로 올라오게 한다.
    // 데스크톱: 칸 하나가 화면 높이 30% 스크롤 동안 올라오고, 다음 칸은 18% 뒤에 출발(앞 칸이 60% 올라왔을 때).
    const stagger=vh*(mobile?.08:.18);
    const span=vh*(mobile?.5:.3);
    bentoTiles.forEach((tile,i)=>{
      // offsetTop은 등장 transform에 영향을 받지 않는 원래 칸 위치다.
      const top=mobile?commonTop+tile.offsetTop-bentoTiles[0].offsetTop:commonTop;
      const arriving=clamp01((vh-top-i*stagger)/span);
      tile.style.transform=`translate3d(0,${(1-ease(arriving))*150}px,0)`;
      tile.style.opacity=String(arriving);
      if(arriving>=.95&&!playedTiles.has(tile)&&tile!==directorTile){
        playedTiles.add(tile);
        startNumber(tile);
      }
      if(tile===directorTile){
        const p=clamp01((arriving-.35)/.65);
        director.style.transform=`translateY(${(1-ease(p))*18}%) scale(${lerp(.92,1,ease(p))})`;
        if(p===1&&!playedTiles.has(tile)){
          playedTiles.add(tile);
          drawGlasses();
        }
      }
    });
  };
  const bentoObserver=new IntersectionObserver(entries=>{
    globeVisible=entries[0].isIntersecting;
    resumeBento();
  },{threshold:0});
  bentoObserver.observe(globeTile);
  document.addEventListener("visibilitychange",resumeBento);
  // 웹 글꼴이 늦게 오면 숫자 폭을 다시 잰다(아직 굴리지 않은 칸만).
  if(document.fonts) document.fonts.ready.then(()=>{
    if(prefersReduce) return;
    odometers.forEach(el=>{
      if(!playedTiles.has(el.closest(".svc-bento__tile"))) buildNumber(el);
    });
  });
  const globeSizes=new ResizeObserver(sizeGlobe);
  globeSizes.observe(globe);
  const resetBento=()=>{
    bentoGeneration++;
    bentoAnimations.forEach(run=>run.cancel());
    bentoAnimations.length=0;
    playedTiles.clear();
    bentoTiles.forEach(tile=>{
      tile.classList.remove("is-counted","is-drawn");
      tile.style.transform=prefersReduce?"":"translate3d(0,150px,0)";
      tile.style.opacity=prefersReduce?"1":"0";
      if(prefersReduce) tile.classList.add("is-counted","is-drawn");
    });
    odometers.forEach(el=>{
      el.textContent=el.dataset.odometer;
      if(!prefersReduce) buildNumber(el);
    });
    director.style.transform="";
    globeAngle=initialAngle;
    globeElapsed=0;
    globeBoost=0;
    globe.classList.remove("is-ready");
    sizeGlobe();
    resumeBento();
  };


  /* ----------------------------------------------------------
     5) 글자 띠 / Process
  ---------------------------------------------------------- */
  const updateBandAndProcess=(vh,velocity)=>{
    if(active.has(band)){
      const offset=(vh-band.getBoundingClientRect().top)*.22+velocity*.4;
      [...band.children].forEach((el,i)=>el.style.transform=`translateX(${i?offset:-offset}px)`);
    }
    steps.forEach((el,i)=>{
      if(!active.has(el)) return;
      const r=el.getBoundingClientRect();
      const p=clamp01((vh*.85-r.top)/Math.max(100,vh*.35)-(mobileQuery.matches?i%2:i)*.18);
      el.style.setProperty("--svc-progress",`${p*100}%`);
      el.style.setProperty("--svc-number",p>.75?"#000":"#d1d5db");
    });
  };

  /* ----------------------------------------------------------
     6) CTA 사진 / 글자색 (동일 프레임에서 교체)
  ---------------------------------------------------------- */
  const setCta=(index)=>{
    if(index===ctaIndex) return;
    ctaIndex=index;
    backgrounds.forEach((el,i)=>el.classList.toggle("is-active",i===index));
    cta.style.setProperty("--svc-cta-fg",index%2?"#fff":"#000");
  };
  const updateCta=(vh)=>{
    if(!active.has(cta)) return;
    const r=cta.getBoundingClientRect();
    const p=clamp01(-r.top/Math.max(1,r.height-$(".svc-cta__stage").offsetHeight));
    setCta(Math.min(3,Math.floor(p*4)));
  };

  /* ----------------------------------------------------------
     7) 화면 관찰 / 통합 스크롤 예약
  ---------------------------------------------------------- */
  const update=()=>{
    updateFaq(window.innerHeight);
    if(prefersReduce) return;
    const vh=mobileQuery.matches?stage.offsetHeight:window.innerHeight;
    const velocity=clamp(window.scrollY-lastY,-100,100);
    lastY=window.scrollY;
    globeBoost=Math.min(2,globeBoost+Math.abs(velocity)/100);
    updateBento(window.innerHeight);
    updateGallery(vh,window.innerWidth);
    updateCards(vh);
    updateExperience(vh);
    updateBandAndProcess(vh,velocity);
    updateCta(vh);
  };
  const tick=rafThrottle(update);
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){active.add(entry.target);entry.target.classList.add("is-in");}
      else active.delete(entry.target);
    });
    resumeBento();
    tick();
  },{rootMargin:"120px 0px",threshold:0});
  const watched=new Set([...$$("[data-reveal],[data-reveal-title]"),gallery,cta,...cards,band,...steps,experience,faq,bento]);
  watched.forEach(el=>observer.observe(el));
  const measure=()=>{
    page.style.setProperty("--svc-header-h",`${getHeaderH()}px`);
    cards.forEach(card=>card.style.setProperty("--svc-top",`${Math.min(0,window.innerHeight-card.offsetHeight)}px`));
    measureTarget();
    sizeGlobe();
    tick();
  };
  const applyMode=()=>{
    prefersReduce=reduceQuery.matches;
    resetBento();
    page.classList.toggle("svc-motion",!prefersReduce);
    page.classList.remove("is-gallery-done");
    panels.forEach((el,i)=>{
      syncPanel(el,prefersReduce||initialOpen[i]);
      $("button",el).disabled=false;
    });
    track.style.cssText="";
    centerImage.style.cssText="";
    cards[0].inert=false;
    mobileEntries.clear();
    revealItems.forEach(el=>el.style.removeProperty("--svc-entry"));
    if(prefersReduce) center.append(centerImage);
    else visual.append(centerImage);
    galleryCards.forEach(el=>{el.style.cssText="";el.style.setProperty("--svc-order",el.dataset.order);});
    cards.forEach(card=>{card.style.setProperty("--svc-cover","0");card.style.setProperty("--svc-card-scale","1");});
    ctaIndex=-1;
    setCta(0);
    measure();
  };
  window.addEventListener("scroll",tick,{passive:true});
  window.addEventListener("resize",measure,{passive:true});
  window.addEventListener("load",measure,{once:true});
  window.addEventListener("pageshow",()=>{markReady();measure();});
  reduceQuery.addEventListener("change",applyMode);
  mobileQuery.addEventListener("change",applyMode);
  const sizes=new ResizeObserver(measure);
  cards.forEach(card=>sizes.observe(card));
  if(document.fonts) document.fonts.ready.then(measure);
  markReady();
  applyMode();
})();
