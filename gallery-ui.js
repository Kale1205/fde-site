(() => {
  "use strict";
  const isJapanese = document.documentElement.lang === "ja";
  const text = { openMenu: isJapanese ? "メニューを開く" : "Open menu", closeMenu: isJapanese ? "メニューを閉じる" : "Close menu" };
  const menuButton = document.querySelector(".menu-button");
  const mobileNav = document.getElementById("mobile-nav");
  if (menuButton && mobileNav) {
    const menuIcon = menuButton.innerHTML;
    const closeIcon = '<span aria-hidden="true" style="font-size:25px;line-height:1">×</span>';
    const setMenu = (open) => {
      mobileNav.hidden = !open;
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? text.closeMenu : text.openMenu);
      menuButton.innerHTML = open ? closeIcon : menuIcon;
    };
    menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
    mobileNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenu(false);
    });
  }


  // The homepage panel is an inert illustration. Demo operations live in demo-v1.js.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let observer;
  let frame = 0;
  const visual = document.querySelector(".hero-visual");
  const update = () => {
    frame = 0;
    if (visual && !reduced.matches) {
      const progress = Math.min(Math.max(window.scrollY / 600, 0), 1);
      visual.style.setProperty("--preview-drift", (progress * 18) + "px");
      visual.style.setProperty("--preview-tilt", (6 - progress * 6) + "deg");
    }
  };
  const scroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
  const configure = () => {
    observer?.disconnect();
    window.removeEventListener("scroll", scroll);
    window.cancelAnimationFrame(frame);
    frame = 0;
    visual?.style.removeProperty("--preview-drift");
    visual?.style.removeProperty("--preview-tilt");
    document.querySelectorAll(".reveal-arrive").forEach(el => el.classList.remove("reveal-arrive"));
    if (reduced.matches) return;
    // Content is never hidden while waiting for JavaScript or observation.
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-arrive");
        observer.unobserve(entry.target);
      }), { threshold: 0.12 });
      document.querySelectorAll(".section-intro, .offers-heading, .home-intent-grid a, .principle-list article, .goal-manifesto, .offer-card, .story-points article").forEach(el => observer.observe(el));
    }
    if (visual) {
      update();
      window.addEventListener("scroll", scroll, { passive: true });
    }
  };
  reduced.addEventListener("change", configure);
  configure();
})();
