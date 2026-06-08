// Static list of all available tracks.
// Gradient is [topLeft, bottomRight] hex colors used by the tile background.
export const LIBRARY = [
  { id: 'rain-light',      label: 'Rain (light)',     gradient: ['#1e3a5f', '#0d1117'], file: 'audio/rain-light.m4a' },
  { id: 'rain-heavy',      label: 'Rain (heavy)',     gradient: ['#1e2a4f', '#0d1117'], file: 'audio/rain-heavy.m4a' },
  { id: 'thunder',         label: 'Thunderstorm',     gradient: ['#2e1a3a', '#0d1117'], file: 'audio/thunder.m4a' },
  { id: 'ocean',           label: 'Ocean waves',      gradient: ['#1a2e3a', '#0d1117'], file: 'audio/ocean.m4a' },
  { id: 'forest',          label: 'Forest',           gradient: ['#1a3a2e', '#0d1117'], file: 'audio/forest.m4a' },
  { id: 'mountain-breeze', label: 'Mountain breeze',  gradient: ['#1a2a3a', '#0d1117'], file: 'audio/mountain-breeze.m4a' },
  { id: 'river',           label: 'River',            gradient: ['#1e3a3a', '#0d1117'], file: 'audio/river.m4a' },
  { id: 'fireplace',       label: 'Fireplace',        gradient: ['#3a2e1a', '#0d1117'], file: 'audio/fireplace.m4a' },
  { id: 'crickets',        label: 'Night crickets',   gradient: ['#2a2a1a', '#0d1117'], file: 'audio/crickets.m4a' },
  { id: 'brown-noise',     label: 'Brown noise',      gradient: ['#3a2a2a', '#0d1117'], file: 'audio/brown-noise.m4a' },
  { id: 'pink-noise',      label: 'Pink noise',       gradient: ['#3a2a3a', '#0d1117'], file: 'audio/pink-noise.m4a' },
  { id: 'white-noise',     label: 'White noise',      gradient: ['#2a2a2a', '#0d1117'], file: 'audio/white-noise.m4a' },
  { id: 'fan',             label: 'Fan / AC hum',     gradient: ['#1a1a1a', '#0d1117'], file: 'audio/fan.m4a' },
];

export function trackById(id) {
  return LIBRARY.find(t => t.id === id) || null;
}
