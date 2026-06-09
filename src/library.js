// Static list of all available tracks.
// gradient: [topLeft, bottomRight] hex colors used by the tile background.
// palette: [bloom1, bloom2] hex colors used by the ambient full-screen background.
export const LIBRARY = [
  { id: 'rain-light',      label: 'Rain (light)',     gradient: ['#1e3a5f', '#0d1117'], palette: ['#2a4d6e', '#1a3a4f'], file: 'audio/rain-light.m4a' },
  { id: 'rain-heavy',      label: 'Rain (heavy)',     gradient: ['#1e2a4f', '#0d1117'], palette: ['#1f3a52', '#3a3a5a'], file: 'audio/rain-heavy.m4a' },
  { id: 'thunder',         label: 'Thunderstorm',     gradient: ['#2e1a3a', '#0d1117'], palette: ['#2e2a4a', '#1a1a2e'], file: 'audio/thunder.m4a' },
  { id: 'ocean',           label: 'Ocean waves',      gradient: ['#1a2e3a', '#0d1117'], palette: ['#1a4a5e', '#0a2e3a'], file: 'audio/ocean.m4a' },
  { id: 'forest',          label: 'Forest',           gradient: ['#1a3a2e', '#0d1117'], palette: ['#1f4a35', '#3a4a1a'], file: 'audio/forest.m4a' },
  { id: 'mountain-breeze', label: 'Mountain breeze',  gradient: ['#1a2a3a', '#0d1117'], palette: ['#2a3a4f', '#3a3f4a'], file: 'audio/mountain-breeze.m4a' },
  { id: 'river',           label: 'River',            gradient: ['#1e3a3a', '#0d1117'], palette: ['#1f4a4a', '#1a3a3a'], file: 'audio/river.m4a' },
  { id: 'fireplace',       label: 'Fireplace',        gradient: ['#3a2e1a', '#0d1117'], palette: ['#5a2e1a', '#3a1a0d'], file: 'audio/fireplace.m4a' },
  { id: 'crickets',        label: 'Night crickets',   gradient: ['#2a2a1a', '#0d1117'], palette: ['#2a3a1a', '#3a3a2a'], file: 'audio/crickets.m4a' },
  { id: 'brown-noise',     label: 'Brown noise',      gradient: ['#3a2a2a', '#0d1117'], palette: ['#2a1a1a', '#1a1a1a'], file: 'audio/brown-noise.m4a' },
  { id: 'pink-noise',      label: 'Pink noise',       gradient: ['#3a2a3a', '#0d1117'], palette: ['#3a2a3a', '#2a1a2a'], file: 'audio/pink-noise.m4a' },
  { id: 'white-noise',     label: 'White noise',      gradient: ['#2a2a2a', '#0d1117'], palette: ['#2a2a3a', '#1a1a2a'], file: 'audio/white-noise.m4a' },
  { id: 'fan',             label: 'Fan / AC hum',     gradient: ['#1a1a1a', '#0d1117'], palette: ['#2a2a2a', '#1a1a1a'], file: 'audio/fan.m4a' },
];

export function trackById(id) {
  return LIBRARY.find(t => t.id === id) || null;
}
