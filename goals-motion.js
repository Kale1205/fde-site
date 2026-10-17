/* W04 continuous motion. Original media only; no navigation, storage or telemetry. */
(() => {
  'use strict';
  for (const root of document.querySelectorAll('[data-goals-motion]')) {
    const video = root.querySelector('[data-motion-video]');
    const feed = root.querySelector('[data-code-feed]');
    const lines = root.querySelector('[data-code-source]').textContent.trimEnd().split('\n');
    const button = root.querySelector('[data-motion-toggle]');
    const status = root.querySelector('[data-motion-status]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = typeof navigator === 'undefined' ? null : navigator.connection;
    // The second decoder resets only while invisible, never the visible screen.
    const stage = document.createElement('div');
    stage.className = 'mission-video-loop';
    video.before(stage);
    stage.append(video);
    const standby = video.cloneNode(true);
    standby.removeAttribute('data-motion-video');
    standby.removeAttribute('aria-label');
    standby.setAttribute('aria-hidden', 'true');
    standby.setAttribute('tabindex', '-1');
    stage.append(standby);
    const videos = [video, standby];
    let wanted = !reduced.matches;
    let manuallyPaused = false;
    let suspended = false;
    let visible = false;
    let frame = null;
    let previousTime = null;
    let codePosition = 0;
    let active = 0;
    let handoff = null;
    let epoch = 0;
    let prepared = false;
    let lineHeight = 24;
    let rows = 18;
    let previousText = '';
    const failed = new Set();

    function running() { return wanted && !suspended && !connection?.saveData && visible && !document.hidden; }
    function measureCode() {
      const style = getComputedStyle(feed.parentElement);
      lineHeight = parseFloat(style.lineHeight) || 24;
      const available = feed.parentElement.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
      rows = Math.max(7, Math.floor(available / lineHeight) - 1);
      renderCode();
    }
    function renderCode() {
      const step = Math.floor(codePosition);
      const fraction = codePosition - step;
      const text = Array.from({length: rows}, (_, i) => lines[(step + i) % lines.length]);
      const typing = lines[(step + rows) % lines.length];
      text.push(typing.slice(0, Math.floor(fraction * typing.length)));
      const next = text.join('\n');
      if (next !== previousText) { feed.textContent = next; previousText = next; }
      // Dropping the offscreen row and offset together preserves pixel continuity.
      feed.style.transform = 'translate3d(0, ' + (-fraction * lineHeight) + 'px, 0)';
    }
    function stopFrame() {
      cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    }
    function paintButton() {
      const enabled = wanted && !suspended && !connection?.saveData;
      button.textContent = enabled ? button.dataset.pauseLabel : button.dataset.playLabel;
      button.setAttribute('aria-pressed', String(enabled));
      root.dataset.motion = enabled ? 'playing' : 'paused';
    }
    function cancelHandoff() {
      if (!handoff) return;
      const incoming = videos[handoff.incoming];
      incoming.pause();
      incoming.style.opacity = '0';
      handoff = null;
    }
    function play(index, ready, critical = false) {
      const token = epoch;
      const media = videos[index];
      const valid = () => token === epoch && running();
      const rejected = () => {
        if (!valid()) return; // Ignore a stale play rejected by pause/scroll.
        if (critical) {
          // Respect autoplay / power-saving refusal without an automatic retry loop.
          // A later visible-page return may try once; an explicit pause stays paused.
          suspended = true;
          sync();
        } else {
          cancelHandoff();
          // Native loop is retained as a low-resource fallback, with no blank layer.
          failed.add(index);
        }
      };
      const started = () => {
        if (!valid() || !ready) return;
        if (media.requestVideoFrameCallback) {
          media.requestVideoFrameCallback(() => { if (valid()) ready(); });
        } else if (media.readyState >= 2) ready();
      };
      const result = media.play();
      if (result?.then) result.then(started, rejected);
      else started();
    }
    function beginHandoff() {
      const incoming = 1 - active;
      if (failed.has(incoming) || videos[incoming].readyState < 2) return;
      const transition = {incoming, elapsed: 0, decoded: false};
      handoff = transition;
      videos[incoming].style.zIndex = '1';
      videos[active].style.zIndex = '0';
      play(incoming, () => { if (handoff === transition) transition.decoded = true; });
    }
    function tick(now) {
      frame = null;
      if (!running()) return;
      const delta = previousTime === null ? 0 : Math.min(64, Math.max(0, now - previousTime));
      previousTime = now;
      codePosition = (codePosition + delta / 1500) % lines.length;
      renderCode();
      const current = videos[active];
      if (!handoff && Number.isFinite(current.duration) && current.duration > 3 && current.duration - current.currentTime <= 1.5) beginHandoff();
      if (handoff?.decoded) {
        handoff.elapsed += delta;
        videos[handoff.incoming].style.opacity = String(Math.min(1, handoff.elapsed / 900));
        if (handoff.elapsed >= 900) {
          const outgoing = current;
          active = handoff.incoming;
          handoff = null;
          outgoing.style.opacity = '0';
          outgoing.pause();
          outgoing.currentTime = 0; // Seek behind the fully decoded incoming layer.
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      epoch++;
      stopFrame();
      paintButton();
      if (!running()) {
        videos.forEach(media => media.pause());
        if (handoff && !handoff.decoded) cancelHandoff();
        return;
      }
      if (!prepared) {
        prepared = true;
        standby.preload = 'auto';
        standby.load();
      }
      if (!failed.has(active)) play(active, null, true);
      if (handoff?.decoded) play(handoff.incoming, null);
      frame = requestAnimationFrame(tick);
    }
    videos.forEach((media, index) => {
      media.muted = true;
      media.defaultMuted = true;
      media.controls = false;
      media.style.opacity = index === 0 ? '1' : '0';
      const error = () => {
        failed.add(index);
        media.pause();
        if (index === active) status.hidden = false;
        else cancelHandoff();
      };
      media.addEventListener('error', error);
      media.querySelector('source')?.addEventListener('error', error);
      media.addEventListener('pause', () => {
        // Native media policies can pause a muted video after play() succeeds.
        // Our own pauses happen after running() is false or on the spare decoder.
        if (index === active && running() && media.paused) {
          suspended = true;
          sync();
        }
      });
    });
    measureCode();
    button.hidden = false;
    button.addEventListener('click', () => {
      wanted = suspended ? true : !wanted;
      manuallyPaused = !wanted;
      suspended = false;
      sync();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) suspended = false;
      sync();
    });
    window.addEventListener('resize', measureCode);
    reduced.addEventListener('change', () => { wanted = !reduced.matches && !manuallyPaused; suspended = false; sync(); });
    connection?.addEventListener?.('change', () => { suspended = false; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        const nextVisible = entries[0].isIntersecting;
        if (nextVisible && !visible) suspended = false;
        visible = nextVisible;
        sync();
      }, {threshold: 0}).observe(root.querySelector('.mission-desk'));
    } else { visible = true; sync(); }
    paintButton();
  }
})();
