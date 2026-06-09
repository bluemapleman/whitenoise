import { trackById } from './library.js';
import { State } from './state.js';
import { AudioEngine } from './audio-engine.js';
import { SleepTimer } from './sleep-timer.js';
import { MediaSessionBinding } from './media-session.js';
import { UI } from './ui.js';
import { AmbientBg } from './ambient-bg.js';
import { TimerProgress } from './timer-progress.js';
import { InfoPanel } from './info-panel.js';
import { Identity } from './identity.js';
import { Sync } from './sync.js';
import { RegisterPrompt } from './register-prompt.js';

const state = new State();
const engine = new AudioEngine();
const identity = new Identity();
const sync = new Sync({ identity, state });
let timerEndsAt = 0;
let activeTrack = null;
let ui;

// If the user already registered a username, pull-and-merge their remote
// state on load. After merge, future state changes write back (debounced).
if (identity.username()) {
  sync.pullAndMerge();
}
state.subscribe(() => sync.scheduleWriteBack());

// Ambient background — visual companion to the audio. Inserted before <main>
// so it sits behind everything (z-index: 0 in styles).
const ambientEl = document.createElement('div');
ambientEl.className = 'ambient-bg';
document.body.insertBefore(ambientEl, document.body.firstChild);
const ambient = new AmbientBg(ambientEl);

// Sleep-timer progress bar — sits above the mini-player.
const progressEl = document.createElement('div');
progressEl.className = 'timer-progress';
document.body.appendChild(progressEl);
const progress = new TimerProgress({
  root: progressEl,
  onSeek: (newRemainingMs) => {
    timer.seekRemaining(newRemainingMs);
    if (newRemainingMs > 0) {
      timerEndsAt = Date.now() + newRemainingMs;
      progress.syncEnd(timerEndsAt);
      // Refresh mini-player so the "ends at" + countdown reflect the new end
      if (activeTrack) ui.showMiniPlayer(activeTrack, timerEndsAt);
    }
    // If newRemainingMs <= 0, seekRemaining already fired onStop → stopPlayback,
    // which hides the bar and the mini-player. Nothing to do here.
  },
});

const timer = new SleepTimer({
  onFadeOut: (ms) => { engine.fadeOut(ms); ambient.fadeOut(ms); },
  onStop: () => stopPlayback(),
});

const media = new MediaSessionBinding({
  onPlay: () => playLast(),
  onPause: () => pausePlayback(),
});

async function startPlayback(trackId) {
  const track = trackById(trackId);
  if (!track) return;
  try {
    await engine.play(track);
  } catch (err) {
    console.error('Audio load failed', err);
    return;
  }
  activeTrack = track;
  const presetMin = state.get().lastTimer;
  timer.start(presetMin);
  timerEndsAt = presetMin === 0 ? Infinity : Date.now() + presetMin * 60_000;
  state.update({ lastTrackId: trackId });
  media.setNowPlaying(track);
  ui.showMiniPlayer(track, timerEndsAt);
  ambient.setTrack(track);
  ambient.setVolume(state.get().volume);
  ambient.setPlaying();
  ambient.show();
  progress.show({
    totalMs: timer.totalMs(),
    endsAt: timerEndsAt,
    paletteColor: track.palette[0],
  });
}

function pausePlayback() {
  engine.pause();
  timer.cancel();
  media.setPaused();
  ui.setMiniPlayerPaused();
  ambient.setPaused();
  progress.hide();
}

function stopPlayback() {
  engine.stop();
  timer.cancel();
  media.clear();
  ui.hideMiniPlayer();
  ambient.clear();
  progress.hide();
  activeTrack = null;
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
  onSetVolume: (v) => { engine.setVolume(v); ambient.setVolume(v); state.update({ volume: v }); },
  onMiniPlayerTimerTap: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
});

// Apply initial volume from saved state
engine.setVolume(state.get().volume);
ambient.setVolume(state.get().volume);

// Debug info panel — toggle in top-right corner
new InfoPanel({ identity });

// Register-username prompt — appears on the second visit if not yet registered
const registerPrompt = new RegisterPrompt({
  identity,
  sync,
  onRegistered: () => sync.pullAndMerge(),
});
if (registerPrompt.shouldShow()) {
  // Defer slightly so the page paints before the modal interrupts
  setTimeout(() => registerPrompt.show(), 1500);
}

// Register service worker for offline use
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
