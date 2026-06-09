// Modal that appears on the visitor's second visit, offering optional
// cross-device sync via a username. No password — see backend doc for the
// "low risk + deviceId-bound" trade-offs.
//
// Dismissable. Once dismissed, never shown again unless localStorage is cleared.

const DISMISS_KEY = 'whitenoise.register.dismissed';

export class RegisterPrompt {
  constructor({ identity, sync, onRegistered }) {
    this._identity = identity;
    this._sync = sync;
    this._onRegistered = onRegistered;
  }

  shouldShow() {
    if (this._identity.username()) return false;        // already registered
    if (this._identity.visitCount() < 2) return false;  // first visit — defer
    if (localStorage.getItem(DISMISS_KEY) === '1') return false;
    return true;
  }

  show() {
    const wrap = document.createElement('div');
    wrap.className = 'register-overlay';
    wrap.innerHTML = `
      <div class="register-card" role="dialog" aria-modal="true" aria-labelledby="register-title">
        <h2 id="register-title">Sync across devices</h2>
        <p>Pick a username to keep your favorites and timer preference in sync across browsers and devices. No password — anyone with your username on this device can use it.</p>
        <input type="text" data-role="register-input" autocomplete="off" autocapitalize="none" spellcheck="false"
               placeholder="3-30 chars, lowercase letters, digits, _ or -" maxlength="30">
        <div class="register-error" data-role="register-error" hidden></div>
        <div class="register-actions">
          <button class="register-skip" data-role="register-skip" type="button">Not now</button>
          <button class="register-submit" data-role="register-submit" type="button">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const input = wrap.querySelector('[data-role="register-input"]');
    const errorEl = wrap.querySelector('[data-role="register-error"]');
    const submitBtn = wrap.querySelector('[data-role="register-submit"]');
    const skipBtn = wrap.querySelector('[data-role="register-skip"]');

    requestAnimationFrame(() => {
      wrap.classList.add('register-overlay-open');
      input.focus();
    });

    const close = () => {
      wrap.classList.remove('register-overlay-open');
      setTimeout(() => wrap.remove(), 250);
    };

    skipBtn.addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, '1');
      close();
    });

    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    };

    const submit = async () => {
      const username = input.value.trim().toLowerCase();
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      try {
        if (!this._sync.validUsername(username)) {
          showError('Use 3–30 lowercase letters, digits, _ or -');
          return;
        }
        await this._sync.register(username);
        this._identity.setUsername(username);
        if (this._onRegistered) this._onRegistered(username);
        close();
      } catch (err) {
        if (err.code === 'TAKEN') {
          showError('That username is taken — pick another.');
        } else {
          showError('Could not save right now. Try again.');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';
      }
    };

    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
  }
}
