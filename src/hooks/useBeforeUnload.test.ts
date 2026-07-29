/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import useBeforeUnload from './useBeforeUnload';

vi.mock('../app/tasks/services/tasks.service', () => ({
  default: {
    getNotifications: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn().mockReturnValue('reload-page-message'),
}));

import tasksService from '../app/tasks/services/tasks.service';

const mockedGetNotifications = vi.mocked(tasksService.getNotifications);

describe('useBeforeUnload', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  const getRegisteredHandler = () =>
    addEventListenerSpy.mock.calls[0][1] as (e: Partial<BeforeUnloadEvent>) => string | undefined;

  const createEvent = (): Partial<BeforeUnloadEvent> => ({
    preventDefault: vi.fn(),
    returnValue: undefined,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  test('When the hook mounts, then a beforeunload listener is registered and removed on unmount', () => {
    const { unmount } = renderHook(() => useBeforeUnload());
    const registeredHandler = getRegisteredHandler();

    unmount();

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', registeredHandler);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', registeredHandler);
  });

  test('When no condition is given and there are tasks in process, then leaving the page is prevented', () => {
    mockedGetNotifications.mockReturnValue([{ taskId: 'task-id' }] as ReturnType<typeof tasksService.getNotifications>);
    renderHook(() => useBeforeUnload());
    const event = createEvent();

    const result = getRegisteredHandler()(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('reload-page-message');
    expect(result).toBe('reload-page-message');
  });

  test('When no condition is given and there are no tasks in process, then leaving the page is not prevented', () => {
    mockedGetNotifications.mockReturnValue([]);
    renderHook(() => useBeforeUnload());
    const event = createEvent();

    const result = getRegisteredHandler()(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBeUndefined();
    expect(result).toBeUndefined();
  });

  test('When a custom condition is given, then it decides whether leaving the page is prevented', () => {
    renderHook(() => useBeforeUnload(() => true));
    const event = createEvent();

    getRegisteredHandler()(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockedGetNotifications).not.toHaveBeenCalled();
  });

  test('When the condition changes between renders, then the handler evaluates the latest one', () => {
    const { rerender } = renderHook(({ isActive }) => useBeforeUnload(() => isActive), {
      initialProps: { isActive: false },
    });
    const event = createEvent();

    rerender({ isActive: true });
    getRegisteredHandler()(event);

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
