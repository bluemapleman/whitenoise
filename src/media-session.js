// Wires up navigator.mediaSession for OS lock-screen controls.
// Safe no-op if the browser doesn't support it.

export class MediaSessionBinding {
  constructor({ onPlay, onPause }) {
    this._onPlay = onPlay;
    this._onPause = onPause;
    this._supported = 'mediaSession' in navigator;
    if (!this._supported) return;

    navigator.mediaSession.setActionHandler('play', () => this._onPlay());
    navigator.mediaSession.setActionHandler('pause', () => this._onPause());
  }

  setNowPlaying(track) {
    if (!this._supported) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.label,
      artist: 'Tonight',
      album: 'Sleep sounds',
    });
    navigator.mediaSession.playbackState = 'playing';
  }

  setPaused() {
    if (!this._supported) return;
    navigator.mediaSession.playbackState = 'paused';
  }

  clear() {
    if (!this._supported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}
