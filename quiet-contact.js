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

  // Shared three-language search/disclosure behavior lives in faq-cms.js.
})();
