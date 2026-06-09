// Two static cat sprites in the bottom corners. They breathe gently and
// blink occasionally — meant as a calm visual companion, not animated chase.
// Hidden until playback starts, fades in when audio plays, fades out on stop.

export class CatCompanions {
  constructor() {
    const wrap = document.createElement('div');
    wrap.className = 'cat-companions';
    wrap.innerHTML = `
      <img class="cat cat-tux"   data-role="cat-tux"   src="assets/cat-tux.png"   alt="" aria-hidden="true">
      <img class="cat cat-tabby" data-role="cat-tabby" src="assets/cat-tabby.png" alt="" aria-hidden="true">
    `;
    document.body.appendChild(wrap);
    this._wrap = wrap;
  }

  show() { this._wrap.classList.add('cats-visible'); }
  hide() { this._wrap.classList.remove('cats-visible'); }
}
