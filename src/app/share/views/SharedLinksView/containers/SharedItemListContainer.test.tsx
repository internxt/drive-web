import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCallback } from 'react';

describe('SharedItemListContainer - onNextPage', () => {
  let mockActionDispatch: ReturnType<typeof vi.fn>;
  let hasMoreItems: boolean;
  let isLoading: boolean;
  let isAwaitingInitialFilesLoad: boolean;
  let page: number;

  beforeEach(() => {
    mockActionDispatch = vi.fn();
    hasMoreItems = true;
    isLoading = false;
    isAwaitingInitialFilesLoad = false;
    page = 0;
  });

  const createOnNextPage = () => {
    return useCallback(() => {
      if (!hasMoreItems || isLoading || isAwaitingInitialFilesLoad) {
        return;
      }
      mockActionDispatch({ type: 'SET_PAGE', payload: page + 1 });
    }, [hasMoreItems, isLoading, isAwaitingInitialFilesLoad, page]);
  };

  it('should call actionDispatch with next page when conditions are met', () => {
    const { result } = renderHook(() => createOnNextPage());

    result.current();

    expect(mockActionDispatch).toHaveBeenCalledWith({
      type: 'SET_PAGE',
      payload: 1,
    });
  });

  it('should not call actionDispatch when hasMoreItems is false', () => {
    hasMoreItems = false;
    const { result } = renderHook(() => createOnNextPage());

    result.current();

    expect(mockActionDispatch).not.toHaveBeenCalled();
  });

  it('should not call actionDispatch when isLoading is true', () => {
    isLoading = true;
    const { result } = renderHook(() => createOnNextPage());

    result.current();

    expect(mockActionDispatch).not.toHaveBeenCalled();
  });

  it('should not call actionDispatch when isAwaitingInitialFilesLoad is true', () => {
    isAwaitingInitialFilesLoad = true;
    const { result } = renderHook(() => createOnNextPage());

    result.current();

    expect(mockActionDispatch).not.toHaveBeenCalled();
  });

  it('should not call actionDispatch when multiple blocking conditions are true', () => {
    hasMoreItems = false;
    isLoading = true;
    isAwaitingInitialFilesLoad = true;
    const { result } = renderHook(() => createOnNextPage());

    result.current();

    expect(mockActionDispatch).not.toHaveBeenCalled();
  });
});

describe('SharedItemListContainer - isAwaitingInitialFilesLoad', () => {
  it('should return true when folders are loaded but files are pending (files length is 0)', () => {
    const hasMoreFolders = false;
    const hasMoreFiles = true;
    const shareFiles: unknown[] = [];

    const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && shareFiles.length === 0;

    expect(isAwaitingInitialFilesLoad).toBe(true);
  });

  it('should return false when files are already loaded (files length > 0)', () => {
    const hasMoreFolders = false;
    const hasMoreFiles = true;
    const shareFiles: unknown[] = [{}, {}, {}, {}, {}];

    const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && shareFiles.length === 0;

    expect(isAwaitingInitialFilesLoad).toBe(false);
  });

  it('should return false when there are more folders', () => {
    const hasMoreFolders = true;
    const hasMoreFiles = true;
    const shareFiles: unknown[] = [];

    const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && shareFiles.length === 0;

    expect(isAwaitingInitialFilesLoad).toBe(false);
  });

  it('should return false when there are no more files', () => {
    const hasMoreFolders = false;
    const hasMoreFiles = false;
    const shareFiles: unknown[] = [];

    const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && shareFiles.length === 0;

    expect(isAwaitingInitialFilesLoad).toBe(false);
  });

  it('should return false when all conditions are false', () => {
    const hasMoreFolders = true;
    const hasMoreFiles = false;
    const shareFiles: unknown[] = Array(10).fill({});

    const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && shareFiles.length === 0;

    expect(isAwaitingInitialFilesLoad).toBe(false);
  });
});
