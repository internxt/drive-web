import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFER_COUNTDOWN_DURATION_MS, OFFER_COUNTDOWN_STORAGE_KEY } from '../constants';
import { useOfferCountdown } from './useOfferCountdown';

describe('Offer countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('When the countdown starts, then it shows the full hour left and stores the deadline', () => {
    const { result } = renderHook(() => useOfferCountdown());

    expect(result.current.hours).toBe('01');
    expect(result.current.minutes).toBe('00');
    expect(result.current.seconds).toBe('00');
    expect(result.current.hasExpired).toBe(false);
    expect(globalThis.sessionStorage.getItem(OFFER_COUNTDOWN_STORAGE_KEY)).not.toBeNull();
  });

  it('When time passes, then the remaining time decreases every second', () => {
    const { result } = renderHook(() => useOfferCountdown());

    act(() => {
      vi.advanceTimersByTime(65 * 1000);
    });

    expect(result.current.hours).toBe('00');
    expect(result.current.minutes).toBe('58');
    expect(result.current.seconds).toBe('55');
  });

  it('When a deadline of the same session is still valid, then the countdown resumes instead of restarting', () => {
    const remainingMs = 10 * 60 * 1000;
    globalThis.sessionStorage.setItem(OFFER_COUNTDOWN_STORAGE_KEY, String(Date.now() + remainingMs));

    const { result } = renderHook(() => useOfferCountdown());

    expect(result.current.hours).toBe('00');
    expect(result.current.minutes).toBe('10');
  });

  it('When the stored deadline already expired, then a new countdown window starts', () => {
    globalThis.sessionStorage.setItem(OFFER_COUNTDOWN_STORAGE_KEY, String(Date.now() - 1000));

    const { result } = renderHook(() => useOfferCountdown());

    expect(result.current.hasExpired).toBe(false);
    expect(result.current.hours).toBe('01');
    expect(Number(globalThis.sessionStorage.getItem(OFFER_COUNTDOWN_STORAGE_KEY))).toBeGreaterThan(
      Date.now() + OFFER_COUNTDOWN_DURATION_MS - 1000,
    );
  });

  it('When the countdown runs out, then it stops at zero', () => {
    const { result } = renderHook(() => useOfferCountdown());

    act(() => {
      vi.advanceTimersByTime(OFFER_COUNTDOWN_DURATION_MS + 5000);
    });

    expect(result.current.hours).toBe('00');
    expect(result.current.minutes).toBe('00');
    expect(result.current.seconds).toBe('00');
    expect(result.current.hasExpired).toBe(true);
  });

  it('When reading the stored deadline fails, then a new countdown window starts', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Session storage is not available');
    });

    const { result } = renderHook(() => useOfferCountdown());

    expect(getItem).toHaveBeenCalledWith(OFFER_COUNTDOWN_STORAGE_KEY);
    expect(result.current.hours).toBe('01');
    expect(result.current.hasExpired).toBe(false);
  });

  it('When storing the deadline fails, then the countdown still runs', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Session storage is full');
    });

    const { result } = renderHook(() => useOfferCountdown());

    expect(setItem).toHaveBeenCalled();
    expect(result.current.hours).toBe('01');

    act(() => {
      vi.advanceTimersByTime(5 * 1000);
    });

    expect(result.current.seconds).toBe('55');
  });
});
