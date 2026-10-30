/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { OrderDirection } from 'app/core/types';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { useTrashPagination } from './useTrashPagination';

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
    vi.resetModules();
  });

  test('When the trash is opened, then nothing is loaded until the explorer asks for a page', () => {
    renderHook(() => useTrashPagination(defaultProps));

    expect(mockGetTrashPaginated).not.toHaveBeenCalled();
  });

  test('When a page is being loaded, then the trash shows it is loading until the page arrives', async () => {
    let answerPage: (page: { finished: boolean; itemsRetrieved: number }) => void = () => {};
    mockGetTrashPaginated.mockReturnValueOnce(new Promise((resolve) => (answerPage = resolve)));
    const { result } = renderHook(() => useTrashPagination(defaultProps));

    let pageLoaded: Promise<void> = Promise.resolve();
    act(() => {
      pageLoaded = result.current.getMoreTrashItems();
    });

    expect(result.current.isLoadingTrashItems).toBe(true);
    await act(async () => {
      answerPage({ finished: false, itemsRetrieved: 10 });
      await pageLoaded;
    });
    expect(result.current.isLoadingTrashItems).toBe(false);
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

  test('When loading a page fails, then the error reaches whoever asked for the page', async () => {
    mockGetTrashPaginated.mockRejectedValueOnce(new Error('Fetching failed'));
    const { result } = renderHook(() => useTrashPagination(defaultProps));

    await expect(result.current.getMoreTrashItems()).rejects.toThrow('Fetching failed');
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
