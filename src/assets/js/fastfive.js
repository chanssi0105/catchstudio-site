/* =========================================================
   CutWall (DEBUG + BOOST GUARANTEED)
========================================================= */
(() => {
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduce) return;

  const wall = document.querySelector(".p-cutwall");
  if (!wall) {
    console.warn("[CutWall] .p-cutwall not found");
    return;
  }

  const colsAll = Array.from(wall.querySelectorAll(".p-cutwall__col"));
  if (!colsAll.length) {
    console.warn("[CutWall] .p-cutwall__col not found");
    return;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ✅ 1) clone group once
  colsAll.forEach((col, idx) => {
    const track = col.querySelector(".p-cutwall__track");
    const group = col.querySelector("[data-cut-group]");
    if (!track || !group) {
      console.warn("[CutWall] missing track/group on col", idx, { track: !!track, group: !!group });
      return;
    }
    if (track.dataset.looped === "1") return;
    track.dataset.looped = "1";
    track.appendChild(group.cloneNode(true));
  });

  // ✅ 2) set base duration
  const baseDurs = [80, 92, 84, 98];
  colsAll.forEach((col, i) => {
    const base = baseDurs[i % baseDurs.length];
    col.dataset.baseDur = String(base);
    col.style.setProperty("--cut-dur", `${base}s`);
  });

  // ✅ 3) verify animation is actually running on track
  const sampleTrack = colsAll[0]?.querySelector(".p-cutwall__track");
  if (sampleTrack) {
    const cs = getComputedStyle(sampleTrack);
    const name = cs.animationName;
    const dur = cs.animationDuration;
    if (!name || name === "none") {
      console.warn("[CutWall] animationName is none. CSS animation not applied to .p-cutwall__track");
    } else {
      console.log("[CutWall] animation OK:", { name, dur });
    }
  }

  // ✅ 4) boost driver (속도 변화 “무조건” 발생하게 강하게)
  const MIN_DUR = 4;           // 더 강하게
  const MAX_BOOST = 4.0;       // 더 강하게
  const BOOST_SENS = 7.0;     // 더 강하게
  const DECAY = 0.12;
  const INPUT_GRACE_MS = 160;

  let rate = 1;
  let targetRate = 1;
  let lastY = window.scrollY || 0;
  let lastT = performance.now();
  let lastInputT = performance.now();
  let raf = 0;

  const apply = () => {
    const r = clamp(rate, 1, MAX_BOOST);
    colsAll.forEach((col) => {
      const base = parseFloat(col.dataset.baseDur || "80");
      const dur = Math.max(MIN_DUR, base / r);
      col.style.setProperty("--cut-dur", `${dur.toFixed(2)}s`);
    });
  };

  const tick = () => {
    const now = performance.now();
    const want = (now - lastInputT) <= INPUT_GRACE_MS ? targetRate : 1;

    rate += (want - rate) * DECAY;
    if (want === 1 && Math.abs(rate - 1) < 0.002) rate = 1;

    apply();

    if (rate === 1 && (now - lastInputT) > INPUT_GRACE_MS) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const kickRAF = () => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };

  const onInput = () => {
    const y = window.scrollY || 0;
    const t = performance.now();

    const dy = Math.abs(y - lastY);
    const dt = Math.max(16, t - lastT);
    const v = dy / dt; // px/ms

    // ✅ 여기서 targetRate가 반드시 1보다 커지게 된다
    const next = 1 + clamp(v * BOOST_SENS, 0, MAX_BOOST - 1);
    targetRate = Math.max(targetRate, next);

    // ✅ 디버그: 실제로 값이 튀는지 확인
    if (next > 1.05) console.log("[CutWall] boost", { v: Number(v.toFixed(3)), next: Number(next.toFixed(2)) });

    lastY = y;
    lastT = t;
    lastInputT = t;

    kickRAF();

    // 살짝 내려서 과도하게 고정되는 것 방지
    targetRate += (1 - targetRate) * 0.03;
    if (targetRate < 1) targetRate = 1;
  };

  window.addEventListener("scroll", onInput, { passive: true });
  window.addEventListener("wheel", onInput, { passive: true });
  window.addEventListener("touchmove", onInput, { passive: true });

  apply();
  console.log("[CutWall] init done");
})();




/* =========================================================
   CutWall (SMOOTH BOOST + MOBILE MERGE 1+3 / 2+4)
   - 모바일: 3번째 그룹을 1번에, 4번째 그룹을 2번에 “복사 결합”
   - 3/4 col은 숨김
   - 데스크탑 복귀 시 원복
   - WebAnimation playbackRate로 스크롤 가속 (버벅임 최소)
========================================================= */
(() => {
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduce) return;

  const wall = document.querySelector(".p-cutwall");
  if (!wall) return;

  const colsAll = Array.from(wall.querySelectorAll(".p-cutwall__col"));
  if (colsAll.length < 2) return;

  const isMobile2Col = () => window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 원본 백업(데스크탑 복귀용): track의 "원본 group 1개" 상태를 저장
  colsAll.forEach((col) => {
    const track = col.querySelector(".p-cutwall__track");
    const group = col.querySelector("[data-cut-group]");
    if (!track || !group) return;
    if (!track.dataset.origGroupHtml) track.dataset.origGroupHtml = group.outerHTML;
  });

  // track을 "원본 상태(그룹 1개)"로 복원
  const restoreTrackToOriginal = (col) => {
    const track = col.querySelector(".p-cutwall__track");
    if (!track || !track.dataset.origGroupHtml) return;
    track.innerHTML = track.dataset.origGroupHtml; // loop 복제 제거 포함
    track.dataset.looped = "0";
  };

  // group 여러 개를 "1개 그룹으로 합친 뒤" track에 넣기
  const setMergedGroup = (targetCol, sourceCols) => {
    const track = targetCol.querySelector(".p-cutwall__track");
    if (!track) return;

    const merged = document.createElement("div");
    merged.className = "p-cutwall__group";
    merged.setAttribute("data-cut-group", "");

    sourceCols.forEach((col) => {
      const g = col.querySelector("[data-cut-group]");
      if (!g) return;
      Array.from(g.children).forEach((child) => merged.appendChild(child.cloneNode(true)));
    });

    track.innerHTML = "";
    track.appendChild(merged);
    track.dataset.looped = "0";
  };

  // loop 2세트 구성 (track 안의 "현재 1세트"를 복제해서 붙임)
  const cloneOnce = (track) => {
    if (!track || track.dataset.looped === "1") return;
    const group = track.querySelector("[data-cut-group]");
    if (!group) return;
    track.dataset.looped = "1";
    track.appendChild(group.cloneNode(true));
  };

  // 애니메이션 생성/재생성
  let anims = [];
  const killAnims = () => {
    anims.forEach((a) => { try { a.cancel(); } catch(e){} });
    anims = [];
  };

  const buildAnims = () => {
    killAnims();

    const activeCols = colsAll.filter(c => c.style.display !== "none");
    const tracks = activeCols.map(c => c.querySelector(".p-cutwall__track")).filter(Boolean);

    // CSS 애니메이션은 끄고(혹시 남아있을 수 있으니)
    tracks.forEach((tr) => { tr.style.animation = "none"; });

    // duration(ms) - 느리게 기본, 스크롤로 가속
    const baseDurs = [110000, 130000, 115000, 140000];

    anims = tracks.map((tr, i) => {
      const col = tr.closest(".p-cutwall__col");
      const isDown = col && col.classList.contains("is-down");
      const dur = baseDurs[i % baseDurs.length];

      const keyframes = isDown
        ? [{ transform: "translate3d(0,-50%,0)" }, { transform: "translate3d(0,0,0)" }]
        : [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-50%,0)" }];

      const anim = tr.animate(keyframes, { duration: dur, iterations: Infinity, easing: "linear" });
      anim.playbackRate = 1;
      return anim;
    });
  };

  // 모바일 합체/복원 적용 (핵심)
  const applyLayout = () => {
    const mobile = isMobile2Col();

    if (colsAll.length >= 4) {
      if (mobile) {
        // ✅ 모바일: 1+3 / 2+4
        colsAll[2].style.display = "none";
        colsAll[3].style.display = "none";

        setMergedGroup(colsAll[0], [colsAll[0], colsAll[2]]);
        setMergedGroup(colsAll[1], [colsAll[1], colsAll[3]]);

        // loop 2세트 재구성
        cloneOnce(colsAll[0].querySelector(".p-cutwall__track"));
        cloneOnce(colsAll[1].querySelector(".p-cutwall__track"));
      } else {
        // ✅ 데스크탑 복귀: 원본 복원
        colsAll[2].style.display = "";
        colsAll[3].style.display = "";

        restoreTrackToOriginal(colsAll[0]);
        restoreTrackToOriginal(colsAll[1]);
        restoreTrackToOriginal(colsAll[2]);
        restoreTrackToOriginal(colsAll[3]);

        // 각 col에 loop 2세트
        colsAll.forEach((col) => cloneOnce(col.querySelector(".p-cutwall__track")));
      }
    } else {
      // col이 2개만 있는 경우: 그냥 loop만
      colsAll.forEach((col) => cloneOnce(col.querySelector(".p-cutwall__track")));
    }

    // 애니메이션 재생성(중요: DOM 바뀌면 기존 anim 무조건 깨짐)
    buildAnims();
  };

  // 최초 적용
  applyLayout();

  // 리사이즈 대응 (과하게 자주 실행되지 않게 간단 디바운스)
  let rzT = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rzT);
    rzT = setTimeout(applyLayout, 80);
  }, { passive: true });

  // ---- 스크롤 속도로 playbackRate 올리기
  const MAX_RATE = 6.0;
  const SENS = 10;
  const DECAY = 0.10;
  const INPUT_GRACE_MS = 90;

  let rate = 1;
  let targetRate = 1;
  let lastY = window.scrollY || 0;
  let lastT = performance.now();
  let lastInputT = performance.now();
  let raf = 0;

  const applyRate = () => {
    const r = clamp(rate, 1, MAX_RATE);
    anims.forEach((a) => { a.playbackRate = r; });
  };

  const tick = () => {
    const now = performance.now();
    const want = (now - lastInputT) <= INPUT_GRACE_MS ? targetRate : 1;

    rate += (want - rate) * DECAY;
    if (want === 1 && Math.abs(rate - 1) < 0.002) rate = 1;

    applyRate();

    if (rate === 1 && (now - lastInputT) > INPUT_GRACE_MS) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
  };

  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const onInput = () => {
    const y = window.scrollY || 0;
    const t = performance.now();
    const dy = Math.abs(y - lastY);
    const dt = Math.max(16, t - lastT);
    const v = dy / dt;

    const next = 1 + clamp(v * SENS, 0, MAX_RATE - 1);
    targetRate = Math.max(targetRate, next);

    lastY = y; lastT = t; lastInputT = t;
    kick();

    targetRate += (1 - targetRate) * 0.03;
    if (targetRate < 1) targetRate = 1;
  };

  window.addEventListener("scroll", onInput, { passive: true });
  window.addEventListener("wheel", onInput, { passive: true });
  window.addEventListener("touchmove", onInput, { passive: true });

  applyRate();
})();
