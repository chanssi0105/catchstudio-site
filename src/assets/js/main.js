/* =========================================================
   main.js (Header + Overlay)
   - scroll -> .site-header.is-scrolled
   - burger click -> .site-header.is-open
   - when open -> header data-theme forced to "light" (restore on close)
   - overlay background click only -> close (no accidental close)
   - ESC -> close
   - lock body scroll when open (+ compensate scrollbar shift)
========================================================= */

(() => {
  const root=document.documentElement;

  window.addEventListener("load",()=>requestAnimationFrame(()=>root.classList.add("is-ready")));

  const header=document.querySelector(".site-header");
  if(!header) return;

  const burger=header.querySelector(".hamburger");
  const overlay=document.querySelector(".menu-overlay");

  const SCROLL_Y=8;
  const baseTheme=header.getAttribute("data-theme")||"light";
  let prevTheme=null;

  const setScrolled=()=>{header.classList.toggle("is-scrolled",window.scrollY>SCROLL_Y);};

  const lockScroll=(lock)=>{
    if(lock){
      const sbw=Math.max(0,window.innerWidth-root.clientWidth);
      root.style.setProperty("--sbw",sbw+"px");
      root.classList.add("is-locked");
      root.style.overflow="hidden";
      document.body.style.overflow="hidden";
      document.body.style.touchAction="none";
    }else{
      root.classList.remove("is-locked");
      root.style.removeProperty("--sbw");
      root.style.overflow="";
      document.body.style.overflow="";
      document.body.style.touchAction="";
    }
  };

  const setMenuOpen=(open)=>{
    header.classList.toggle("is-open",open);
    if(burger) burger.setAttribute("aria-expanded",open?"true":"false");
    if(overlay) overlay.setAttribute("aria-hidden",open?"false":"true");
    lockScroll(open);

    if(open){
      prevTheme=header.getAttribute("data-theme")||baseTheme;
      header.setAttribute("data-theme","light");
    }else{
      header.setAttribute("data-theme",prevTheme||baseTheme);
    }
  };

  // init
  setScrolled();
  window.addEventListener("scroll",setScrolled,{passive:true});

  // burger toggle
  if(burger){
    burger.addEventListener("click",()=>{
      setMenuOpen(!header.classList.contains("is-open"));
    });
  }

  // overlay background click only -> close
  if(overlay){
    overlay.addEventListener("click",(e)=>{
      if(e.target===overlay) setMenuOpen(false);
    });
  }

  // ESC -> close
  window.addEventListener("keydown",(e)=>{
    if(e.key==="Escape") setMenuOpen(false);
  });
})();

/* =========================================================
   Project Load More (Index Projects Grid)
   - initial render: up to data-page (default 9)
   - click "More Project" -> append next 9 from /assets/data/projects.json
   - when fully loaded -> hide label only (keep count badge)
   - smooth enter animation for appended cards
========================================================= */

(() => {
  const qs=(s,el=document)=>el.querySelector(s);

  const wrap=qs(".projects-wrap");
  const grid=qs("#projectGrid");
  if(!wrap||!grid) return;

  const btn=qs("#loadMoreBtn");
  const badge=qs("#countBadge");
  const label=qs(".projects-more-label");

  const total=Number(wrap.dataset.total||0);
  const page=Number(wrap.dataset.page||9);

  let all=null;
  let loading=false;

  const setBadge=()=>{const loaded=grid.children.length; if(badge) badge.textContent=`${loaded}/${total}`;};

  // 텍스트만 숨김(숫자 배지는 유지)
  const hideLabelOnly=()=>{if(label) label.style.display="none"; if(btn) btn.disabled=true;};
  const showLabel=()=>{if(label) label.style.display=""; if(btn) btn.disabled=false;};

  const updateUI=()=>{
    setBadge();
    if(!btn) return;
    const loaded=grid.children.length;
    const hasMore=loaded<total;
    if(!hasMore) hideLabelOnly();
    else showLabel();
  };

  const escapeHTML=(str)=>String(str).replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

  const buildCard=(item)=>{
    const t=escapeHTML(item?.title||"");
    const u=item?.url||"#";
    const th=item?.thumb||"";
    const a=document.createElement("a");
    a.className="p-card is-enter";
    a.href=u;
    a.innerHTML=`<img class="p-thumb" src="${th}" alt="${t}" loading="lazy" decoding="async"><span class="p-title">${t}</span>`;
    return a;
  };

  const animateEnter=(el)=>{
    requestAnimationFrame(()=>{
      el.classList.add("is-enter-active");
      el.classList.remove("is-enter");
    });
  };

  const ensureData=async()=>{
    if(all) return;
    const res=await fetch("/assets/data/projects.json",{cache:"no-store"});
    if(!res.ok) throw new Error(`projects.json fetch failed: ${res.status}`);
    const json=await res.json();
    all=Array.isArray(json)?json:[];
  };

  const loadMore=async()=>{
    if(!btn||loading) return;
    loading=true;
    btn.disabled=true;

    try{
      await ensureData();
      const loaded=grid.children.length;
      const next=all.slice(loaded,loaded+page);

      next.forEach((item,idx)=>{
        const card=buildCard(item);
        grid.appendChild(card);
        setTimeout(()=>animateEnter(card),idx*40);
      });

      updateUI();
    }catch(e){
      console.error(e);
      updateUI();
    }finally{
      loading=false;
    }
  };

  updateUI();
  if(btn) btn.addEventListener("click",loadMore);
})();
