import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useToggleFavoriteHotkey } from './useToggleFavoriteHotkey';
import { DriveItemData } from 'app/drive/types';

const dispatchMock = vi.fn();

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
}));

vi.mock('views/Favorites/store/toggleFavoriteThunk', () => ({
  toggleFavoriteThunk: vi.fn((items) => ({ type: 'storage/toggleFavorite', payload: items })),
}));

const buildItem = (uuid: string): DriveItemData => ({ uuid, isFavorite: false }) as unknown as DriveItemData;

const pressF = (options: Record<string, unknown> = {}) =>
  fireEvent.keyDown(document.body, { key: 'f', code: 'KeyF', keyCode: 70, ...options });

describe('useToggleFavoriteHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When enabled and exactly one item is selected, then pressing F dispatches the toggle favorite thunk', async () => {
    const { toggleFavoriteThunk } = await import('views/Favorites/store/toggleFavoriteThunk');
    const selectedItems = [buildItem('file-uuid-1')];

    renderHook(() => useToggleFavoriteHotkey({ enabled: true, selectedItems }));

    pressF();

    expect(toggleFavoriteThunk).toHaveBeenCalledWith(selectedItems);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  test('When shift is held, then pressing F does not dispatch', () => {
    renderHook(() => useToggleFavoriteHotkey({ enabled: true, selectedItems: [buildItem('file-uuid-1')] }));

    pressF({ shiftKey: true });

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('When the hotkey is disabled, then pressing F does not dispatch', () => {
    renderHook(() => useToggleFavoriteHotkey({ enabled: false, selectedItems: [buildItem('file-uuid-1')] }));

    pressF();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('When more than one item is selected, then pressing F does not dispatch', () => {
    renderHook(() =>
      useToggleFavoriteHotkey({ enabled: true, selectedItems: [buildItem('file-uuid-1'), buildItem('file-uuid-2')] }),
    );

    pressF();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('When no item is selected, then pressing F does not dispatch', () => {
    renderHook(() => useToggleFavoriteHotkey({ enabled: true, selectedItems: [] }));

    pressF();

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
