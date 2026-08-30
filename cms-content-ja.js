(() => {
  let CMS = null;
  let stripItems = [];
  let stripIndex = 0;
  let stripTimer = null;
  let lastNewsTrigger = null;
  let reloadTimers = [];

  const CMS_URL = '../content/site-content.json';

  const pick = value => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value.ja || value.en || Object.values(value)[0] || '';
  };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);

  const attr = value => esc(value).replace(/`/g, '&#96;');
  const dateLabel = value => String(value || '').replaceAll('-', '.');

  function newsSorted() {
    return [...(CMS?.news || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function stripSelection(all = newsSorted()) {
    const preferred = ['Product', 'Development', 'Social'];
    const selected = preferred
      .map(category => all.find(item => String(item.category || '').toLowerCase() === category.toLowerCase()))
      .filter(Boolean);
    const extras = all.filter(item => !selected.some(selectedItem => selectedItem.id === item.id));
    return [...selected, ...extras].slice(0, 5);
  }

  function assetPath(value, fallback) {
    const source = String(value || '').trim();
    if (!source) return fallback;
    if (/^(?:https?:)?\/\//.test(source) || source.startsWith('data:') || source.startsWith('/')) return source;
    return `../${source.replace(/^\.?\//, '')}`;
  }

  function newsImage(item, className) {
    if (item?.image) {
      return `<div class="${className}"><img src="${attr(assetPath(item.image, ''))}" alt="${attr(pick(item.title))}" loading="lazy"></div>`;
    }
    const fallback = assetPath(CMS?.newsFallbackImage, '../assets/news-fallback-user.svg');
    return `<div class="${className} cms-image-fallback"><img src="${attr(fallback)}" alt="Baked Kale News" loading="lazy"></div>`;
  }

  function setStripItem(index, animate = true) {
    const strip = document.querySelector('.news-strip');
    if (!strip || !stripItems.length) return;
    stripIndex = (index + stripItems.length) % stripItems.length;
    const item = stripItems[stripIndex];
    const label = strip.querySelector('b');
    const spans = strip.querySelectorAll('span');
    const apply = () => {
      if (label) label.textContent = item.category || 'Latest';
      if (spans[0]) spans[0].textContent = pick(item.title);
      strip.classList.remove('is-switching');
    };
    if (animate) {
      strip.classList.add('is-switching');
      window.setTimeout(apply, 180);
    } else {
      apply();
    }
  }

  function startStripAuto() {
    window.clearInterval(stripTimer);
    stripTimer = null;
    if (stripItems.length > 1) {
      stripTimer = window.setInterval(() => setStripItem(stripIndex + 1, true), 5000);
    }
  }

  function renderStrip() {
    const strip = document.querySelector('.news-strip');
    if (!strip || !CMS) return;
    stripItems = stripSelection();
    if (!stripItems.length) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    const link = strip.querySelector('a');
    if (link) link.href = 'news.html';
    stripIndex = Math.min(stripIndex, stripItems.length - 1);
    setStripItem(stripIndex, false);
    startStripAuto();
  }

  function ensureArticleModal() {
    let modal = document.getElementById('newsArticleModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'newsArticleModal';
    modal.className = 'news-article-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'newsArticleTitle');
    modal.innerHTML = '<div class="news-article-backdrop" data-news-close></div><article class="news-article-panel"><button class="news-article-close" type="button" aria-label="記事を閉じる" data-news-close>×</button><div id="newsArticleContent"></div></article>';
    document.body.appendChild(modal);
    return modal;
  }

  function openArticle(id, trigger) {
    const item = (CMS?.news || []).find(candidate => candidate.id === id);
    if (!item) return;
    const modal = ensureArticleModal();
    const content = modal.querySelector('#newsArticleContent');
    lastNewsTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
    content.innerHTML = `<div class="news-article-meta">${esc(dateLabel(item.date))} / ${esc(item.category || 'Update')}</div><h2 id="newsArticleTitle">${esc(pick(item.title))}</h2>${newsImage(item, 'news-article-image')}<div class="news-article-body">${esc(pick(item.body)).replace(/\n/g, '<br>')}</div>`;
    modal.hidden = false;
    document.body.classList.add('news-modal-open');
    modal.querySelector('.news-article-close')?.focus();
  }

  function closeArticle() {
    const modal = document.getElementById('newsArticleModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('news-modal-open');
    const trigger = lastNewsTrigger;
    lastNewsTrigger = null;
    if (trigger instanceof HTMLElement && trigger.isConnected) {
      window.setTimeout(() => trigger.focus(), 0);
    }
  }

  function renderLatest(items) {
    const latest = document.getElementById('cmsLatestList');
    if (!latest) return;
    if (!items.length) {
      latest.innerHTML = '<p class="news-empty">追加のお知らせはまだありません。</p>';
      return;
    }
    latest.innerHTML = items.map(item => `<button class="latest-card news-open" type="button" data-news-id="${attr(item.id)}">${newsImage(item, 'cms-latest-image')}<div class="latest-card-copy"><small>${esc(item.category || 'Update')} / ${esc(dateLabel(item.date))}</small><strong>${esc(pick(item.title))}</strong><span>記事を読む →</span></div></button>`).join('');
  }

  function renderArchive(items) {
    const wire = document.getElementById('cmsNewsWire');
    if (!wire) return;
    if (!items.length) {
      wire.innerHTML = '<p class="news-empty">アーカイブはまだありません。</p>';
      return;
    }
    wire.innerHTML = items.map(item => `<button class="wire-row news-open" type="button" data-news-id="${attr(item.id)}"><div class="wire-type">${esc(item.category || 'Update')}</div><div class="wire-title">${esc(pick(item.title))}</div><time datetime="${attr(item.date)}">${esc(dateLabel(item.date))}</time></button>`).join('');
  }

  function renderInstagram() {
    if (!CMS) return;
    const data = CMS.instagram || {};
    const box = document.getElementById('cmsInstagram');
    if (!box) return;
    box.href = data.profileUrl || '#';
    box.target = '_blank';
    box.rel = 'noopener';
    const image = assetPath(data.image, '');
    const media = image
      ? `<div class="instagram-photo"><img src="${attr(image)}" alt="${attr(data.handle || 'Instagram')}"></div>`
      : '<div class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg></div>';
    box.innerHTML = `${media}<div class="instagram-copy"><small>Instagram / Creative</small><h2>${esc(data.handle || 'Instagram')}</h2><p>${esc(pick(data.description))}</p></div><div class="instagram-cta">Instagramを見る ↗</div>`;
  }

  function renderNews() {
    if (!CMS || !document.body.classList.contains('cms-news-page')) return;
    const all = newsSorted();
    if (!all.length) return;
    const featured = all.find(item => item.featured) || all[0];
    const remaining = all.filter(item => item.id !== featured.id);
    const latestItems = remaining.slice(0, 1);
    const archiveItems = remaining.slice(1);
    const lead = document.getElementById('cmsNewsLead');
    if (lead) {
      lead.href = '#';
      lead.dataset.newsId = featured.id;
      lead.classList.add('news-open');
      lead.innerHTML = `${newsImage(featured, 'cms-lead-image')}<div class="news-lead-copy"><div class="news-label">Top News / ${esc(featured.category || 'Update')}</div><h2>${esc(pick(featured.title))}</h2><p>${esc(pick(featured.body))}</p><div class="news-meta">${esc(dateLabel(featured.date))}</div><span class="news-read-more">記事を読む →</span></div>`;
    }
    renderLatest(latestItems);
    renderArchive(archiveItems);
    renderInstagram();
  }

  async function load() {
    try {
      const response = await fetch(`${CMS_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status);
      CMS = await response.json();
      renderStrip();
      renderNews();
      renderInstagram();
    } catch (error) {
      console.warn('Japanese CMS content load failed', error);
    }
  }

  function scheduleReloads() {
    reloadTimers.forEach(window.clearTimeout);
    reloadTimers = [0, 2500, 7000, 15000, 30000].map(delay => window.setTimeout(load, delay));
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('fde-cms-updates');
      channel.addEventListener('message', event => {
        if (event.data?.type === 'news-updated') scheduleReloads();
      });
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load();
  });

  window.addEventListener('pageshow', load);

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-news-id]');
    if (trigger && document.body.classList.contains('cms-news-page')) {
      event.preventDefault();
      openArticle(trigger.dataset.newsId, trigger);
      return;
    }
    if (event.target.closest('[data-news-close]')) closeArticle();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeArticle();
  });
})();
