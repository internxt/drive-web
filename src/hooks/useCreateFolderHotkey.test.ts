import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useCreateFolderHotkey } from './useCreateFolderHotkey';

const pressF = (options: Record<string, unknown> = {}) =>
  fireEvent.keyDown(document.body, { key: 'F', code: 'KeyF', keyCode: 70, ...options });

describe('useCreateFolderHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When enabled and the user presses Shift+F, then a new folder is requested', () => {
    const onCreateFolder = vi.fn();
    renderHook(() => useCreateFolderHotkey({ enabled: true, onCreateFolder }));

    pressF({ shiftKey: true });

    expect(onCreateFolder).toHaveBeenCalledTimes(1);
  });

  test('When the user presses Shift+F, then the key is not typed anywhere else', () => {
    renderHook(() => useCreateFolderHotkey({ enabled: true, onCreateFolder: vi.fn() }));

    const wasNotPrevented = pressF({ shiftKey: true });

    expect(wasNotPrevented).toBe(false);
  });

  test('When the user presses F without Shift, then no folder is requested', () => {
    const onCreateFolder = vi.fn();
    renderHook(() => useCreateFolderHotkey({ enabled: true, onCreateFolder }));

    pressF({ key: 'f' });

    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  test('When disabled and the user presses Shift+F, then no folder is requested', () => {
    const onCreateFolder = vi.fn();
    renderHook(() => useCreateFolderHotkey({ enabled: false, onCreateFolder }));

    pressF({ shiftKey: true });

    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  test('When the shortcut becomes enabled after rendering, then pressing Shift+F requests a new folder', () => {
    const onCreateFolder = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useCreateFolderHotkey({ enabled, onCreateFolder }), {
      initialProps: { enabled: false },
    });

    rerender({ enabled: true });
    pressF({ shiftKey: true });

    expect(onCreateFolder).toHaveBeenCalledTimes(1);
  });

  test('When the user is typing in an input and presses Shift+F, then no folder is requested', () => {
    const onCreateFolder = vi.fn();
    renderHook(() => useCreateFolderHotkey({ enabled: true, onCreateFolder }));
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'F', code: 'KeyF', keyCode: 70, shiftKey: true });

    expect(onCreateFolder).not.toHaveBeenCalled();
    input.remove();
  });
});
