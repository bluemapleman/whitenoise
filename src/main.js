import { LIBRARY, trackById } from './library.js';
import { State } from './state.js';
import { AudioEngine } from './audio-engine.js';
import { SleepTimer } from './sleep-timer.js';
import { MediaSessionBinding } from './media-session.js';
import { UI } from './ui.js';

const state = new State();
const engine = new AudioEngine();
let timerEndsAt = 0;
let ui;

const timer = new SleepTimer({
  onFadeOut: (ms) => engine.fadeOut(ms),
  onStop: () => stopPlayback(),
});

const media = new MediaSessionBinding({
  onPlay: () => playLast(),
  onPause: () => pausePlayback(),
});

async function startPlayback(trackId) {
  const track = trackById(trackId);
  if (!track) return;
  await engine.play(track);
  const presetMin = state.get().lastTimer;
  timer.start(presetMin);
  timerEndsAt = presetMin === 0 ? Infinity : Date.now() + presetMin * 60_000;
  state.update({ lastTrackId: trackId });
  media.setNowPlaying(track);
  ui.showMiniPlayer(track, timerEndsAt);
}

function pausePlayback() {
  engine.pause();
  timer.cancel();
  media.setPaused();
  ui.setMiniPlayerPaused();
}

function stopPlayback() {
  engine.stop();
  timer.cancel();
  media.clear();
  ui.hideMiniPlayer();
}

function playLast() {
  const id = state.get().lastTrackId;
  if (id) startPlayback(id);
}

ui = new UI({
  root: document.getElementById('app'),
  state,
  onPlay: (id) => startPlayback(id),
  onPause: () => pausePlayback(),
  onSelectTimer: (preset) => state.update({ lastTimer: preset }),
  onToggleFavorite: (id) => state.toggleFavorite(id),
  onSetVolume: (v) => { engine.setVolume(v); state.update({ volume: v }); },
  onMiniPlayerTimerTap: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
});

// Apply initial volume from saved state
engine.setVolume(state.get().volume);

// Register service worker for offline use
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
