import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaginationState } from './usePaginationState';

describe('usePaginationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      usePaginationState({ isTrash: false, hasMoreFiles: true, hasMoreFolders: true }),
    );
    expect(result.current).toMatchObject({
      hasMoreItems: true,
      hasMoreItemsToLoad: true,
      isEmptyFolder: true,
    });
    expect(typeof result.current.setHasMoreItems).toBe('function');
    expect(typeof result.current.resetPaginationState).toBe('function');
  });

  describe('non-trash mode', () => {
    it('calculates hasMoreItemsToLoad from files/folders', () => {
      const { result } = renderHook(() =>
        usePaginationState({ isTrash: false, hasMoreFiles: true, hasMoreFolders: false }),
      );
      expect(result.current.hasMoreItemsToLoad).toBe(true);
    });

    it('updates hasMoreItems when hasMoreFiles changes', () => {
      const { result, rerender } = renderHook((props) => usePaginationState(props), {
        initialProps: { isTrash: false, hasMoreFiles: true, hasMoreFolders: true },
      });
      expect(result.current.hasMoreItems).toBe(true);
      rerender({ isTrash: false, hasMoreFiles: false, hasMoreFolders: true });
      expect(result.current.hasMoreItems).toBe(false);
    });

    it('sets hasMoreItems true when both files and folders are true', () => {
      const { result, rerender } = renderHook((props) => usePaginationState(props), {
        initialProps: { isTrash: false, hasMoreFiles: false, hasMoreFolders: false },
      });
      rerender({ isTrash: false, hasMoreFiles: true, hasMoreFolders: true });
      expect(result.current.hasMoreItems).toBe(true);
    });
  });

  describe('trash mode', () => {
    it('uses hasMoreItems for hasMoreItemsToLoad', () => {
      const { result } = renderHook(() =>
        usePaginationState({ isTrash: true, hasMoreFiles: false, hasMoreFolders: false }),
      );
      expect(result.current.hasMoreItemsToLoad).toBe(true);
      act(() => result.current.setHasMoreItems(false));
      expect(result.current.hasMoreItemsToLoad).toBe(false);
    });

    it('does not update hasMoreItems on hasMoreFiles change', () => {
      const { result, rerender } = renderHook((props) => usePaginationState(props), {
        initialProps: { isTrash: true, hasMoreFiles: true, hasMoreFolders: true },
      });
      rerender({ isTrash: true, hasMoreFiles: false, hasMoreFolders: true });
      expect(result.current.hasMoreItems).toBe(true);
    });
  });

  it('setHasMoreItems updates state', () => {
    const { result } = renderHook(() =>
      usePaginationState({ isTrash: false, hasMoreFiles: true, hasMoreFolders: true }),
    );
    act(() => result.current.setHasMoreItems(false));
    expect(result.current.hasMoreItems).toBe(false);
  });

  it('resetPaginationState resets to true', () => {
    const { result } = renderHook(() =>
      usePaginationState({ isTrash: true, hasMoreFiles: false, hasMoreFolders: false }),
    );
    act(() => result.current.setHasMoreItems(false));
    act(() => result.current.resetPaginationState());
    expect(result.current.hasMoreItems).toBe(true);
  });

  it('isEmptyFolder equals hasMoreItemsToLoad', () => {
    const { result } = renderHook(() =>
      usePaginationState({ isTrash: true, hasMoreFiles: false, hasMoreFolders: false }),
    );
    expect(result.current.isEmptyFolder).toBe(result.current.hasMoreItemsToLoad);
    act(() => result.current.setHasMoreItems(false));
    expect(result.current.isEmptyFolder).toBe(result.current.hasMoreItemsToLoad);
  });
});
