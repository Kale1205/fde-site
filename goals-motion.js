/* W04 motion enhancement. No requests, navigation, storage, or live announcements. */
(() => {
  'use strict';
  for (const root of document.querySelectorAll('[data-goals-motion]')) {
    const video = root.querySelector('[data-motion-video]');
    const feed = root.querySelector('[data-code-feed]');
    const source = root.querySelector('[data-code-source]').textContent;
    const button = root.querySelector('[data-motion-toggle]');
    const status = root.querySelector('[data-motion-status]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let wanted = !reduced.matches;
    let visible = false;
    let timer = null;
    let buffer = source.split('\n').slice(0, 15).join('\n') + '\n';
    let offset = buffer.length;
    let failed = false;
    // Static initial content keeps the panel meaningful without motion.
    feed.textContent = buffer;
    video.muted = true;
    video.defaultMuted = true;
    video.controls = false;
    button.hidden = false;

    function stopTyping() {
      clearTimeout(timer);
      timer = null;
    }
    function tick() {
      buffer += source.slice(offset, offset + 2);
      offset += 2;
      if (offset >= source.length) { offset = 0; buffer += '\n'; }
      // Bounded history: no growing DOM, no page/layout scrolling.
      const lines = buffer.split('\n');
      if (lines.length > 19) buffer = lines.slice(-19).join('\n');
      feed.textContent = buffer;
      feed.parentElement.scrollTop = feed.parentElement.scrollHeight;
      timer = setTimeout(tick, 28);
    }
    function paintButton() {
      button.textContent = wanted ? button.dataset.pauseLabel : button.dataset.playLabel;
      button.setAttribute('aria-pressed', String(wanted));
      root.dataset.motion = wanted ? 'playing' : 'paused';
    }
    function sync() {
      paintButton();
      stopTyping();
      if (!wanted || !visible || document.hidden) {
        video.pause();
        return;
      }
      tick();
      if (!failed) {
        const play = video.play();
        if (play?.catch) play.catch(() => {
          // Permission/low-power policies must not leave a dead autoplay panel.
          if (wanted && visible && !document.hidden) {
            wanted = false;
            stopTyping();
            paintButton();
          }
        });
      }
    }
    button.addEventListener('click', () => { wanted = !wanted; sync(); });
    function mediaError() {
      failed = true;
      status.hidden = false;
      video.pause();
    }
    video.addEventListener('error', mediaError);
    video.querySelector('source')?.addEventListener('error', mediaError);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', () => { wanted = !reduced.matches; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }, {threshold: 0}).observe(root.querySelector('.mission-desk'));
    } else { visible = true; sync(); }
    paintButton();
  }
})();
