/* =========================================================
   text-fill.js
   - [data-fill] 공용 본문 글자색 채우기
   - 원래 색 / 안쪽 요소 / 화면 읽기 원문 보존
   - 근처 요소만 계산 / rAF / 움직임 줄이기
========================================================= */

(() => {
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clamp01=(v)=>clamp(v,0,1);
  const rafThrottle=(fn)=>{
    let raf=0;
    return ()=>{
      if(raf) return;
      raf=requestAnimationFrame(()=>{raf=0;fn();});
    };
  };
  const elements=$$("[data-fill]");
  if(!elements.length) return;

  const reduceQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
  const active=new Set();
  const fills=[];
  let initialized=false;

  /* ----------------------------------------------------------
     1) 글자 노드만 나누기 / 원문은 화면 읽기에 한 번만 제공
  ---------------------------------------------------------- */
  const split=(el)=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const nodes=[];
    const chars=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(!node.textContent.trim()) return;
      // 자식 문단이나 강조 태그에 따로 지정된 원래 색도 보존한다.
      const color=getComputedStyle(node.parentElement).color;
      const dim=`color-mix(in srgb, ${color} 25%, transparent)`;
      const frag=document.createDocumentFragment();
      // 숨겨진 아코디언도 원문을 보존하고 제목·문단·강조 구조를 유지한다.
      const readable=document.createElement("span");
      readable.className="text-fill-readable";
      readable.textContent=node.textContent;
      readable.style.cssText="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:pre-line;border:0;";
      frag.appendChild(readable);
      for(const ch of node.textContent){
        const span=document.createElement("span");
        span.className="text-fill-char";
        span.setAttribute("aria-hidden","true");
        span.textContent=ch;
        span.style.color=dim;
        frag.appendChild(span);
        chars.push({span,color,dim});
      }
      node.replaceWith(frag);
    });
    return {el,chars,count:0};
  };

  /* ----------------------------------------------------------
     2) 서비스와 같은 위치 계산 / 개수가 바뀐 구간만 색 변경
  ---------------------------------------------------------- */
  const paint=(fill,count)=>{
    if(count===fill.count) return;
    const start=Math.min(count,fill.count);
    const end=Math.max(count,fill.count);
    for(let i=start;i<end;i++){
      const ch=fill.chars[i];
      ch.span.style.color=i<count?ch.color:ch.dim;
    }
    fill.count=count;
  };
  const update=()=>{
    if(reduceQuery.matches) return;
    const vh=window.innerHeight;
    fills.forEach(fill=>{
      if(!active.has(fill.el)) return;
      const r=fill.el.getBoundingClientRect();
      if(!r.height) return;
      const p=clamp01((vh*.9-r.top)/(Math.min(r.height,vh)*.8+vh*.25));
      paint(fill,Math.ceil(p*fill.chars.length));
    });
  };
  const tick=rafThrottle(update);
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) active.add(entry.target);
      else active.delete(entry.target);
    });
    tick();
  },{rootMargin:"120px 0px",threshold:0});

  /* ----------------------------------------------------------
     3) 초기·설정 변경 / 아코디언과 글꼴의 높이 변경
  ---------------------------------------------------------- */
  const sizes=new ResizeObserver(tick);
  const applyMode=()=>{
    // 처음부터 움직임 줄이기이면 원문 DOM을 나누지 않는다.
    if(!initialized&&!reduceQuery.matches){
      elements.forEach(el=>{
        fills.push(split(el));
        observer.observe(el);
        sizes.observe(el);
      });
      initialized=true;
    }
    if(reduceQuery.matches) fills.forEach(fill=>paint(fill,fill.chars.length));
    else tick();
  };
  window.addEventListener("scroll",tick,{passive:true});
  window.addEventListener("resize",tick,{passive:true});
  window.addEventListener("load",tick,{once:true});
  window.addEventListener("pageshow",tick);
  document.addEventListener("click",tick);
  document.addEventListener("transitionend",tick);
  reduceQuery.addEventListener("change",applyMode);
  if(document.fonts) document.fonts.ready.then(tick);
  applyMode();
})();
