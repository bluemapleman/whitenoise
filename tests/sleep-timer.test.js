import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleepTimer } from '../src/sleep-timer.js';

describe('SleepTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('schedules fadeOut at (durationMin*60 - 30) seconds and stop at duration', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(45);  // 45 min
    expect(onFadeOut).not.toHaveBeenCalled();

    vi.advanceTimersByTime((45 * 60 - 30) * 1000 - 1);
    expect(onFadeOut).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFadeOut).toHaveBeenCalledWith(30000);
    expect(onStop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30 * 1000);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('cancels both callbacks on cancel()', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(15);
    vi.advanceTimersByTime(5 * 1000);
    t.cancel();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(onFadeOut).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('starting a new timer cancels the previous one', () => {
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut: () => {}, onStop });

    t.start(15);
    vi.advanceTimersByTime(5 * 1000);
    t.start(30);
    vi.advanceTimersByTime(15 * 60 * 1000);  // would have fired old timer
    expect(onStop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15 * 60 * 1000);  // 30 min total elapsed
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('start(0) means infinity — never fires callbacks', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(0);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(onFadeOut).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('remainingMs returns time until stop', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    t.start(45);
    expect(t.remainingMs()).toBe(45 * 60 * 1000);
    vi.advanceTimersByTime(60 * 1000);
    expect(t.remainingMs()).toBe(44 * 60 * 1000);
  });

  it('remainingMs returns 0 when not running', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    expect(t.remainingMs()).toBe(0);
  });

  it('remainingMs returns Infinity for ∞ mode', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    t.start(0);
    expect(t.remainingMs()).toBe(Infinity);
  });
});
