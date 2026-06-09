// Combined Register / Login modal.
// - Defaults to "Create account" (the most common case for a new visitor).
// - "Have an account? Sign in" link toggles to login mode.
// - Used on second visit (auto-prompt), on session expiry (re-auth), or via
//   an explicit show() call.

const DISMISS_KEY = 'whitenoise.register.dismissed';
const PASSWORD_MIN = 8;

export class RegisterPrompt {
  constructor({ identity, sync, onSignedIn }) {
    this._identity = identity;
    this._sync = sync;
    this._onSignedIn = onSignedIn || (() => {});
    this._mode = 'register';   // or 'login'
  }

  // True if we should auto-show on this visit.
  shouldShow() {
    if (this._identity.hasValidSession()) return false;
    if (this._identity.username()) return true;       // session expired → re-auth
    if (this._identity.visitCount() < 2) return false;
    if (localStorage.getItem(DISMISS_KEY) === '1') return false;
    return true;
  }

  // Called when fetch returns 401: force a login modal regardless of dismiss.
  showForReauth() {
    this._mode = 'login';
    this.show({ initialUsername: this._identity.username() || '', dismissable: false });
  }

  show({ initialUsername = '', dismissable = true } = {}) {
    // Default mode based on context: if we have a stored username (session
    // expired), open in Login mode. Otherwise Register.
    if (!this._mode) this._mode = this._identity.username() ? 'login' : 'register';

    const wrap = document.createElement('div');
    wrap.className = 'register-overlay';
    wrap.innerHTML = `
      <div class="register-card" role="dialog" aria-modal="true" aria-labelledby="register-title">
        <h2 id="register-title" data-role="title"></h2>
        <p data-role="subtitle"></p>
        <input type="text" data-role="username" autocomplete="username" autocapitalize="none" spellcheck="false"
               placeholder="username (3-30, lowercase a-z, 0-9, _ or -)" maxlength="30">
        <input type="password" data-role="password" autocomplete="current-password"
               placeholder="password (8+ chars)">
        <div class="register-error" data-role="error" hidden></div>
        <div class="register-actions">
          ${dismissable ? '<button class="register-skip" data-role="skip" type="button">Not now</button>' : ''}
          <button class="register-submit" data-role="submit" type="button"></button>
        </div>
        <div class="register-toggle">
          <a href="#" data-role="toggle"></a>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const els = {
      title:    wrap.querySelector('[data-role="title"]'),
      subtitle: wrap.querySelector('[data-role="subtitle"]'),
      username: wrap.querySelector('[data-role="username"]'),
      password: wrap.querySelector('[data-role="password"]'),
      error:    wrap.querySelector('[data-role="error"]'),
      submit:   wrap.querySelector('[data-role="submit"]'),
      skip:     wrap.querySelector('[data-role="skip"]'),
      toggle:   wrap.querySelector('[data-role="toggle"]'),
    };

    if (initialUsername) els.username.value = initialUsername;

    const renderMode = () => {
      if (this._mode === 'register') {
        els.title.textContent = 'Create your account';
        els.subtitle.textContent = 'Pick a username and password to keep your favorites and timer in sync across devices.';
        els.submit.textContent = 'Create account';
        els.password.autocomplete = 'new-password';
        els.toggle.textContent = 'Have an account? Sign in';
      } else {
        els.title.textContent = 'Sign in';
        els.subtitle.textContent = 'Welcome back. Enter your account to load your sounds and preferences.';
        els.submit.textContent = 'Sign in';
        els.password.autocomplete = 'current-password';
        els.toggle.textContent = 'No account? Create one';
      }
      els.error.hidden = true;
    };
    renderMode();

    requestAnimationFrame(() => {
      wrap.classList.add('register-overlay-open');
      (initialUsername ? els.password : els.username).focus();
    });

    const close = () => {
      wrap.classList.remove('register-overlay-open');
      setTimeout(() => wrap.remove(), 250);
    };

    if (els.skip) {
      els.skip.addEventListener('click', () => {
        localStorage.setItem(DISMISS_KEY, '1');
        close();
      });
    }

    els.toggle.addEventListener('click', (e) => {
      e.preventDefault();
      this._mode = this._mode === 'register' ? 'login' : 'register';
      renderMode();
    });

    const showError = (msg) => {
      els.error.textContent = msg;
      els.error.hidden = false;
    };

    const submit = async () => {
      const username = els.username.value.trim().toLowerCase();
      const password = els.password.value;
      els.error.hidden = true;
      els.submit.disabled = true;
      const originalLabel = els.submit.textContent;
      els.submit.textContent = '...';

      try {
        if (!this._sync.validUsername(username)) {
          showError('Use 3–30 lowercase letters, digits, _ or -');
          return;
        }
        if (!this._sync.validPassword(password)) {
          showError(`Password must be at least ${PASSWORD_MIN} characters`);
          return;
        }

        if (this._mode === 'register') {
          await this._sync.register({ username, password });
        } else {
          await this._sync.login({ username, password });
        }
        this._onSignedIn(username);
        close();
      } catch (err) {
        if (err.code === 'TAKEN')        showError('Username taken — pick another, or sign in instead.');
        else if (err.code === 'BAD_AUTH') showError('Wrong username or password.');
        else if (err.code === 'INVALID')  showError('Check the format of username/password.');
        else                              showError('Could not connect. Try again.');
      } finally {
        els.submit.disabled = false;
        els.submit.textContent = originalLabel;
      }
    };

    els.submit.addEventListener('click', submit);
    [els.username, els.password].forEach(el => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    });
  }
}
