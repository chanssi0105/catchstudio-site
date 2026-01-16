/* =========================================================
   main.js (Header + Overlay + Projects Load More) - CLEAN + Initial Enter
   - is-ready (on load)
   - ScrollLock (body fixed)
   - Header scrolled state + overlay menu
   - Projects: loadMore + initial enter animation (same as loadMore)
========================================================= */

(() => {
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);

  const prefersReduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // is-ready: 레이아웃/폰트/이미지 로딩 이후 안정적으로 붙이기
  window.addEventListener("load", () => {
    requestAnimationFrame(() => root.classList.add("is-ready"));
  });

  /* ----------------------------------------------------------
     Scroll Lock (body fixed: iOS 점프 방지)
  ---------------------------------------------------------- */
  const scrollLock = (() => {
    let y = 0;
    const html = document.documentElement;
    const body = document.body;
    const getSBW = () => Math.max(0, window.innerWidth - html.clientWidth);

    return {
      on() {
        y = window.scrollY || 0;
        const sbw = getSBW();
        root.style.setProperty("--sbw", sbw + "px");
        root.classList.add("is-locked");

        body.style.paddingRight = sbw ? `${sbw}px` : "";
        body.style.position = "fixed";
        body.style.top = `-${y}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        body.style.touchAction = "none";
      },
      off() {
        const top = body.style.top;
        const restoreY = top ? Math.abs(parseInt(top, 10)) : y || 0;

        root.classList.remove("is-locked");
        root.style.removeProperty("--sbw");

        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        body.style.touchAction = "";
        body.style.paddingRight = "";

        window.scrollTo(0, restoreY);
      },
    };
  })();

  /* ----------------------------------------------------------
     Header + Overlay
  ---------------------------------------------------------- */
  (() => {
    const header = $(".site-header");
    if (!header) return;

    const burger = $(".hamburger", header);
    const overlay = $(".menu-overlay");


    // ----------------------------------------------------------
    // Language dropdown (details.lang)
    // - 링크를 템플릿이 아니라 JS가 현재 URL 기준으로 자동 매핑
    //   /about/ <-> /en/about/
    //   /contact/ <-> /en/contact/
    //   / <-> /en/
    // ----------------------------------------------------------
    const lang = $(".lang[data-lang]", header);
    const labelEl = lang ? $(".lang__label", lang) : null;
    const items = lang ? [...lang.querySelectorAll(".lang__item")] : [];

    const normalize = (p) => {
      if (!p) return "/";
      p = p.split("#")[0].split("?")[0];
      if (!p.endsWith("/")) p += "/";
      return p;
    };

    const isEnglish = () => normalize(location.pathname).startsWith("/en/");

    const getKoPath = () => {
      let p = normalize(location.pathname);
      if (p === "/en/") return "/";
      if (p.startsWith("/en/")) p = p.replace("/en/", "/");
      return normalize(p);
    };

    const getEnPath = () => {
      const ko = getKoPath(); // 항상 KO 기준
      return ko === "/" ? "/en/" : normalize("/en" + ko);
    };

    const pickItem = (label) => items.find((a) => (a.textContent || "").trim().toUpperCase() === label);

    const syncLangUI = () => {
      if (!lang) return;

      const en = isEnglish();

      // 1) 라벨 유지 (캡쳐1처럼 KOR/ENG 표시)
      if (labelEl) labelEl.textContent = en ? "ENG" : "KOR";

      // 2) 현재 페이지 기준으로 링크를 "진짜 목적지"로 바꿔줌
      const koItem = pickItem("KOR");
      const enItem = pickItem("ENG");
      const koHref = getKoPath();
      const enHref = getEnPath();

      if (koItem) koItem.setAttribute("href", koHref);
      if (enItem) enItem.setAttribute("href", enHref);

      // 3) 드롭다운 current 표시 (캡쳐2처럼 선택 표시)
      items.forEach((a) => a.removeAttribute("aria-current"));

      const current = en ? enItem : koItem;
      if (current) current.setAttribute("aria-current", "page");
    };

    const closeLang = () => {
      if (lang) lang.removeAttribute("open");
    };







    if (lang) {
  // ===== 햄버거 메뉴 링크도 언어 기준으로 맞춤 =====
  const menu = document.querySelector(".menu-overlay");
  const menuLinks = menu ? [...menu.querySelectorAll(".menu__link")] : [];

  const syncMenuLinks = () => {
    if (!menuLinks.length) return;

    const en = isEnglish();

    menuLinks.forEach((a) => {
      const raw = a.getAttribute("href") || "/";
      const href = normalize(raw);

      // KO 기준 경로로 정리
      const koHref = href.startsWith("/en/") ? normalize(href.replace("/en/", "/")) : href;

      // EN 경로 생성
      const enHref = koHref === "/" ? "/en/" : normalize("/en" + koHref);

      a.setAttribute("href", en ? enHref : koHref);
    });
  };

  // 초기 동기화 (라벨/드롭다운 + 햄버거 메뉴 링크)
  syncLangUI();
  syncMenuLinks();

  // 클릭 시 닫기
  lang.addEventListener("click", (e) => {
    const a = e.target.closest(".lang__item");
    if (!a) return;
    closeLang();
  });

  // 바깥 클릭 닫기
  document.addEventListener("click", (e) => {
    if (!lang.hasAttribute("open")) return;
    if (!lang.contains(e.target)) closeLang();
  });

  // ESC 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lang.hasAttribute("open")) closeLang();
  });

  // bfcache 대응 (뒤로가기/앞으로가기)
  window.addEventListener("pageshow", () => {
    syncLangUI();
    syncMenuLinks();
  });
}






    const SCROLL_Y = 8;
    const baseTheme = header.getAttribute("data-theme") || "light";
    let prevTheme = null;

    const setScrolled = () => {
      header.classList.toggle("is-scrolled", window.scrollY > SCROLL_Y);
    };

    const setMenuOpen = (open) => {
      header.classList.toggle("is-open", open);
      if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (overlay) overlay.setAttribute("aria-hidden", open ? "false" : "true");

      if (open) {
        prevTheme = header.getAttribute("data-theme") || baseTheme;
        header.setAttribute("data-theme", "light");
        scrollLock.on();
      } else {
        header.setAttribute("data-theme", prevTheme || baseTheme);
        scrollLock.off();
      }
    };

    setScrolled();
    window.addEventListener("scroll", setScrolled, { passive: true });

    if (burger) {
      burger.addEventListener("click", () => {
        setMenuOpen(!header.classList.contains("is-open"));
      });
    }

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) setMenuOpen(false);
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    });
  })();

  /* ----------------------------------------------------------
     Project Load More (Index Projects Grid)
     + Initial Enter Animation (same motion as loadMore)
  ---------------------------------------------------------- */
  (() => {
    const wrap = $(".projects-wrap");
    const grid = $("#projectGrid");
    if (!wrap || !grid) return;

    const btn = $("#loadMoreBtn");
    const badge = $("#countBadge");
    const label = $(".projects-more-label");

    let total = Number(wrap.dataset.total || 0);
    const page = Number(wrap.dataset.page || 9);

    let all = null;
    let loading = false;

    const setBadge = () => {
      const loaded = grid.children.length;
      if (badge) badge.textContent = `${loaded}/${total}`;
    };

    const hideLabelOnly = () => {
      if (label) label.style.display = "none";
      if (btn) btn.disabled = true;
    };

    const showLabel = () => {
      if (label) label.style.display = "";
      if (btn) btn.disabled = false;
    };

    const updateUI = () => {
      setBadge();
      const loaded = grid.children.length;
      const hasMore = loaded < total;

      if (!btn) return;
      if (!hasMore) hideLabelOnly();
      else showLabel();
    };

    const escapeHTML = (str) =>
      String(str).replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m]));

    const safeUrl = (u) => {
      const v = String(u || "").trim();
      if (!v) return "#";
      if (v.startsWith("/")) return v;
      if (v.startsWith("./") || v.startsWith("../")) return v;
      if (/^https?:\/\//i.test(v)) return v;
      return "#";
    };

    const safeSrc = (u) => {
      const v = String(u || "").trim();
      if (!v) return "";
      if (v.startsWith("/")) return v;
      if (v.startsWith("./") || v.startsWith("../")) return v;
      if (/^https?:\/\//i.test(v)) return v;
      return "";
    };

    const buildCard = (item) => {
      const t = escapeHTML(item?.title || "");
      const u = safeUrl(item?.url || "#");
      const th = safeSrc(item?.thumb || "");

      const a = document.createElement("a");
      a.className = "p-card is-enter";
      a.href = u;

      if (/^https?:\/\//i.test(u)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      a.innerHTML =
        `<img class="p-thumb" src="${th}" alt="${t}" loading="lazy" decoding="async">` +
        `<span class="p-title">${t}</span>`;

      return a;
    };

    const animateEnter = (el) => {
      // 다음 프레임에 active로 넘어가게
      requestAnimationFrame(() => {
        el.classList.add("is-enter-active");
        el.classList.remove("is-enter");
      });
    };

    // ✅ 초기 진입 썸네일도 loadMore와 동일한 모션으로 등장
    const animateInitial = () => {
      if (prefersReduce) return;
      if (grid.dataset.enterInitDone === "1") return;
      grid.dataset.enterInitDone = "1";

      const cards = [...grid.querySelectorAll(".p-card")];
      if (!cards.length) return;

      // 혹시 서버에서 이미 is-enter가 박혀있으면 그대로 두고,
      // 아니라면 is-enter 상태로 맞춘 후 순차적으로 활성화
      cards.forEach((card) => {
        if (card.classList.contains("is-enter-active")) return;
        card.classList.add("is-enter");
        card.classList.remove("is-enter-active");
      });

      requestAnimationFrame(() => {
        cards.forEach((card, idx) => {
          setTimeout(() => animateEnter(card), idx * 80);
        });
      });
    };

    const ensureData = async () => {
      if (all) return;

      const res = await fetch("/assets/data/projects.json");
      if (!res.ok) throw new Error(`projects.json fetch failed: ${res.status}`);

      const json = await res.json();
      all = Array.isArray(json) ? json : [];

      // dataset total이 틀릴 때 대비
      total = Number.isFinite(total) && total > 0 ? total : all.length;
      if (all.length && total !== all.length) total = all.length;

      updateUI();
    };

    const loadMore = async () => {
      if (!btn || loading) return;
      loading = true;
      btn.disabled = true;

      try {
        await ensureData();

        const loaded = grid.children.length;
        const next = all.slice(loaded, loaded + page);

        next.forEach((item, idx) => {
          const card = buildCard(item);
          grid.appendChild(card);
          setTimeout(() => animateEnter(card), idx * 80);
        });

        updateUI();
      } catch (e) {
        console.error(e);
        updateUI();
      } finally {
        loading = false;
        updateUI();
      }
    };

    // 초기 UI 세팅
    updateUI();

    // ✅ 페이지 진입 모션: 로드 시점에 한번
    // (이미지 로딩으로 카드 높이 튀는 경우가 있으면 'load' 이후로 미뤄도 됨)
    if (document.readyState === "complete") {
      requestAnimationFrame(animateInitial);
    } else {
      window.addEventListener("load", () => requestAnimationFrame(animateInitial), { once: true });
    }

    if (btn) btn.addEventListener("click", loadMore);

    // bfcache(뒤로가기)에서도 다시 자연스럽게 보이게: 중복 실행 막혀있으니 그냥 냅둠
    window.addEventListener("pageshow", () => {
      // 필요하면 여기서 grid.dataset.enterInitDone="0"; 하고 다시 실행 가능
    });
  })();
})();
