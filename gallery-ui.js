(() => {
  "use strict";

  const isJapanese = document.documentElement.lang === "ja";
  const text = {
    openMenu: isJapanese ? "メニューを開く" : "Open menu",
    closeMenu: isJapanese ? "メニューを閉じる" : "Close menu",
    received: isJapanese ? "1点を入庫しました" : "Received one unit",
    shipped: isJapanese ? "1点を出庫しました" : "Shipped one unit",
    ok: isJapanese ? "正常" : "OK",
    low: isJapanese ? "在庫不足" : "Low stock",
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
      if (event.key === "Escape") setMenu(false);
    });
  }

  const rows = Array.from(document.querySelectorAll(".inventory-row:not(.inventory-head)"));
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
    const productName = row.children[0]?.textContent.trim() || "";
    row.setAttribute("aria-label", [productName, sku, stock, isLow ? text.low : text.ok].join(", "));
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

