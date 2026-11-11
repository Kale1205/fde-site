(() => {
  "use strict";

  const locale = document.documentElement.lang.startsWith("zh")
    ? "zh"
    : document.documentElement.lang === "ja" ? "ja" : "en";
  const isJapanese = locale === "ja";
  const galleryScriptURL = document.currentScript?.src || new URL("gallery-ui.js", document.baseURI).href;
  // Motion is a real development-build capture, loaded only when in view.
  // Native controls remain available; reduced-motion users opt in to playback.
  const operationVideo = document.querySelector(".mission-recording video:not([data-motion-video])");
  if (operationVideo && "IntersectionObserver" in window) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        operationVideo.pause();
      } else if (!started && !reducedMotion.matches) {
        started = true;
        operationVideo.play().catch(() => { /* Playback remains available via controls. */ });
      }
    }, { threshold: 0.35 });
    observer.observe(operationVideo);
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) operationVideo.pause();
    });
  }
  const text = {
    en: {
      openMenu: "Open menu", closeMenu: "Close menu", menu: "Menu", product: "Product", demo: "Demo", contact: "Contact",
      language: "Language", chooseLanguage: "Choose language", displaySettings: "Display settings", stillIcons: "Use still icons", stillHelp: "Keep decorative icons still. Saved in this browser.", systemStillHelp: "Your device's reduced-motion setting is enabled.",
      received: "Received one unit", shipped: "Shipped one unit", ok: "OK", low: "Low stock",
      tools: ["Inventory", "Products", "Records", "Shipping", "Settings"],
    },
    ja: {
      openMenu: "メニューを開く", closeMenu: "メニューを閉じる", menu: "メニュー", product: "FDE製品", demo: "デモ", contact: "お問い合わせ",
      language: "言語", chooseLanguage: "言語を選択", displaySettings: "表示設定", stillIcons: "アイコンを静止表示", stillHelp: "装飾アイコンの動きを止めます。このブラウザーに保存します。", systemStillHelp: "端末の動作軽減設定が有効です。",
      received: "1点を入庫しました", shipped: "1点を出庫しました", ok: "正常", low: "要補充",
      tools: ["在庫一覧", "商品", "記録", "出荷", "設定"],
    },
    zh: {
      openMenu: "打开菜单", closeMenu: "关闭菜单", menu: "菜单", product: "产品", demo: "演示", contact: "联系我们",
      language: "语言", chooseLanguage: "选择语言", displaySettings: "显示设置", stillIcons: "使用静态图标", stillHelp: "停止装饰图标动画。在此浏览器中保存。", systemStillHelp: "设备已启用减少动态效果。",
      received: "已入库 1 件", shipped: "已出库 1 件", ok: "正常", low: "需要补货",
      tools: ["库存", "产品", "记录", "出库", "设置"],
    },
  }[locale];

  const thresholds = {
    "PC-1204": 40,
    "LR-0041": 25,
    "TP-3011": 30,
    "PT-5002": 20,
    "BM-2501": 30,
  };

  const toast = document.querySelector(".toast");
  let toastTimer = 0;
  const showToast = (message) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2400);
  };

  const menuButton = document.querySelector(".menu-button");
  const mobileNav = document.getElementById("mobile-nav");
  if (menuButton && mobileNav) {
    const interfaceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const header = document.querySelector(".site-header");
    const localeNames = { en: "English", ja: "日本語", "zh-CN": "简体中文" };
    const localeKey = locale === "zh" ? "zh-CN" : locale;
    const localizeAlternateUrl = (href) => {
      const url = new URL(href, window.location.href);
      if (!/^(?:localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return url.href;
      return `${url.pathname.replace(/^\/fde-site\//, "/")}${url.search}${url.hash}`;
    };
    const localeRoutes = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
      .filter(link => Object.hasOwn(localeNames, link.hreflang))
      .map(link => ({ code: link.hreflang, name: localeNames[link.hreflang], href: localizeAlternateUrl(link.href) }));
    const sourceLocaleButtons = Array.from(document.querySelectorAll(".header-actions .locale-button"));
    let languageButton = null, languagePanel = null;
    if (localeRoutes.length === 3 && sourceLocaleButtons.length) {
      const picker = document.createElement("div");
      picker.className = "locale-picker";
      languageButton = document.createElement("button");
      languageButton.type = "button";
      languageButton.className = "locale-picker-button";
      languageButton.setAttribute("aria-label", `${text.chooseLanguage}: ${localeNames[localeKey]}`);
      languageButton.setAttribute("aria-controls", "language-menu");
      languageButton.setAttribute("aria-haspopup", "menu");
      languageButton.innerHTML = `<span>${localeNames[localeKey]}</span><span class="locale-picker-chevron" aria-hidden="true">⌄</span>`;
      languagePanel = document.createElement("div");
      languagePanel.id = "language-menu";
      languagePanel.className = "locale-picker-menu";
      languagePanel.hidden = true;
      languagePanel.setAttribute("role", "menu");
      languagePanel.setAttribute("aria-label", text.chooseLanguage);
      for (const route of localeRoutes) {
        const link = document.createElement("a");
        link.href = route.href;
        link.hreflang = route.code;
        link.lang = route.code;
        link.textContent = route.name;
        link.setAttribute("role", "menuitemradio");
        link.setAttribute("aria-checked", String(route.code === localeKey));
        link.tabIndex = -1;
        if (route.code === localeKey) {
          link.setAttribute("aria-current", "page");
          const mark = document.createElement("span");
          mark.setAttribute("aria-hidden", "true");
          mark.textContent = "✓";
          link.append(mark);
        }
        languagePanel.append(link);
      }
      picker.append(languageButton);
      sourceLocaleButtons[0].before(picker);
      sourceLocaleButtons.forEach(button => button.remove());
      document.body.append(languagePanel);
    }

    const desktopNav = document.querySelector(".desktop-nav");
    if (desktopNav && !desktopNav.querySelector('a[href$="demo.html"]')) {
      const link = document.createElement("a");
      link.href = "demo.html";
      link.textContent = text.demo;
      if (window.location.pathname.endsWith("/demo.html")) link.setAttribute("aria-current", "page");
      (desktopNav.querySelector("[data-lp-destination]") || desktopNav.firstElementChild)?.after(link);
    }
    const originalLinks = Array.from(mobileNav.querySelectorAll("a"));
    const byHref = (fragment) => originalLinks.find((link) => !link.hasAttribute("hreflang") && link.getAttribute("href")?.includes(fragment));
    const productLink = originalLinks[0];
    const lpSource = isJapanese ? mobileNav.querySelector("[data-lp-destination]") : null;
    const goalsLink = byHref("goals.html");
    const newsLink = byHref("news.html");
    const contactLink = byHref("contact.html") || originalLinks.at(-1);
    const demoLink = document.createElement("a");
    demoLink.href = "demo.html";
    demoLink.textContent = text.demo;
    if (window.location.pathname.endsWith("/demo.html")) demoLink.setAttribute("aria-current", "page");

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-nav-backdrop";
    backdrop.hidden = true;
    backdrop.tabIndex = -1;
    backdrop.setAttribute("aria-label", text.closeMenu);

    const handle = document.createElement("span");
    handle.className = "mobile-nav-handle";
    handle.setAttribute("aria-hidden", "true");

    const sheetHeader = document.createElement("div");
    sheetHeader.className = "mobile-nav-header";
    const sheetTitle = document.createElement("strong");
    sheetTitle.textContent = text.menu;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "mobile-nav-close";
    closeButton.setAttribute("aria-label", text.closeMenu);
    closeButton.innerHTML = '<span aria-hidden="true">×</span>';
    sheetHeader.append(sheetTitle, closeButton);

    const shortcutIcons = {
      lp: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M32 40h192v176H32Zm0 48h192M64 64h.1M88 64h.1M72 128h112m-112 32h80" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      product: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M223.68 66.15 135.68 18a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14ZM120 219.57 40 175.82V90l80 43.78Zm8-99.57L47.66 76 128 32l80.34 44Zm88 55.78-80 43.79v-85.75L216 90Z"/></svg>',
      demo: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="m221.69 199.77-61.69-102.85V40h8a8 8 0 0 0 0-16H88a8 8 0 0 0 0 16h8v56.92L34.31 199.77A16 16 0 0 0 48 224h160a16 16 0 0 0 13.69-24.23ZM112 101V40h32v61a8 8 0 0 0 1.14 4.15L183.36 168H72.64l38.22-62.85A8 8 0 0 0 112 101ZM48 208l14.59-24h130.82L208 208Z"/></svg>',
      contact: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M224 48H32a8 8 0 0 0-8 8v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8Zm-20.57 16L128 133.15 52.57 64ZM216 200H40V74.19l82.59 75.74a8 8 0 0 0 10.82 0L216 74.19Z"/></svg>',
      goals: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M48 224V32m0 16h144l-24 48 24 48H48" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      news: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M64 24h88l40 40v168H64Zm80 0v48h48M96 112h64m-64 40h64m-64 40h48" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    const makeShortcut = (link, icon, label) => {
      const clone = link.cloneNode(false);
      clone.className = "mobile-nav-shortcut mobile-nav-item";
      const iconWrap = document.createElement("span");
      iconWrap.className = "mobile-nav-shortcut-icon";
      iconWrap.innerHTML = shortcutIcons[icon];
      const labelWrap = document.createElement("span");
      labelWrap.className = "mobile-nav-item-label";
      labelWrap.textContent = label;
      if (clone.hasAttribute("data-lp-destination") && !clone.hasAttribute("href")) {
        const status = document.createElement("span");
        status.className = "nav-destination-status";
        status.textContent = "準備中";
        labelWrap.append(status);
      }
      clone.append(iconWrap, labelWrap);
      return clone;
    };

    const shortcuts = document.createElement("div");
    shortcuts.className = "mobile-nav-shortcuts";
    shortcuts.append(
      makeShortcut(productLink, "product", text.product),
      ...(lpSource ? [makeShortcut(lpSource, "lp", "LP制作"), makeShortcut(demoLink, "demo", text.demo)] :
        [makeShortcut(demoLink, "demo", text.demo), makeShortcut(contactLink, "contact", text.contact)])
    );

    const rows = document.createElement("div");
    rows.className = "mobile-nav-rows";
    [...(lpSource ? [[contactLink, "contact"]] : []), [goalsLink, "goals"], [newsLink, "news"]].forEach(([source, icon]) => {
      if (!source) return;
      const link = makeShortcut(source, icon, source.textContent.trim());
      link.classList.add("mobile-nav-row");
      rows.append(link);
    });

    const languageBlock = document.createElement("div");
    languageBlock.className = "mobile-nav-language";
    const languageLabel = document.createElement("strong");
    languageLabel.textContent = text.language;
    const languageOptions = document.createElement("div");
    languageOptions.className = "mobile-nav-language-options";
    localeRoutes.forEach((route) => {
      const link = document.createElement("a");
      link.href = route.href;
      link.hreflang = route.code;
      link.lang = route.code;
      link.textContent = route.name;
      if (route.code === localeKey) link.setAttribute("aria-current", "page");
      languageOptions.append(link);
    });
    languageBlock.append(languageLabel, languageOptions);

    mobileNav.classList.add("mobile-sheet");
    mobileNav.setAttribute("aria-label", text.menu);
    mobileNav.replaceChildren(handle, sheetHeader, shortcuts, rows, languageBlock);
    // The footer keeps a persistent, native still-icon preference.
    import(new URL("motion-preferences.js", galleryScriptURL).href).then(({ motionPreference }) => {
      const style = document.createElement("link"), styleURL = new URL("motion-preferences.css", galleryScriptURL);
      const version = new URL(galleryScriptURL).searchParams.get("v");
      if (version) styleURL.searchParams.set("v", version);
      style.rel = "stylesheet"; style.href = styleURL.href; document.head.append(style);
      const controls = [];
      const control = suffix => {
        const label = document.createElement("label"), input = document.createElement("input"), copy = document.createElement("span"), title = document.createElement("span"), help = document.createElement("small");
        label.className = "motion-preference-row"; input.type = "checkbox"; input.dataset.stillIcons = "";
        input.setAttribute("aria-label", text.stillIcons); input.setAttribute("aria-describedby", `still-icons-help-${suffix}`);
        title.className = "motion-preference-title"; title.textContent = text.stillIcons; help.id = `still-icons-help-${suffix}`;
        copy.append(title, help); label.append(input, copy); controls.push({ input, help });
        input.addEventListener("change", () => motionPreference.setReduced(input.checked));
        return label;
      };
      const footer = document.querySelector(".site-footer .footer-nav") || document.querySelector(".site-footer nav");
      if (footer) {
        const settings = document.createElement("details"), summary = document.createElement("summary");
        settings.className = "motion-display-settings"; summary.textContent = text.displaySettings;
        settings.append(summary, control("footer")); footer.append(settings);
        settings.addEventListener("keydown", event => { if (event.key === "Escape" && settings.open) { event.preventDefault(); settings.open = false; summary.focus(); } });
      }
      const refresh = () => { for (const { input, help } of controls) { input.checked = motionPreference.matches; input.disabled = motionPreference.systemReduced; help.textContent = motionPreference.systemReduced ? text.systemStillHelp : text.stillHelp; } };
      motionPreference.addEventListener("change", refresh); refresh();
    }).catch(() => { /* Unsupported module loading also leaves the icon runtime static. */ });
    // Keep both overlay layers in the same top-level stacking context. Leaving
    // the sheet inside the sticky header lets iOS Safari paint the backdrop
    // above it, which makes every visible menu link untappable.
    document.body.append(backdrop, mobileNav);
    menuButton.removeAttribute("aria-haspopup");

    // One owner for both popovers and background interaction. In particular,
    // the language trigger must stay operable while navigation is open.
    const panels = new Map([["navigation", { element: mobileNav, trigger: menuButton, run: 0, animation: null }]]);
    if (languageButton) panels.set("language", { element: languagePanel, trigger: languageButton, run: 0, animation: null });
    let active = "", focusRun = 0, drag = null;
    const isVisible = element => element && !element.closest("[inert]") && !element.matches(":disabled") && element.tabIndex >= 0 && element.getClientRects().length > 0;
    function position() {
      const headerBottom = Math.max(0, header.getBoundingClientRect().bottom);
      backdrop.style.setProperty("--header-bottom", `${headerBottom}px`);
      mobileNav.style.setProperty("--menu-available-height", `${Math.max(96, window.innerHeight - headerBottom - 32)}px`);
      if (languageButton) {
        const rect = languageButton.getBoundingClientRect();
        const width = Math.min(208, window.innerWidth - 24);
        const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
        const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 154));
        languagePanel.style.left = `${left}px`;
        languagePanel.style.top = `${top}px`;
        languagePanel.style.width = `${width}px`;
        languagePanel.style.maxHeight = `${Math.max(96, window.innerHeight - top - 12)}px`;
        languagePanel.style.transformOrigin = `${rect.x + rect.width / 2 - left}px top`;
      }
    }
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    // A damped spring retains its position and velocity when a new target arrives.
    function springAt(motion, seconds) {
      const { value, velocity, target, omega, damping } = motion;
      const decay = omega * damping, frequency = omega * Math.sqrt(1 - damping * damping);
      const displacement = value - target, coefficient = (velocity + decay * displacement) / frequency;
      const wave = displacement * Math.cos(frequency * seconds) + coefficient * Math.sin(frequency * seconds);
      const envelope = Math.exp(-decay * seconds);
      return {
        value: target + envelope * wave,
        velocity: envelope * (-decay * wave + frequency * (-displacement * Math.sin(frequency * seconds) + coefficient * Math.cos(frequency * seconds)))
      };
    }
    function currentSpring(view, name = "navigation") {
      if (!view.animation || !view.motion) return { value: view.value || 0, velocity: view.velocity || 0 };
      const time = Math.max(0, Number(view.animation.currentTime) || 0) / 1000;
      const nominal = springAt(view.motion, time), transform = getComputedStyle(view.element).transform;
      if (transform === "none" || !window.DOMMatrix) return nominal;
      const matrix = new DOMMatrix(transform);
      const value = name === "navigation" ? 1 - matrix.m42 / view.distance : 1 + matrix.m42 / 8;
      const strain = name === "navigation" ? matrix.m22 - 1 : matrix.m22 - .82 - .18 * value;
      if (strain > -.0219 && strain < .0379) return { value, velocity: strain / .006 };
      // The compositor can trail the timeline in WebKit. Match the visible pose
      // before reusing velocity when the stretch limit masks its exact value.
      let nearest = nominal, score = Infinity;
      for (let index = 0; index <= 50; index += 1) {
        const sample = springAt(view.motion, Math.max(0, time - .075 + index * .002));
        const error = Math.abs(sample.value - value) + (Math.sign(sample.velocity) === Math.sign(strain) ? 0 : 1);
        if (error < score) { nearest = sample; score = error; }
      }
      return { value, velocity: nearest.velocity };
    }
    function panelFrame(name, value, velocity, distance) {
      const strain = clamp(velocity * .006, -.022, .038);
      if (name === "navigation") return {
        opacity: clamp(value * 2, 0, 1),
        transform: `translateY(${(1 - value) * distance}px) scale(${1 - Math.abs(strain) * .35}, ${1 + strain})`
      };
      return {
        opacity: clamp(value * 1.5, 0, 1),
        transform: `translateY(${(1 - value) * -8}px) scale(${.9 + .1 * value - strain * .4}, ${.82 + .18 * value + strain})`
      };
    }
    function render(name, open, instant) {
      const view = panels.get(name), element = view.element, state = currentSpring(view, name);
      const presented = element.hidden ? null : { opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform };
      const backdropOpacity = name === "navigation" && !backdrop.hidden ? getComputedStyle(backdrop).opacity : null;
      const wasHidden = element.hidden, run = ++view.run;
      view.animation?.cancel();
      view.backdropAnimation?.cancel();
      view.animation = null;
      view.motion = null;
      view.trigger.setAttribute("aria-expanded", String(open));
      if (name === "navigation") view.trigger.setAttribute("aria-label", open ? text.closeMenu : text.openMenu);
      element.inert = !open;
      element.style.pointerEvents = open ? "" : "none";
      if (open) { element.hidden = false; if (wasHidden) element.scrollTop = 0; }
      if (name === "navigation") {
        backdrop.inert = !open;
        backdrop.style.pointerEvents = open ? "" : "none";
        if (open) backdrop.hidden = false;
      }
      const finish = () => {
        if (run !== view.run) return;
        view.value = active === name ? 1 : 0;
        view.velocity = 0;
        view.motion = null;
        view.animation?.cancel();
        view.backdropAnimation?.cancel();
        view.animation = null;
        element.style.removeProperty("transform");
        element.style.removeProperty("opacity");
        element.hidden = active !== name;
        if (name === "navigation") {
          backdrop.hidden = active !== name;
          backdrop.style.removeProperty("opacity");
        }
      };
      if (instant || interfaceMotion.matches || document.hidden || !element.animate || !open && wasHidden) { finish(); return; }
      const duration = open ? name === "navigation" ? 580 : 460 : name === "navigation" ? 300 : 260;
      const motion = { ...state, target: open ? 1 : 0, omega: open ? name === "navigation" ? 22 : 28 : 32, damping: open ? name === "navigation" ? .72 : .66 : .9 };
      view.motion = motion;
      const distance = element.offsetHeight + 24;
      view.distance = distance;
      const count = Math.ceil(duration / (1000 / 60)), frames = [], backdropFrames = [];
      for (let index = 0; index <= count; index += 1) {
        const offset = index / count, sample = index === count ? { value: motion.target, velocity: 0 } : springAt(motion, offset * duration / 1000);
        frames.push({ ...panelFrame(name, sample.value, sample.velocity, distance), offset });
        backdropFrames.push({ opacity: clamp(sample.value, 0, 1), offset });
      }
      if (presented) frames[0] = { ...presented, offset: 0 };
      // Preserve the visible pose while WebKit prepares the new compositor effect.
      Object.assign(element.style, { opacity: frames[0].opacity, transform: frames[0].transform });
      view.animation = element.animate(frames, { duration, easing: "linear", fill: "both" });
      if (name === "navigation") {
        backdrop.hidden = false;
        if (backdropOpacity !== null) backdropFrames[0].opacity = backdropOpacity;
        backdrop.style.opacity = String(backdropFrames[0].opacity);
        view.backdropAnimation = backdrop.animate(backdropFrames, { duration, easing: "linear", fill: "both" });
      }
      view.animation.finished.then(finish).catch(() => {});
    }
    function setPanel(next, { focus = "", restore = false, instant = false } = {}) {
      if (next && !panels.has(next)) return;
      if (drag) {
        const pointerId = drag.id;
        drag = null;
        if (mobileNav.hasPointerCapture?.(pointerId)) mobileNav.releasePointerCapture(pointerId);
        mobileNav.removeAttribute("data-dragging");
      }
      const previous = active, run = ++focusRun;
      active = next;
      position();
      for (const [name] of panels) render(name, next === name, instant || !!next && name !== next);
      const navigationOpen = next === "navigation";
      document.documentElement.classList.toggle("mobile-menu-open", navigationOpen);
      for (const element of document.querySelectorAll("main, .site-footer")) element.inert = navigationOpen;
      if (focus && next) window.requestAnimationFrame(() => {
        if (run !== focusRun || active !== next) return;
        const element = panels.get(next).element;
        const items = Array.from(element.querySelectorAll("a[href], button"));
        const target = focus === "last" ? items.at(-1) : focus === "current" ? element.querySelector('[aria-current="page"]') || items[0] : items[0];
        target?.focus({ preventScroll: true });
      });
      if (restore && previous) {
        const trigger = panels.get(previous).trigger;
        (isVisible(trigger) ? trigger : languageButton)?.focus({ preventScroll: true });
      }
    }
    // The existing grabber and title area support the same downward dismissal.
    mobileNav.addEventListener("pointerdown", event => {
      if (active !== "navigation" || event.button !== 0 || event.target.closest("a, button") || !event.target.closest(".mobile-nav-handle, .mobile-nav-header")) return;
      const view = panels.get("navigation"), state = currentSpring(view);
      ++view.run;
      view.animation?.cancel();
      view.backdropAnimation?.cancel();
      view.animation = null;
      view.motion = null;
      view.value = state.value;
      view.velocity = 0;
      const distance = mobileNav.offsetHeight + 24;
      drag = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, speed: 0, value: state.value, distance };
      mobileNav.setPointerCapture(event.pointerId);
      mobileNav.setAttribute("data-dragging", "");
      Object.assign(mobileNav.style, panelFrame("navigation", view.value, 0, distance));
      backdrop.style.opacity = String(clamp(view.value, 0, 1));
    });
    mobileNav.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      const elapsed = event.timeStamp - drag.lastTime;
      if (elapsed > 0) drag.speed = (event.clientY - drag.lastY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
      const delta = event.clientY - drag.startY, resisted = delta < 0 ? delta * .2 : delta;
      const view = panels.get("navigation");
      view.value = clamp(drag.value - resisted / drag.distance, 0, 1.025);
      view.velocity = 0;
      Object.assign(mobileNav.style, panelFrame("navigation", view.value, 0, drag.distance));
      backdrop.style.opacity = String(clamp(view.value, 0, 1));
    });
    const endDrag = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const state = drag, view = panels.get("navigation"), delta = event.clientY - state.startY;
      drag = null;
      mobileNav.removeAttribute("data-dragging");
      if (mobileNav.hasPointerCapture?.(state.id)) mobileNav.releasePointerCapture(state.id);
      const speed = event.timeStamp - state.lastTime > 80 ? 0 : state.speed;
      view.velocity = event.type === "pointercancel" ? 0 : clamp(-speed * 1000 / state.distance, -12, 12);
      if (active !== "navigation") return;
      const dismiss = event.type !== "pointercancel" && (delta > Math.min(100, state.distance * .22) || speed > .65 && delta > 20);
      setPanel(dismiss ? "" : "navigation", { restore: dismiss });
    };
    mobileNav.addEventListener("pointerup", endDrag);
    mobileNav.addEventListener("pointercancel", endDrag);
    menuButton.addEventListener("click", () => setPanel(active === "navigation" ? "" : "navigation", { focus: "first" }));
    languageButton?.addEventListener("click", () => setPanel(active === "language" ? "" : "language", { focus: "current" }));
    closeButton.addEventListener("click", () => setPanel("", { restore: true }));
    backdrop.addEventListener("click", () => setPanel("", { restore: true }));
    const deferLinkClose = event => {
      if (!event.target.closest("a[href]")) return;
      const expected = active, run = focusRun;
      window.setTimeout(() => { if (active === expected && run === focusRun) setPanel("", { instant: true }); }, 0);
    };
    mobileNav.addEventListener("click", deferLinkClose);
    languagePanel?.addEventListener("click", deferLinkClose);
    document.addEventListener("pointerdown", event => {
      if (!active) return;
      if (backdrop === event.target || [...panels.values()].some(view => view.trigger.contains(event.target) || view.element.contains(event.target))) return;
      setPanel("");
    });
    document.addEventListener("focusin", event => {
      if (active === "language" && !languagePanel.contains(event.target) && !languageButton.contains(event.target)) setPanel("");
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && active) { event.preventDefault(); setPanel("", { restore: true }); return; }
      if (languageButton && event.target === languageButton && ["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault(); setPanel("language", { focus: event.key === "ArrowUp" ? "last" : "first" }); return;
      }
      if (active === "language" && languagePanel.contains(event.target)) {
        const items = Array.from(languagePanel.querySelectorAll("a[href]")), index = items.indexOf(document.activeElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
          items[next].focus();
        } else if (event.key === " ") { event.preventDefault(); document.activeElement.click(); }
        else if (event.key === "Tab") {
          event.preventDefault(); setPanel("", { instant: true });
          const items = Array.from(document.querySelectorAll("a[href], button, input, select, textarea")).filter(isVisible);
          const index = items.indexOf(languageButton), target = items[index + (event.shiftKey ? -1 : 1)] || languageButton;
          target.focus({ preventScroll: true });
        }
      } else if (active === "navigation" && event.key === "Tab") {
        const items = [...header.querySelectorAll("a[href], button"), ...mobileNav.querySelectorAll("a[href], button, input")].filter(isVisible);
        // Safari can omit buttons from its native Tab order. Keep every visible
        // header/sidebar control reachable with the same sequence in all engines.
        event.preventDefault();
        const index = items.indexOf(document.activeElement);
        const next = index < 0 ? event.shiftKey ? items.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080 && active === "navigation") setPanel("", { instant: true, restore: true });
      else if (active) setPanel(active, { instant: true });
      else position();
    });
    window.addEventListener("scroll", () => {
      if (active !== "language") return;
      if (languageButton.getBoundingClientRect().bottom <= 0) setPanel("", { instant: true });
      else position();
    }, { passive: true });
    interfaceMotion.addEventListener("change", () => { if (interfaceMotion.matches) setPanel(active, { instant: true }); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) setPanel("", { instant: true }); });
    // BFCache/history must never restore an inert page or a stale closing menu.
    window.addEventListener("pagehide", () => setPanel("", { instant: true }));
    window.addEventListener("pageshow", () => setPanel("", { instant: true }));
    setPanel("", { instant: true });
  }

  const planButtons = Array.from(document.querySelectorAll("[data-license-plan]"));
  const planSummary = document.querySelector("[data-license-summary]");
  if (planButtons.length && planSummary) {
    const planData = locale === "ja" ? {
      license: { name: "License", price: "49,800円", points: ["ソースコードの提供：なし", "社内での改変：不可", "更新：3か月含む・以降は任意"] },
      plus: { name: "License Plus", price: "99,800円", points: ["ソースコードの提供：あり", "社内での改変：可能", "更新・セキュリティ：購入者が管理"] }
    } : locale === "zh" ? {
      license: { name: "License", price: "$349", points: ["不提供源代码", "不允许内部修改", "包含 3 个月更新，之后可选购"] },
      plus: { name: "License Plus", price: "$699", points: ["包含完整源代码", "允许内部修改", "更新与安全由购买方管理"] }
    } : {
      license: { name: "License", price: "$349", points: ["Source code not included", "Internal modification not permitted", "Updates: 3 months included, then optional"] },
      plus: { name: "License Plus", price: "$699", points: ["Full source code included", "Internal modification permitted", "Updates and security managed by purchaser"] }
    };
    const selectPlan = (key) => {
      const plan = planData[key];
      if (!plan) return;
      document.body.dataset.selectedPlan = key;
      planButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.licensePlan === key)));
      planSummary.querySelector("[data-license-name]").textContent = plan.name;
      planSummary.querySelector("[data-license-price]").textContent = plan.price;
      const list = planSummary.querySelector("[data-license-points]");
      list.replaceChildren(...plan.points.map((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        return item;
      }));
      // Keep the selected column visible without shrinking the mobile comparison.
      // Only the table scrolls; the selector and summary remain in normal flow.
      if (document.body.classList.contains("license-renewal") && window.matchMedia("(max-width: 760px)").matches) {
        const region = document.querySelector(".license-matrix-region");
        requestAnimationFrame(() => {
          region.scrollLeft = key === "plus" ? region.scrollWidth - region.clientWidth : 0;
        });
      }
    };
    planButtons.forEach((button) => button.addEventListener("click", () => selectPlan(button.dataset.licensePlan)));
    selectPlan("plus");
  }

  // Reuse the real product markup as a decorative, inert layer. Never duplicate
  // operational controls in the keyboard or accessibility trees.
  const preview = document.querySelector(".source-home #preview-panel");
  if (preview) {
    const echo = preview.querySelector(".inventory-table").cloneNode(true);
    echo.removeAttribute("id");
    echo.classList.add("product-window", "product-echo");
    echo.setAttribute("aria-hidden", "true");
    echo.setAttribute("inert", "");
    echo.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    preview.after(echo);
  }

  const rows = Array.from(document.querySelectorAll("#preview-panel .inventory-row:not(.inventory-head)"));
  let selectedRow = rows.find((row) => row.classList.contains("selected")) || rows[0];

  const rowData = (row) => {
    const sku = row.children[1]?.textContent.trim() || "";
    const stock = Number.parseInt(row.querySelector("strong")?.textContent || "0", 10);
    return { sku, stock: Number.isFinite(stock) ? stock : 0 };
  };

  const updateSummary = () => {
    const lowCount = rows.reduce((count, row) => {
      const { sku, stock } = rowData(row);
      return count + (stock <= (thresholds[sku] ?? 0) ? 1 : 0);
    }, 0);
    const lowMetric = document.querySelector(".metric-grid strong.orange");
    if (lowMetric) lowMetric.textContent = String(lowCount);
  };

  const updateRow = (row, nextStock) => {
    const { sku } = rowData(row);
    const stock = Math.max(0, nextStock);
    const isLow = stock <= (thresholds[sku] ?? 0);
    const stockCell = row.querySelector("strong");
    const statusCell = row.children[3];
    if (stockCell) stockCell.textContent = String(stock);
    if (statusCell) {
      statusCell.textContent = isLow ? text.low : text.ok;
      statusCell.className = isLow ? "stock-low" : "stock-ok";
    }
    // Let the updated visible cells supply the accessible name as well.
    row.removeAttribute("aria-label");
    updateSummary();
  };

  rows.forEach((row) => {
    row.addEventListener("click", () => {
      rows.forEach((item) => {
        const selected = item === row;
        item.classList.toggle("selected", selected);
        if (selected) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      selectedRow = row;
    });
  });

  const stockButtons = document.querySelectorAll(".product-footer button");
  stockButtons[0]?.addEventListener("click", () => {
    if (!selectedRow) return;
    updateRow(selectedRow, rowData(selectedRow).stock + 1);
    showToast(text.received);
  });
  stockButtons[1]?.addEventListener("click", () => {
    if (!selectedRow) return;
    updateRow(selectedRow, rowData(selectedRow).stock - 1);
    showToast(text.shipped);
  });

  document.querySelectorAll(".product-rail button").forEach((button, index, buttons) => {
    button.title = text.tools[index] || "";
    button.addEventListener("click", () => {
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      showToast(text.tools[index] || "");
    });
  });

  updateSummary();
})();
