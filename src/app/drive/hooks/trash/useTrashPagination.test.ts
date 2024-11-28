/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import errorService from 'app/core/services/error.service';
import { OrderDirection } from 'app/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrashPagination } from './useTrashPagination';

vi.mock('app/core/services/error.service', () => ({
  castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
  reportError: vi.fn(),
}));

vi.mock('app/core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('useTrashPagination', () => {
  const mockGetTrashPaginated = vi.fn();

  const defaultProps = {
    getTrashPaginated: mockGetTrashPaginated,
    folderOnTrashLength: 10,
    filesOnTrashLength: 5,
    setHasMoreItems: vi.fn(),
    isTrash: true,
    order: { by: 'name', direction: OrderDirection.Asc },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call getMoreTrashItems when isTrash is true on mount', async () => {
    mockGetTrashPaginated.mockResolvedValueOnce({ finished: false, itemsRetrieved: 10 });

    renderHook(() => useTrashPagination(defaultProps));

    await waitFor(() => {
      expect(mockGetTrashPaginated).toHaveBeenCalled();
    });
  });

  it('should set isLoadingTrashItems to true while loading items', async () => {
    mockGetTrashPaginated.mockResolvedValueOnce({ finished: false, itemsRetrieved: 10 });

    const { result } = renderHook(() => useTrashPagination(defaultProps));

    await waitFor(() => {
      expect(result.current.isLoadingTrashItems).toBe(true);
    });

    await act(async () => {
      await result.current.getMoreTrashItems();
    });

    await waitFor(() => {
      expect(result.current.isLoadingTrashItems).toBe(false);
    });
  });

  it('should set hasMoreTrashFolders to false when there are no more folders', async () => {
    mockGetTrashPaginated.mockResolvedValueOnce({ finished: true, itemsRetrieved: 10 });

    const { result } = renderHook(() => useTrashPagination(defaultProps));

    await act(async () => {
      await result.current.getMoreTrashItems();
    });

    await waitFor(() => {
      expect(result.current.isLoadingTrashItems).toBe(false);
    });
  });

  it('should handle errors when fetching fails', async () => {
    mockGetTrashPaginated.mockRejectedValueOnce(new Error('Fetching failed'));

    renderHook(() => useTrashPagination(defaultProps));

    await waitFor(() => {
      expect(errorService.reportError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should call getMoreTrashFiles when hasMoreTrashFolders is false', async () => {
    mockGetTrashPaginated
      .mockResolvedValueOnce({ finished: false, itemsRetrieved: 10 })
      .mockResolvedValueOnce({ finished: true, itemsRetrieved: 5 });

    const { result } = renderHook(() => useTrashPagination(defaultProps));

    await act(async () => {
      await result.current.getMoreTrashItems();
    });

    await act(async () => {
      await result.current.getMoreTrashItems();
    });

    await waitFor(() => {
      expect(result.current.isLoadingTrashItems).toBe(false);
    });
  });
});
