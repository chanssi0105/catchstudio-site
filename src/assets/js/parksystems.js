/**
 * Parksystems Project Integrated Script
 * - 수정 사항: 인라인 transform 대신 CSS 변수(--yPosFull, --rotate)를 사용하여 호버 충돌 방지
 */
(() => {
  // 1. 터널/카드 관통 애니메이션 설정
  const tunnel = document.querySelector('[data-ps-tunnel]');
  const copy = document.querySelector('.p-tunnel__copy');
  // 쇼케이스 아이템(.p-showcase__item)은 제외
  const cards = document.querySelectorAll('.p-tunnel-card:not(.p-showcase__item)');

  if (tunnel && copy) {
    const updateTunnel = () => {
      const rect = tunnel.getBoundingClientRect();
      const winH = window.innerHeight;

      // 타이틀 이동 (기존 로직 유지)
      let entryP = Math.max(0, Math.min(1, (winH - rect.top) / winH));
      const titleMove = (1 - entryP) * -50; 
      copy.style.transform = `translate3d(0, ${titleMove}vh, 0)`;

      // 카드 관통 로직
      let fastScrollP = Math.max(0, Math.min(1, (winH - rect.top) / (winH + rect.height)));

      cards.forEach((card) => {
        const style = getComputedStyle(card);
        const delay = parseFloat(style.getPropertyValue('--delay')) || 0;
        const zSpeed = parseFloat(style.getPropertyValue('--z')) || 1;
        const xPos = (style.getPropertyValue('--x') || '0%').trim();
        const yOff = (style.getPropertyValue('--y-off') || '0px').trim();

        let p = (fastScrollP - delay * 0.2) * (zSpeed * 1.5);
        p = Math.max(-0.1, Math.min(1.1, p));

        const yPosValue = 120 - (p * 240);
        const yPosFull = `calc(${yPosValue}vh + ${yOff})`;
        const rotateDeg = `${(0.5 - p) * 15}deg`;

        // [핵심] 변수만 업데이트하여 CSS에서 제어하도록 함
        card.style.setProperty('--yPosFull', yPosFull);
        card.style.setProperty('--rotate', rotateDeg);
        
        // 초기 진입 시 opacity 제어
        card.style.opacity = p > -0.05 && p < 1.05 ? 1 : 0;
      });
      requestAnimationFrame(updateTunnel);
    };
    window.addEventListener('scroll', updateTunnel, { passive: true });
    updateTunnel();
  }

  // 2. 쇼케이스 확산 트리거 (기존 유지)
  const showcaseSection = document.querySelector('[data-showcase-trigger]');
  if (showcaseSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showcaseSection.classList.add('is-active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(showcaseSection);
  }

  // 3. 레이아웃 자동 높이 조절 (기존 유지)
  const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const updateLayouts = () => {
    const psSec = document.querySelector(".ps-showcase");
    if (psSec) {
      const text = psSec.querySelector(".ps-showcase__text");
      if (text) {
        const h = Math.ceil(text.getBoundingClientRect().height || 0);
        const over = Math.max(0, h - 220);
        const extraLift = clamp(over * 0.35, 0, 160);
        psSec.style.setProperty("--monitorLift", `${Math.max(180, 180 - extraLift)}px`);
      }
    }

    const compBlock = document.querySelector(".p-completionBlock");
    if (compBlock) {
      const cText = compBlock.querySelector(".p-completionBg__text");
      if (cText) {
        const ch = Math.ceil(cText.getBoundingClientRect().height || 0);
        const cOver = Math.max(0, ch - 240);
        compBlock.style.setProperty("--bgH-extra", `${clamp(cOver * 0.85, 0, 520)}px`);
        compBlock.style.setProperty("--comp-text-push", `${clamp(cOver * 0.55, 0, 280)}px`);
      }
    }
  };

  window.addEventListener("resize", () => raf2(updateLayouts), { passive: true });
  raf2(updateLayouts);
})();