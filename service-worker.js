const CACHE = 'whitenoise-v2';

const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/src/main.js',
  '/src/library.js',
  '/src/state.js',
  '/src/audio-engine.js',
  '/src/sleep-timer.js',
  '/src/media-session.js',
  '/src/ui.js',
  '/src/ambient-bg.js',
  '/src/timer-progress.js',
  '/src/info-panel.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const TRACK_IDS = [
  'rain-light', 'rain-heavy', 'thunder', 'ocean', 'forest', 'mountain-breeze',
  'river', 'fireplace', 'crickets', 'brown-noise', 'pink-noise', 'white-noise', 'fan',
];
const AUDIO = TRACK_IDS.map(id => `/audio/${id}.m4a`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Audio is cached lazily on first fetch — large files block install otherwise.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && (AUDIO.includes(new URL(req.url).pathname) || SHELL.includes(new URL(req.url).pathname))) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // Offline + uncached — let the browser show its error
      throw e;
    }
  })());
});
