(() => {
  "use strict";

  const locale = document.documentElement.lang.startsWith("zh")
    ? "zh"
    : document.documentElement.lang === "ja" ? "ja" : "en";
  const isJapanese = locale === "ja";
  // Motion is a real development-build capture, loaded only when in view.
  // Native controls remain available; reduced-motion users opt in to playback.
  const operationVideo = document.querySelector(".mission-recording video");
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
      language: "Language", chooseLanguage: "Choose language",
      received: "Received one unit", shipped: "Shipped one unit", ok: "OK", low: "Low stock",
      tools: ["Inventory", "Products", "Records", "Shipping", "Settings"],
    },
    ja: {
      openMenu: "メニューを開く", closeMenu: "メニューを閉じる", menu: "メニュー", product: "製品", demo: "デモ", contact: "お問い合わせ",
      language: "言語", chooseLanguage: "言語を選択",
      received: "1点を入庫しました", shipped: "1点を出庫しました", ok: "正常", low: "要補充",
      tools: ["在庫一覧", "商品", "記録", "出荷", "設定"],
    },
    zh: {
      openMenu: "打开菜单", closeMenu: "关闭菜单", menu: "菜单", product: "产品", demo: "演示", contact: "联系我们",
      language: "语言", chooseLanguage: "选择语言",
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
    const localeNames = { en: "English", ja: "日本語", "zh-CN": "简体中文" };
    const localeKey = locale === "zh" ? "zh-CN" : locale;
    const localizeAlternateUrl = (href) => {
      const url = new URL(href, window.location.href);
      if (!/^(?:localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return url.href;
      const projectPath = url.pathname.replace(/^\/fde-site\//, "/");
      return `${projectPath}${url.search}${url.hash}`;
    };
    const localeRoutes = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
      .filter((link) => Object.hasOwn(localeNames, link.hreflang))
      .map((link) => ({ code: link.hreflang, name: localeNames[link.hreflang], href: localizeAlternateUrl(link.href) }));

    const sourceLocaleButtons = Array.from(document.querySelectorAll(".header-actions .locale-button"));
    if (localeRoutes.length === 3 && sourceLocaleButtons.length) {
      const picker = document.createElement("details");
      picker.className = "locale-picker";
      const summary = document.createElement("summary");
      summary.className = "locale-picker-button";
      summary.setAttribute("aria-label", text.chooseLanguage);
      summary.innerHTML = `<span>${localeNames[localeKey]}</span><span class="locale-picker-chevron" aria-hidden="true">⌄</span>`;
      const menu = document.createElement("div");
      menu.className = "locale-picker-menu";
      menu.setAttribute("aria-label", text.chooseLanguage);
      localeRoutes.forEach((route) => {
        const link = document.createElement("a");
        link.href = route.href;
        link.hreflang = route.code;
        link.lang = route.code;
        link.textContent = route.name;
        if (route.code === localeKey) {
          link.setAttribute("aria-current", "page");
          const mark = document.createElement("span");
          mark.setAttribute("aria-hidden", "true");
          mark.textContent = "✓";
          link.append(mark);
        }
        menu.append(link);
      });
      picker.append(summary, menu);
      sourceLocaleButtons[0].before(picker);
      sourceLocaleButtons.forEach((button) => button.remove());
      document.addEventListener("pointerdown", (event) => {
        if (picker.open && !picker.contains(event.target)) picker.open = false;
      });
      picker.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          picker.open = false;
          summary.focus();
        }
      });
    }

    const desktopNav = document.querySelector(".desktop-nav");
    if (desktopNav && !desktopNav.querySelector('a[href$="demo.html"]')) {
      const demoLink = document.createElement("a");
      demoLink.href = "demo.html";
      demoLink.textContent = text.demo;
      if (window.location.pathname.endsWith("/demo.html")) demoLink.setAttribute("aria-current", "page");
      desktopNav.firstElementChild?.after(demoLink);
    }

    const originalLinks = Array.from(mobileNav.querySelectorAll("a"));
    const byHref = (fragment) => originalLinks.find((link) => link.getAttribute("href")?.includes(fragment));
    const productLink = originalLinks[0];
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
      product: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M223.68 66.15 135.68 18a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14ZM120 219.57 40 175.82V90l80 43.78Zm8-99.57L47.66 76 128 32l80.34 44Zm88 55.78-80 43.79v-85.75L216 90Z"/></svg>',
      demo: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="m221.69 199.77-61.69-102.85V40h8a8 8 0 0 0 0-16H88a8 8 0 0 0 0 16h8v56.92L34.31 199.77A16 16 0 0 0 48 224h160a16 16 0 0 0 13.69-24.23ZM112 101V40h32v61a8 8 0 0 0 1.14 4.15L183.36 168H72.64l38.22-62.85A8 8 0 0 0 112 101ZM48 208l14.59-24h130.82L208 208Z"/></svg>',
      contact: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M224 48H32a8 8 0 0 0-8 8v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8Zm-20.57 16L128 133.15 52.57 64ZM216 200H40V74.19l82.59 75.74a8 8 0 0 0 10.82 0L216 74.19Z"/></svg>'
    };
    const makeShortcut = (link, icon, label) => {
      const clone = link.cloneNode(false);
      clone.className = "mobile-nav-shortcut";
      const iconWrap = document.createElement("span");
      iconWrap.className = "mobile-nav-shortcut-icon";
      iconWrap.innerHTML = shortcutIcons[icon];
      const labelWrap = document.createElement("span");
      labelWrap.textContent = label;
      clone.append(iconWrap, labelWrap);
      return clone;
    };

    const shortcuts = document.createElement("div");
    shortcuts.className = "mobile-nav-shortcuts";
    shortcuts.append(
      makeShortcut(productLink, "product", text.product),
      makeShortcut(demoLink, "demo", text.demo),
      makeShortcut(contactLink, "contact", text.contact)
    );

    const rows = document.createElement("div");
    rows.className = "mobile-nav-rows";
    [goalsLink, newsLink].filter(Boolean).forEach((link) => {
      link.classList.add("mobile-nav-row");
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";
      link.append(arrow);
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
    mobileNav.replaceChildren(handle, sheetHeader, shortcuts, rows, languageBlock);
    // Keep both overlay layers in the same top-level stacking context. Leaving
    // the sheet inside the sticky header lets iOS Safari paint the backdrop
    // above it, which makes every visible menu link untappable.
    document.body.append(backdrop, mobileNav);
    menuButton.setAttribute("aria-haspopup", "true");

    const setMenu = (open) => {
      mobileNav.hidden = !open;
      backdrop.hidden = !open;
      document.documentElement.classList.toggle("mobile-menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? text.closeMenu : text.openMenu);
      if (open) window.requestAnimationFrame(() => closeButton.focus());
    };
    menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
    closeButton.addEventListener("click", () => {
      setMenu(false);
      menuButton.focus();
    });
    backdrop.addEventListener("click", () => {
      setMenu(false);
      menuButton.focus();
    });
    mobileNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        // Let the browser complete the link's default navigation first. Hiding
        // the link's containing sheet synchronously cancels navigation in
        // iOS Safari, leaving users on the dimmed page with only Close working.
        window.setTimeout(() => setMenu(false), 0);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !mobileNav.hidden) {
        setMenu(false);
        menuButton.focus();
      }
      if (event.key === "Tab" && !mobileNav.hidden) {
        const focusable = Array.from(mobileNav.querySelectorAll("a, button"));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080 && !mobileNav.hidden) setMenu(false);
    });
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
      planButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.licensePlan === key)));
      planSummary.querySelector("[data-license-name]").textContent = plan.name;
      planSummary.querySelector("[data-license-price]").textContent = plan.price;
      const list = planSummary.querySelector("[data-license-points]");
      list.replaceChildren(...plan.points.map((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        return item;
      }));
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
