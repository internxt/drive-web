import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStallWatchdog, StallWatchdog } from './stallWatchdog';

const IDLE_TIMEOUT_MS = 1000;

enum WatchdogState {
  Running = 'running',
  Stalled = 'stalled',
  Cancelled = 'cancelled',
}

const stateOf = (watchdog: StallWatchdog): WatchdogState => {
  if (!watchdog.signal.aborted) return WatchdogState.Running;
  return watchdog.hasStalled() ? WatchdogState.Stalled : WatchdogState.Cancelled;
};

const createWatchdogWithUserSignal = () => {
  const userAbortController = new AbortController();
  const watchdog = createStallWatchdog(IDLE_TIMEOUT_MS, userAbortController.signal);
  return { watchdog, userAbortController };
};

describe('createStallWatchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('when restart is not called within the idle window, then it aborts as stalled', () => {
    const watchdog = createStallWatchdog(IDLE_TIMEOUT_MS);

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

    expect(stateOf(watchdog)).toBe(WatchdogState.Stalled);
  });

  test('when restart keeps being called within the window, then it keeps running', () => {
    const watchdog = createStallWatchdog(IDLE_TIMEOUT_MS);

    for (let tick = 0; tick < 5; tick++) {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 100);
      watchdog.restart();
    }

    expect(stateOf(watchdog)).toBe(WatchdogState.Running);
  });

  test('when the user signal aborts, then it aborts as cancelled', () => {
    const { watchdog, userAbortController } = createWatchdogWithUserSignal();

    userAbortController.abort();

    expect(stateOf(watchdog)).toBe(WatchdogState.Cancelled);
  });

  test('when the user signal is already aborted, then it starts cancelled', () => {
    const userAbortController = new AbortController();
    userAbortController.abort();

    const watchdog = createStallWatchdog(IDLE_TIMEOUT_MS, userAbortController.signal);

    expect(stateOf(watchdog)).toBe(WatchdogState.Cancelled);
  });

  test('when stopped, then no timer is left and a later user abort is ignored', () => {
    const { watchdog, userAbortController } = createWatchdogWithUserSignal();

    watchdog.stop();
    vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
    userAbortController.abort();

    expect(vi.getTimerCount()).toBe(0);
    expect(stateOf(watchdog)).toBe(WatchdogState.Running);
  });
});
