// Manual-demo presentation only. Inventory operations stay in demo-v1.js.
(() => {
  'use strict';
  const root = document.getElementById('imsDemoRoot');
  if (!root) return;
  const form = document.getElementById('demoOperationForm');
  const product = document.getElementById('demoProduct');
  const result = document.getElementById('demoResult');
  const mobileStock = document.querySelector('.mobile-stock');
  const steps = [...document.querySelectorAll('[data-motion-step]')];
  const lang = document.documentElement.lang;
  let highlightTimer = 0;
  const setStep = index => steps.forEach((el, i) => i === index ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current'));
  function updateMobile() {
    const option = [...product.options].find(item => item.value === product.value);
    const row = [...document.querySelectorAll('#inventoryBody tr')].find(item => item.querySelector('[data-demo-product]')?.dataset.demoProduct === product.value);
    if (!row || !option) return;
    document.querySelector('[data-mobile-product]').textContent = option.textContent;
    ['main', 'osaka', 'total'].forEach((key, i) => {
      document.querySelector(`[data-mobile-${key}]`).textContent = row.children[i + 1].textContent;
    });
  }
  function highlight() {
    clearTimeout(highlightTimer);
    root.querySelectorAll('.stock-changed').forEach(row => row.classList.remove('stock-changed'));
    const row = [...document.querySelectorAll('#inventoryBody tr')].find(item => item.querySelector('[data-demo-product]')?.dataset.demoProduct === product.value);
    row?.classList.add('stock-changed');mobileStock.classList.add('stock-changed');
    highlightTimer = setTimeout(() => { row?.classList.remove('stock-changed');mobileStock.classList.remove('stock-changed'); }, 1800);
  }
  root.addEventListener('change', updateMobile);
  product.addEventListener('change', () => setStep(0));
  document.getElementById('demoQuantity').addEventListener('input', () => setStep(1));
  form.addEventListener('submit', () => {
    updateMobile();
    if (result.dataset.state === 'success') { setStep(2);highlight(); }
  });
  const reset = document.getElementById('demoReset'), resetHome = reset.parentElement;
  const compact = matchMedia('(max-width: 650px)');
  const placeReset = () => { if (compact.matches) document.querySelector('.motion-toolbar').append(reset);else resetHome.append(reset); };
  compact.addEventListener('change', placeReset);placeReset();
  reset.setAttribute('aria-controls', 'imsDemoRoot');
  reset.addEventListener('click', () => { updateMobile();setStep(0); });
  new MutationObserver(updateMobile).observe(document.getElementById('inventoryBody'), { childList: true });
  const destinationLabel = document.querySelector('#demoDestinationField label');
  function updateDestinationLabel() {
    const receiving = document.getElementById('demoOperation').value === 'receive';
    destinationLabel.textContent = lang === 'ja' ? receiving ? '入庫先' : '移動先' : lang.startsWith('zh') ? receiving ? '入库位置' : '目标位置' : 'Destination';
  }
  document.getElementById('demoOperation').addEventListener('change', updateDestinationLabel);
  reset.addEventListener('click', updateDestinationLabel);updateDestinationLabel();
  const labels = { ja: ['商品', '本社 / A-01', '大阪 / B-02', '合計', '在庫状態', '選択'], en: ['Product', 'Main / A-01', 'Osaka / B-02', 'Total', 'Status', 'Select'], 'zh-CN': ['商品', '总部 / A-01', '大阪 / B-02', '合计', '状态', '选择'] }[lang];
  document.querySelectorAll('.demo-table').forEach(table => table.querySelectorAll('thead th').forEach((th, i) => { th.scope = 'col';if (!th.textContent.trim()) th.textContent = labels[i] || labels.at(-1); }));
  updateMobile();setStep(0);
})();
