import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import useWarnBeforeUnload from './useWarnBeforeUnload';

describe('useWarnBeforeUnload', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  test('When isActive is true, then a beforeunload listener is registered', () => {
    renderHook(() => useWarnBeforeUnload(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  test('When isActive is false, then no beforeunload listener is registered', () => {
    renderHook(() => useWarnBeforeUnload(false));

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  test('When the component unmounts while active, then the listener is removed', () => {
    const { unmount } = renderHook(() => useWarnBeforeUnload(true));
    const registeredHandler = addEventListenerSpy.mock.calls[0][1];

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', registeredHandler);
  });

  test('When isActive changes from true to false, then the previous listener is removed and no new one is added', () => {
    const { rerender } = renderHook(({ isActive }) => useWarnBeforeUnload(isActive), {
      initialProps: { isActive: true },
    });
    const registeredHandler = addEventListenerSpy.mock.calls[0][1];

    rerender({ isActive: false });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', registeredHandler);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('When the beforeunload event fires, then returnValue is cleared and an empty string is returned', () => {
    renderHook(() => useWarnBeforeUnload(true));
    const handler = addEventListenerSpy.mock.calls[0][1] as (e: Partial<BeforeUnloadEvent>) => string;
    const event: Partial<BeforeUnloadEvent> = { returnValue: 'not empty' };

    const result = handler(event);

    expect(event.returnValue).toBe('');
    expect(result).toBe('');
  });
});
