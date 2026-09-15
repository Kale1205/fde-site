(() => {
  "use strict";

  const isJapanese = document.documentElement.lang === "ja";
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
    openMenu: isJapanese ? "メニューを開く" : "Open menu",
    closeMenu: isJapanese ? "メニューを閉じる" : "Close menu",
    received: isJapanese ? "1点を入庫しました" : "Received one unit",
    shipped: isJapanese ? "1点を出庫しました" : "Shipped one unit",
    ok: isJapanese ? "正常" : "OK",
    low: isJapanese ? "要補充" : "Low stock",
    tools: isJapanese
      ? ["在庫一覧", "商品", "記録", "出荷", "設定"]
      : ["Inventory", "Products", "Records", "Shipping", "Settings"],
  };

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
      if (event.key === "Escape" && !mobileNav.hidden) {
        setMenu(false);
        menuButton.focus();
      }
    });
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
