// Presentation layer only. All inventory operations use the existing public demo.
(() => {
  'use strict';
  const root = document.getElementById('imsDemoRoot');
  const toggle = document.querySelector('.motion-toggle');
  if (!root || !toggle) return;
  const form = document.getElementById('demoOperationForm');
  const product = document.getElementById('demoProduct');
  const quantity = document.getElementById('demoQuantity');
  const result = document.getElementById('demoResult');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const steps = [...document.querySelectorAll('[data-motion-step]')];
  const announce = document.getElementById('motion-announcement');
  const mobileStock = document.querySelector('.mobile-stock');
  const lang = document.documentElement.lang;
  const initial = result.textContent;
  let timer = 0;
  let phase = 0;
  let running = false;
  let hasStarted = false;
  let completed = false;
  let visible = false;
  let internal = false;
  let userPaused = false;
  let highlightTimer = 0;

  function clearFocus() {
    root.querySelectorAll('[data-motion-focus]').forEach(el => el.removeAttribute('data-motion-focus'));
  }
  function focusCue(el) {
    clearFocus();
    el.dataset.motionFocus = 'true';
  }
  function setStep(index) {
    steps.forEach((el, i) => i === index ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current'));
  }
  function label() {
    toggle.textContent = running ? toggle.dataset.pause : completed ? toggle.dataset.replay : toggle.dataset.play;
    toggle.setAttribute('aria-pressed', String(running));
  }
  function pause(manual = false) {
    clearTimeout(timer);
    running = false;
    if (manual) userPaused = true;
    clearFocus();
    result.setAttribute('aria-live', 'polite');
    label();
  }
  function updateMobile() {
    const products = [...product.options];
    const index = products.findIndex(option => option.value === product.value);
    // Reflect the actual demo-rendered row. No second inventory data model.
    const rows = [...document.querySelectorAll('#inventoryBody tr')];
    const row = rows.find(item => item.querySelector('[data-demo-product]')?.dataset.demoProduct === product.value);
    if (!row || index < 0) return;
    document.querySelector('[data-mobile-product]').textContent = products[index].textContent;
    ['main', 'osaka', 'total'].forEach((key, i) => {
      document.querySelector(`[data-mobile-${key}]`).textContent = row.children[i + 1].textContent;
    });
  }
  function highlight() {
    clearTimeout(highlightTimer);
    const row = [...document.querySelectorAll('#inventoryBody tr')].find(item => item.querySelector('[data-demo-product]')?.dataset.demoProduct === product.value);
    row?.classList.add('stock-changed');
    mobileStock.classList.add('stock-changed');
    highlightTimer = setTimeout(() => {
      row?.classList.remove('stock-changed');
      mobileStock.classList.remove('stock-changed');
    }, 1800);
  }
  function changed(el, value) {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function tick() {
    if (!running || document.hidden || !visible) return;
    internal = true;
    if (phase === 0) {
      document.getElementById('demoReset').click();
      result.textContent = initial;
      changed(document.getElementById('demoOperation'), 'receive');
      changed(product, 'cup');
      quantity.value = '';
      setStep(0);
      focusCue(product);
    } else if (phase === 1) {
      changed(document.getElementById('demoDestination'), 'osaka');
      focusCue(document.getElementById('demoDestination'));
    } else if (phase === 2) {
      quantity.value = '5';
      setStep(1);
      focusCue(quantity);
    } else if (phase === 3) {
      focusCue(document.getElementById('demoApply'));
    } else if (phase === 4) {
      form.requestSubmit();
      setStep(2);
      clearFocus();
      updateMobile();
      highlight();
      completed = true;
      pause();
      announce.textContent = result.textContent;
    }
    internal = false;
    phase += 1;
    if (running) timer = setTimeout(tick, 1500);
  }
  function start() {
    if (document.hidden || !visible) return;
    userPaused = false;
    hasStarted = true;
    if (completed) { phase = 0; completed = false; }
    running = true;
    announce.textContent = '';
    // Avoid announcing each automatic focus cue. Announce the final outcome once.
    result.setAttribute('aria-live', 'off');
    label();
    if (reduced.matches) {
      while (running && phase <= 4) { clearTimeout(timer); tick(); }
    } else {
      tick();
    }
  }
  toggle.addEventListener('click', () => running ? pause(true) : start());
  function manualInteraction(event) {
    if (internal || !event.isTrusted) return;
    pause(true);
    hasStarted = true;
    completed = false;
    // A replay now starts a complete example, rather than overwriting mid-flow.
    phase = 0;
    label();
  }
  root.addEventListener('pointerdown', manualInteraction);
  root.addEventListener('keydown', manualInteraction);
  root.addEventListener('input', manualInteraction);
  root.addEventListener('change', () => { updateMobile(); });
  form.addEventListener('submit', () => {
    updateMobile();
    if (result.dataset.state === 'success') highlight();
  });
  const reset = document.getElementById('demoReset');
  const resetHome = reset.parentElement;
  const compact = matchMedia('(max-width: 650px)');
  function placeReset() {
    if (compact.matches) toggle.before(reset);
    else resetHome.append(reset);
  }
  compact.addEventListener('change', placeReset);
  placeReset();
  reset.setAttribute('aria-controls', 'imsDemoRoot');
  reset.addEventListener('pointerdown', manualInteraction);
  reset.addEventListener('keydown', manualInteraction);
  reset.addEventListener('click', () => {
    if (!internal) { pause(true); completed = false; phase = 0; label(); }
    updateMobile();
  });
  new MutationObserver(updateMobile).observe(document.getElementById('inventoryBody'), { childList: true });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pause();
    else if (!userPaused && !completed && (!hasStarted || phase > 0) && !reduced.matches) start();
  }, { threshold: 0.25 });
  observer.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (visible && !completed && !userPaused && !reduced.matches) start();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) pause(true); });
  // The gallery script owns sheet behavior; prevent background tabbing while open.
  const nav = document.getElementById('mobile-nav');
  new MutationObserver(() => {
    const open = !nav.hidden;
    document.querySelector('main').inert = open;
    document.querySelector('footer').inert = open;
    document.querySelector('.brand').inert = open;
    document.querySelector('.locale-picker').inert = open;
    if (open) pause();
  }).observe(nav, { attributes: true, attributeFilter: ['hidden'] });
  const destinationLabel = document.querySelector('#demoDestinationField label');
  function updateDestinationLabel() {
    const receiving = document.getElementById('demoOperation').value === 'receive';
    destinationLabel.textContent = lang === 'ja' ? receiving ? '入庫先' : '移動先' : lang.startsWith('zh') ? receiving ? '入库位置' : '目标位置' : 'Destination';
  }
  document.getElementById('demoOperation').addEventListener('change', updateDestinationLabel);
  document.getElementById('demoReset').addEventListener('click', updateDestinationLabel);
  updateDestinationLabel();
  const labels = { ja: ['商品', '本社 / A-01', '大阪 / B-02', '合計', '在庫状態', '選択'], en: ['Product', 'Main / A-01', 'Osaka / B-02', 'Total', 'Status', 'Select'], 'zh-CN': ['商品', '总部 / A-01', '大阪 / B-02', '合计', '状态', '选择'] }[lang];
  document.querySelectorAll('.demo-table').forEach(table => {
    table.querySelectorAll('thead th').forEach((th, i) => {
      th.scope = 'col';
      if (!th.textContent.trim()) th.textContent = labels[i] || labels.at(-1);
    });
  });
  updateMobile();
  label();
})();
