// Debug info panel. Hidden by default; click the (i) icon in the corner to
// open. Shows the visitor's cookies and localStorage so you can verify what
// the app is actually persisting.
//
// Re-reads on every open so updates are reflected without refresh.

export class InfoPanel {
  constructor() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button class="info-toggle" data-role="info-toggle" aria-label="Debug info" type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
      <aside class="info-panel" data-role="info-panel" hidden>
        <div class="info-panel-hdr">
          <span>Debug info</span>
          <button class="info-close" data-role="info-close" aria-label="Close" type="button">×</button>
        </div>
        <section class="info-panel-section">
          <h3>Cookies (this origin)</h3>
          <pre data-role="info-cookies"></pre>
        </section>
        <section class="info-panel-section">
          <h3>localStorage</h3>
          <pre data-role="info-storage"></pre>
        </section>
        <section class="info-panel-section info-panel-meta">
          <h3>Misc</h3>
          <pre data-role="info-misc"></pre>
        </section>
      </aside>
    `;
    document.body.appendChild(wrap);

    this._toggleBtn = wrap.querySelector('[data-role="info-toggle"]');
    this._panel = wrap.querySelector('[data-role="info-panel"]');
    this._closeBtn = wrap.querySelector('[data-role="info-close"]');
    this._cookieEl = wrap.querySelector('[data-role="info-cookies"]');
    this._storageEl = wrap.querySelector('[data-role="info-storage"]');
    this._miscEl = wrap.querySelector('[data-role="info-misc"]');

    this._toggleBtn.addEventListener('click', () => this._open());
    this._closeBtn.addEventListener('click', () => this._close());
    // Tap outside the panel to close
    document.addEventListener('click', (e) => {
      if (this._panel.hidden) return;
      if (this._panel.contains(e.target)) return;
      if (this._toggleBtn.contains(e.target)) return;
      this._close();
    });
  }

  _open() {
    this._refresh();
    this._panel.hidden = false;
    requestAnimationFrame(() => this._panel.classList.add('info-panel-open'));
  }

  _close() {
    this._panel.classList.remove('info-panel-open');
    setTimeout(() => { this._panel.hidden = true; }, 250);   // match CSS transition
  }

  _refresh() {
    // Cookies — string of "k=v; k=v" or empty
    const raw = document.cookie || '';
    this._cookieEl.textContent = raw.trim() ? raw : '(none — this app sets no cookies)';

    // localStorage — every key/value, JSON-pretty if it parses
    const lines = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      let pretty = v;
      try {
        const parsed = JSON.parse(v);
        if (typeof parsed === 'object' && parsed !== null) {
          pretty = JSON.stringify(parsed, null, 2);
        }
      } catch {}
      lines.push(`${k} =\n${pretty}`);
    }
    this._storageEl.textContent = lines.length ? lines.join('\n\n') : '(empty)';

    // Misc — useful debug fields
    const misc = {
      origin: location.origin,
      userAgent: navigator.userAgent,
      pwaInstalled:
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true,
      onLine: navigator.onLine,
      serviceWorker: navigator.serviceWorker?.controller?.scriptURL || '(no SW controller)',
    };
    this._miscEl.textContent = JSON.stringify(misc, null, 2);
  }
}
