/* =========================================================
   about.js (FINAL / OPTION A)
   - ✅ 새로고침 복원(세션스토리지/scrollRestoration) 전부 제거
   - ✅ S56(S5+S6) 은 "현재 스크롤"만으로 동작 (리셋이 정상)
   - ✅ S5: scroll-driven 01→02→03 + 버튼 prev/next
   - ✅ S6: cover rises (CSS: --s56-p) + cover 완료 후 BG 1~4 페이드 + auto theme + title jitter
   - ✅ Section1 split-words
   - ✅ reveal on scroll (IO)
   - ✅ Section2 marquee (네가 준 관성 marquee 유지)
   - ✅ Section4 accordion + emoji
========================================================= */

(() => {
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----------------------------------------------------------
  // 0) is-ready (stable)
  // ----------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("is-ready")));
  });

  // ----------------------------------------------------------
// 1) Hero title split (word) - safe (ignores tags) + reload/mobile safe
// ----------------------------------------------------------
const splitWords = (el) => {
  const html = el.innerHTML.replace(/<br\s*\/?>/gi, "\n");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  const text = (tmp.textContent || "").replace(/[ \t]+/g, " ").trim();
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

  el.innerHTML = "";
  const frag = document.createDocumentFragment();

  let idx = 0;
  lines.forEach((line, lineIndex) => {
    line.split(" ").forEach((word) => {
      const w = document.createElement("span");
      w.className = "w";
      const i = document.createElement("i");
      i.textContent = word;
      i.style.transitionDelay = `${Math.min(idx * 45, 520)}ms`;
      w.appendChild(i);
      frag.appendChild(w);
      frag.appendChild(document.createTextNode(" "));
      idx += 1;
    });
    if (lineIndex < lines.length - 1) frag.appendChild(document.createElement("br"));
  });

  el.appendChild(frag);
};

const initHero = (tries = 40) => {
  const heroTitle = document.querySelector("[data-split-words]");
  if (!heroTitle) {
    if (tries <= 0) return;
    setTimeout(() => initHero(tries - 1), 25);
    return;
  }

  // reduce motion이면 그냥 노출
  if (prefersReduce) {
    heroTitle.classList.add("is-animated");
    return;
  }

  // 이미 split이 되어 있어도(뒤로가기 캐시/리로드) 모션 재트리거를 위해 리셋 후 다시
  heroTitle.classList.remove("is-animated");

  // split이 안 되어 있으면 구성
  if (heroTitle.dataset.splitted !== "1") {
    heroTitle.dataset.splitted = "1";
    splitWords(heroTitle);
  }

  // is-ready 이후에 모션이 확실히 타도록, 다음 프레임에 트리거
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroTitle.classList.add("is-animated");
    });
  });
};

// DOM 준비되면 실행
document.addEventListener("DOMContentLoaded", () => initHero());

// bfcache(모바일 사파리/크롬)에서 돌아올 때도 실행
window.addEventListener("pageshow", () => initHero());


  // ----------------------------------------------------------
  // 2) Reveal on scroll
  // ----------------------------------------------------------
  const revealAll = (selector) => document.querySelectorAll(selector).forEach((el) => el.classList.add("is-in"));

  let globalIO = null;

  if (prefersReduce || !("IntersectionObserver" in window)) {
    revealAll("[data-reveal]");
    revealAll("[data-reveal-title]");
  } else {
    globalIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          globalIO.unobserve(e.target);
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => globalIO.observe(el));

    document.querySelectorAll("[data-reveal-title]").forEach((el) => {
      if (!el.dataset.built) {
        const raw = el.innerHTML.replace(/<br\s*\/?>/gi, "\n");
        const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        el.innerHTML = lines.map((line) => `<span>${line}</span>`).join("<br />");
        el.querySelectorAll("span").forEach((s, i) => (s.style.transitionDelay = `${Math.min(i * 90, 240)}ms`));
        el.dataset.built = "1";
      }
      globalIO.observe(el);
    });
  }

  // ----------------------------------------------------------
  // 3) Section2 Marquee (JS inertial marquee) - 그대로 유지
  // ----------------------------------------------------------
  (() => {
    const wrap = document.querySelector(".about-s2__marquee");
    const track = document.querySelector("[data-marquee]");
    if (!wrap || !track) return;
    if (prefersReduce) return;

    const BASE_PX_PER_SEC = 55;
    const BOOST_MAX = 2.0;
    const INPUT_GAIN = 0.06;
    const FRICTION = 0.92;
    const RETURN = 0.035;
    const MIN_DT = 0.010;
    const MAX_DT = 0.050;

    const getGapPx = () => {
      const cs = getComputedStyle(track);
      const gap = parseFloat(cs.columnGap || cs.gap || "0");
      return Number.isFinite(gap) ? gap : 0;
    };

    const shuffleOriginals = () => {
      if (track.dataset.shuffled === "1") return;
      const originals = Array.from(track.children);
      if (originals.length < 2) return;
      for (let i = originals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [originals[i], originals[j]] = [originals[j], originals[i]];
      }
      const frag = document.createDocumentFragment();
      originals.forEach((n) => frag.appendChild(n));
      track.textContent = "";
      track.appendChild(frag);
      track.dataset.shuffled = "1";
    };

    const ensureTwoSets = () => {
      if (track.dataset.cloned === "1") return;
      const originals = Array.from(track.children);
      if (!originals.length) return;
      track.dataset.cloned = "1";
      originals.forEach((node) => track.appendChild(node.cloneNode(true)));
    };

    let distance = 1;
    const measureDistance = () => {
      const kids = Array.from(track.children);
      if (!kids.length) return;

      const half = Math.floor(kids.length / 2);
      if (half < 1) return;

      const gap = getGapPx();
      let w = 0;

      for (let i = 0; i < half; i++) {
        const rect = kids[i].getBoundingClientRect();
        w += rect.width;
        if (i < half - 1) w += gap;
      }

      if (!w || w < 10) {
        const sw = track.scrollWidth;
        if (sw && sw > 10) w = sw / 2;
      }

      if (!w || w < 10) w = 1;
      distance = w;
      track.style.setProperty("--about-marquee-distance", `${distance}px`);
    };

    let x = 0;
    let vBoost = 0;
    let raf = null;
    let lastT = 0;

    const apply = () => {
      track.style.transform = `translate3d(${x}px,0,0)`;
    };

    const step = (t) => {
      if (!lastT) lastT = t;
      let dt = (t - lastT) / 1000;
      lastT = t;
      dt = Math.max(MIN_DT, Math.min(MAX_DT, dt));

      vBoost += (0 - vBoost) * RETURN;
      vBoost *= FRICTION;

      const maxExtra = BASE_PX_PER_SEC * BOOST_MAX;
      const extra = Math.max(-maxExtra, Math.min(maxExtra, vBoost));
      const v = -(BASE_PX_PER_SEC + extra);

      x += v * dt;

      if (distance > 0) {
        while (x <= -distance) x += distance;
        while (x > 0) x -= distance;
      }

      apply();
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e) => {
      let dy = e.deltaY || 0;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      dy = Math.abs(dy);
      vBoost += dy * (BASE_PX_PER_SEC * INPUT_GAIN);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const prev = Number(track.dataset._lastScrollY || y);
      let dy = y - prev;
      track.dataset._lastScrollY = String(y);
      dy = Math.abs(dy);
      vBoost += dy * (BASE_PX_PER_SEC * INPUT_GAIN * 0.9);
    };

    const start = () => {
      if (track.dataset.started === "1") return;
      track.dataset.started = "1";

      shuffleOriginals();
      ensureTwoSets();

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          measureDistance();
          apply();
        })
      );

      track.querySelectorAll("img").forEach((img) => {
        img.addEventListener("load", () => requestAnimationFrame(measureDistance), { once: true });
        img.addEventListener("error", () => requestAnimationFrame(measureDistance), { once: true });
      });

      window.addEventListener("resize", () => requestAnimationFrame(measureDistance), { passive: true });
      window.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });

      raf = requestAnimationFrame(step);
    };

    if (wrap.classList.contains("is-in")) {
      start();
    } else if ("IntersectionObserver" in window) {
      const io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            start();
            io2.disconnect();
          });
        },
        { root: null, threshold: 0.01 }
      );
      io2.observe(wrap);
    } else {
      start();
    }
  })();

  // ----------------------------------------------------------
  // 4) Trust Accordion (Section 4)
  // ----------------------------------------------------------
  (() => {
    const accList = document.querySelectorAll(".about-s4__acc");
    if (!accList.length) return;

    const setOpen = (item, open, animate = true) => {
      const btn = item.querySelector(".about-s4__btn");
      const panel = item.querySelector(".about-s4__panel");
      if (!btn || !panel) return;

      const shouldAnimate = animate && !prefersReduce;

      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");

      if (open) panel.hidden = false;

      if (!shouldAnimate) {
        panel.style.height = open ? "auto" : "0px";
        if (!open) panel.hidden = true;
        return;
      }

      if (open) {
        panel.style.height = "0px";
        panel.getBoundingClientRect();
        panel.style.height = `${panel.scrollHeight}px`;
        const onEnd = (e) => {
          if (e.propertyName !== "height") return;
          panel.removeEventListener("transitionend", onEnd);
          panel.style.height = "auto";
        };
        panel.addEventListener("transitionend", onEnd);
        return;
      }

      panel.style.height = `${panel.scrollHeight}px`;
      panel.getBoundingClientRect();
      panel.style.height = "0px";
      const onEnd = (e) => {
        if (e.propertyName !== "height") return;
        panel.removeEventListener("transitionend", onEnd);
        panel.hidden = true;
      };
      panel.addEventListener("transitionend", onEnd);
    };

    const initItem = (item) => {
      const open = item.classList.contains("is-open");
      const btn = item.querySelector(".about-s4__btn");
      const panel = item.querySelector(".about-s4__panel");
      if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (panel) {
        panel.hidden = !open;
        panel.style.height = open ? "auto" : "0px";
      }
    };

    accList.forEach((acc) => {
      const items = Array.from(acc.querySelectorAll(".about-s4__item"));
      items.forEach(initItem);

      items.forEach((item) => {
        const btn = item.querySelector(".about-s4__btn");
        if (!btn) return;
        btn.addEventListener("click", () => {
          const isOpen = item.classList.contains("is-open");
          setOpen(item, !isOpen, true);
        });
      });

      window.addEventListener(
        "resize",
        () => {
          items.forEach((item) => {
            if (!item.classList.contains("is-open")) return;
            const panel = item.querySelector(".about-s4__panel");
            if (!panel) return;
            panel.style.height = "auto";
          });
        },
        { passive: true }
      );
    });
  })();

  // ----------------------------------------------------------
  // 5) Section4 Trust Emoji (v3)
  // ----------------------------------------------------------
  (() => {
    const s4 = document.querySelector(".about-s4");
    if (!s4) return;

    const kicker = s4.querySelector(".about-s4__kicker");
    const emojiEl = s4.querySelector(".about-s4__emoji");
    const acc = s4.querySelector(".about-s4__acc");
    const items = [...s4.querySelectorAll(".about-s4__item")];
    if (!kicker || !emojiEl || !acc || items.length === 0) return;

    const PRAY = "🙏";
    const ICONS = ["🏢", "⚙️", "🖥️", "♻️", "🎯"];

    const mq = window.matchMedia("(max-width: 960px)");
    const num = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    let kickerTopPx = 0;
    let accStartY = 0;
    let itemStartY = [];
    let raf = 0;

    let state = -2;
    let shown = false;
    let wasSticky = false;
    let enabled = false;

    const pop = () => {
      emojiEl.classList.remove("is-pop");
      requestAnimationFrame(() => emojiEl.classList.add("is-pop"));
      setTimeout(() => emojiEl.classList.remove("is-pop"), 180);
    };

    const setState = (next) => {
      if (next === state) return;
      state = next;

      if (state === -2) {
        shown = false;
        emojiEl.classList.remove("is-visible");
        emojiEl.textContent = "";
        return;
      }

      if (!shown) {
        shown = true;
        emojiEl.classList.add("is-visible");
      }

      if (state === -1) {
        if (emojiEl.textContent !== PRAY) {
          emojiEl.textContent = PRAY;
          pop();
        }
        return;
      }

      const icon = ICONS[state] || PRAY;
      if (emojiEl.textContent !== icon) {
        emojiEl.textContent = icon;
        pop();
      }
    };

    const measure = () => {
      kickerTopPx = num(getComputedStyle(kicker).top);

      const sy = window.scrollY || 0;
      accStartY = acc.getBoundingClientRect().top + sy;

      itemStartY = items.map((item) => {
        const btn = item.querySelector(".about-s4__btn") || item;
        return btn.getBoundingClientRect().top + sy;
      });
    };

    const compute = () => {
      raf = 0;
      if (!enabled) return;

      if (!kickerTopPx) measure();

      const kRect = kicker.getBoundingClientRect();
      const stickyOn = kRect.top <= kickerTopPx + 0.5;

      if (!stickyOn) {
        wasSticky = false;
        setState(-2);
        return;
      }

      if (!wasSticky) {
        wasSticky = true;
        setState(-1);
        return;
      }

      const sy = window.scrollY || 0;
      const kickerH = kicker.offsetHeight || 0;
      const triggerLine = sy + kickerTopPx + kickerH + 18;

      if (triggerLine < accStartY) {
        setState(-1);
        return;
      }

      let idx = 0;
      for (let i = itemStartY.length - 1; i >= 0; i--) {
        if (triggerLine >= itemStartY[i]) {
          idx = i;
          break;
        }
      }
      setState(idx);
    };

    const tick = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    const disable = () => {
      enabled = false;
      wasSticky = false;
      kickerTopPx = 0;
      setState(-2);
    };

    const enable = () => {
      enabled = true;
      wasSticky = false;
      kickerTopPx = 0;
      measure();
      compute();
    };

    const applyMode = () => {
      if (mq.matches) disable();
      else enable();
    };

    window.addEventListener("scroll", () => enabled && tick(), { passive: true });

    window.addEventListener(
      "resize",
      () => {
        applyMode();
        if (enabled) {
          measure();
          tick();
        }
      },
      { passive: true }
    );

    window.addEventListener("orientationchange", () => {
      applyMode();
      if (enabled) {
        measure();
        tick();
      }
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (enabled) {
          measure();
          tick();
        }
      });
    }

    window.addEventListener(
      "load",
      () => {
        applyMode();
        if (enabled) {
          measure();
          tick();
        }
      },
      { once: true }
    );

    s4.addEventListener("transitionend", (e) => {
      if (!enabled) return;
      if (!e.target || !e.target.classList) return;
      if (!e.target.classList.contains("about-s4__panel")) return;
      measure();
      tick();
    });

    s4.querySelectorAll(".about-s4__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!enabled) return;
        requestAnimationFrame(() => {
          measure();
          tick();
        });
        setTimeout(() => {
          measure();
          tick();
        }, 480);
      });
    });

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        if (!enabled) return;
        measure();
        tick();
      });
      ro.observe(s4);
      ro.observe(acc);
    }

    applyMode();
  })();

  // ----------------------------------------------------------
  // 6) S56 PIN Driver (OPTION A - NO RESTORE)
  // ----------------------------------------------------------
  (() => {
    document.documentElement.classList.add("is-js");

    const s56 = document.querySelector("[data-s56]");
    const wrap = s56?.querySelector("[data-s56-wrap]");
    const stage = s56?.querySelector("[data-s56-stage]");
    const s5 = s56?.querySelector("[data-s5]");
    const s6 = s56?.querySelector("[data-s6]");
    if (!s56 || !wrap || !stage || !s5 || !s6) return;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const clamp01 = (v) => clamp(v, 0, 1);
    const headerH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;

    /* ===== 튜닝 ===== */
    const S5_SLIDES = 3;
    const S5_RATIO = 0.45;
    const COVER_RATIO = 0.92;
    const BG_RATIO = 0.55;
    const RELEASE_RATIO = 0.20;
    const MIN_DIST = 180;

    let stageH = 1,
      s5Dist = 1,
      coverDist = 1,
      bgDist = 1,
      releaseDist = 1,
      totalDist = 1;

    let ticking = false;

    const layout = () => {
      stageH = Math.max(1, window.innerHeight - headerH());
      s5Dist = Math.max(MIN_DIST, stageH * S5_RATIO);
      coverDist = Math.max(MIN_DIST, stageH * COVER_RATIO);
      bgDist = Math.max(MIN_DIST, stageH * BG_RATIO);
      releaseDist = Math.max(80, stageH * RELEASE_RATIO);
      totalDist = s5Dist + coverDist + bgDist + releaseDist;
      wrap.style.height = `${stageH + totalDist}px`;
    };

    /* =========================
       S5
    ========================= */
    const track = s5.querySelector("[data-s5-track]");
    const slides = track ? Array.from(track.querySelectorAll(".about-s5__slide")) : [];
    const btnPrev = s5.querySelector("[data-s5-prev]");
    const btnNext = s5.querySelector("[data-s5-next]");
    const pad2 = (n) => String(n).padStart(2, "0");
    let s5Index = 0;

    const syncCounter = () => {
      const curText = pad2(s5Index + 1);
      const totText = pad2(slides.length || S5_SLIDES);
      s5.querySelectorAll("[data-s5-count]").forEach((el) => {
        const curEl = el.querySelector("[data-s5-cur]");
        const totEl = el.querySelector("[data-s5-total]");
        if (curEl) curEl.textContent = curText;
        if (totEl) totEl.textContent = totText;
      });
    };

    const showS5 = (idx) => {
      if (!slides.length) return;
      const next = clamp(idx, 0, slides.length - 1);
      slides.forEach((s, i) => s.classList.toggle("is-active", i === next));
      s5Index = next;
      syncCounter();
    };

    if (slides.length) {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === 0));
      syncCounter();
    }

    if (btnPrev)
      btnPrev.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showS5(s5Index - 1);
      });
    if (btnNext)
      btnNext.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showS5(s5Index + 1);
      });

    /* =========================
       S6: reveal + bg + theme
    ========================= */
    const bgItems = Array.from(s6.querySelectorAll("[data-s6-bg-item]"));
    const titleEl = s6.querySelector("[data-s6-title]");

    const buildS6TitleSpans = () => {
      if (!titleEl || titleEl.dataset.built === "1") return;
      const raw = titleEl.innerHTML.replace(/<br\s*\/?>/gi, "\n");
      const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
      titleEl.innerHTML = lines.map((line) => `<span>${line}</span>`).join("<br />");
      titleEl.querySelectorAll("span").forEach((sp, i) => (sp.style.transitionDelay = `${Math.min(i * 90, 240)}ms`));
      titleEl.dataset.built = "1";
    };
    buildS6TitleSpans();

    let s6Revealed = false;
    const revealS6 = () => {
      if (s6Revealed) return;
      s6Revealed = true;
      s6.querySelectorAll("[data-s6-reveal]").forEach((el) => el.classList.add("is-in"));
      const t = s6.querySelector("[data-s6-reveal-title]");
      if (t) t.classList.add("is-in");
      if (titleEl) titleEl.classList.add("is-in");
    };

    const applyS6ColorsFromBg = (idx) => {
      const item = bgItems[idx];
      if (!item) return;

      const fg = item.getAttribute("data-fg");
      const fgDim = item.getAttribute("data-fg-dim");
      const btnBg = item.getAttribute("data-btn-bg");
      const btnFg = item.getAttribute("data-btn-fg");
      const scrim = item.getAttribute("data-scrim");

      if (fg) document.documentElement.style.setProperty("--s6-fg", fg);
      if (fgDim) document.documentElement.style.setProperty("--s6-fg-dim", fgDim);
      if (btnBg) document.documentElement.style.setProperty("--s6-btn-bg", btnBg);
      if (btnFg) document.documentElement.style.setProperty("--s6-btn-fg", btnFg);
      if (scrim != null)
        document.documentElement.style.setProperty("--s6-scrim", String(clamp(parseFloat(scrim) || 0, 0, 0.35)));
    };

    let bgIndex = 0;
    const setBg = (idx, force = false) => {
      if (!bgItems.length) return;
      const next = clamp(idx, 0, bgItems.length - 1);
      if (!force && next === bgIndex) return;
      bgItems.forEach((it, i) => it.classList.toggle("is-active", i === next));
      bgIndex = next;
      applyS6ColorsFromBg(next);
    };

    // jitter
    let prevT = 0;
    let vel = 0;
    let jitterRAF = 0;
    let jitterOn = false;

    const startJitter = () => {
      if (prefersReduce || !titleEl || jitterOn) return;
      jitterOn = true;
      titleEl.classList.add("is-jitter");

      const loop = () => {
        if (!jitterOn) return;

        const amp = clamp(vel * 0.004, 0, 1);
        const baseX = 1.2,
          baseY = 0.9,
          baseR = 0.10;
        const addX = 3.8 * amp,
          addY = 3.0 * amp,
          addR = 0.35 * amp;

        const jx = ((Math.random() * 2 - 1) * (baseX + addX)).toFixed(2);
        const jy = ((Math.random() * 2 - 1) * (baseY + addY)).toFixed(2);
        const rot = ((Math.random() * 2 - 1) * (baseR + addR)).toFixed(2);

        titleEl.style.setProperty("--s6-jx", `${jx}px`);
        titleEl.style.setProperty("--s6-jy", `${jy}px`);
        titleEl.style.setProperty("--s6-rot", `${rot}deg`);

        jitterRAF = requestAnimationFrame(loop);
      };

      jitterRAF = requestAnimationFrame(loop);
    };

    const stopJitter = () => {
      jitterOn = false;
      if (jitterRAF) cancelAnimationFrame(jitterRAF);
      jitterRAF = 0;
      if (!titleEl) return;
      titleEl.classList.remove("is-jitter");
      titleEl.style.removeProperty("--s6-jx");
      titleEl.style.removeProperty("--s6-jy");
      titleEl.style.removeProperty("--s6-rot");
    };

    const update = () => {
      ticking = false;
      layout();

      const r = wrap.getBoundingClientRect();
      const t = clamp(-r.top, 0, totalDist);

      const dt = Math.max(1, Math.abs(t - prevT));
      vel = vel * 0.85 + dt * 0.15;
      prevT = t;

      // S5 slide (scroll-driven)
      const pS5 = clamp01(t / s5Dist);
      const slideIdx = Math.min(S5_SLIDES - 1, Math.floor(pS5 * (S5_SLIDES - 1) + 1e-6));
      showS5(slideIdx);

      // cover
      const pCover = clamp01((t - s5Dist) / coverDist);
      s56.style.setProperty("--s56-p", String(pCover));
      s56.style.setProperty("--s56-cover", String(pCover));
      if (pCover > 0.06) revealS6();

      // BG after cover done
      const coverDone = pCover >= 0.995;
      if (coverDone) {
        s6.classList.add("is-bg-on");
        const pBG = clamp01((t - s5Dist - coverDist) / bgDist);
        const bgIdx = Math.min(3, Math.floor(pBG * 3 + 1e-6));
        setBg(bgIdx);
      } else {
        s6.classList.remove("is-bg-on");
      }

      // jitter inside bg zone
      const inBG = coverDone && t > s5Dist + coverDist + 10 && t < s5Dist + coverDist + bgDist - 10;
      if (inBG) startJitter();
      else stopJitter();
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(update), { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(update));

    // initial paint
    requestAnimationFrame(() => requestAnimationFrame(update));
  })();

  // ----------------------------------------------------------
  // 7) S6 CTA SVG 교체 (네가 준 24x24 화살표로 강제)
  // ----------------------------------------------------------
  (() => {
    const a = document.querySelector(".about-s6__cta");
    if (!a) return;
    const svg = a.querySelector("svg");
    if (!svg) return;

    // 이미 원하는 viewBox면 스킵
    const vb = svg.getAttribute("viewBox") || "";
    if (vb === "0 0 24 24") return;

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.innerHTML = `<path d="M5 12H19M19 12L13 6M19 12L13 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  })();
})();
