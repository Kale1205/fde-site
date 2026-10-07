(() => {
  'use strict';
  if (!document.body.classList.contains('contact-renewal')) return;
  const list = document.getElementById('cmsFaqList');
  if (!list) return;
  const linkAnswers = () => {
    list.querySelectorAll('.faq-item').forEach((item, index) => {
      const button = item.querySelector('.faq-q');
      const answer = item.querySelector('.faq-a');
      if (!button || !answer) return;
      answer.id ||= `contact-faq-answer-${index}`;
      button.setAttribute('aria-controls', answer.id);
    });
  };
  linkAnswers();
  new MutationObserver(linkAnswers).observe(list, {childList: true});

  // Chinese uses the existing translated HTML, not the bilingual CMS feed.
  // Restore its search/disclosure behavior without changing any FAQ copy.
  if (!document.documentElement.lang.startsWith('zh')) return;
  const search = document.getElementById('faqSearch');
  const empty = document.getElementById('faqEmpty');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  search?.addEventListener('input', () => {
    const query = normalize(search.value.trim());
    let count = 0;
    list.querySelectorAll('.faq-item').forEach(item => {
      const match = !query || normalize(item.textContent).includes(query);
      item.hidden = !match;
      if (match) count++;
    });
    if (empty) empty.hidden = count > 0;
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('.faq-q');
    if (!button) return;
    const open = button.closest('.faq-item').classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
})();
