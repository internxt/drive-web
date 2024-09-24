/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useBackupsPagination } from './useBackupsPagination';
import newStorageService from '../../drive/services/new-storage.service';
import { act } from 'react-dom/test-utils';
import _ from 'lodash';

jest.mock('../../drive/services/new-storage.service', () => ({
  getFolderContentByUuid: jest.fn(),
}));

describe('useBackupsPagination', () => {
  const clearSelectedItems = jest.fn();

  const FOLDER_CONTENT_1: any = {
    files: Array.from({ length: 30 }, (_, i) => ({ plainName: `file-${i + 1}.txt` })),
    children: Array.from({ length: 25 }, (_, i) => ({ plainName: `folder-${i + 1}` })),
  };

  const FOLDER_CONTENT_2: any = {
    files: Array.from({ length: 20 }, (_, i) => ({ plainName: `file-${i + 31}.txt` })),
    children: Array.from({ length: 0 }, () => []),
  };

  const FOLDER_CONTENT_1_LENGTH = _.concat(FOLDER_CONTENT_1.files, FOLDER_CONTENT_1.children).length;
  const FOLDER_CONTENT_2_LENGTH = _.concat(FOLDER_CONTENT_2.files, FOLDER_CONTENT_2.children).length;
  const TOTAL_LENGTH = FOLDER_CONTENT_1_LENGTH + FOLDER_CONTENT_2_LENGTH;

  it('Should load the first items and contains more items to fetch paginated', async () => {
    jest.spyOn(newStorageService, 'getFolderContentByUuid').mockReturnValue([
      Promise.resolve(FOLDER_CONTENT_1),
      {
        cancel: jest.fn(),
      },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await waitFor(() => {
      expect(result.current.areFetchingItems).toBe(true);
    });

    expect(newStorageService.getFolderContentByUuid as jest.Mock).toHaveBeenCalledWith({
      folderUuid: 'some-folder-uuid',
      limit: 50,
      offset: 0,
    });

    await waitFor(() => {
      expect(result.current.currentItems.length).toEqual(FOLDER_CONTENT_1_LENGTH);
    });

    await waitFor(() => {
      expect(result.current.hasMoreItems).toBe(true);
      expect(result.current.areFetchingItems).toBe(false);
    });
  });

  it('Should fetch more items if getMorePaginatedItems is called', async () => {
    jest.spyOn(newStorageService, 'getFolderContentByUuid').mockReturnValue([
      Promise.resolve(FOLDER_CONTENT_1),
      {
        cancel: jest.fn(),
      },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await act(async () => {
      await result.current.getFolderContent();
    });

    expect(result.current.currentItems.length).toBe(FOLDER_CONTENT_1.files.length + FOLDER_CONTENT_1.children.length);

    jest.spyOn(newStorageService, 'getFolderContentByUuid').mockReturnValue([
      Promise.resolve(FOLDER_CONTENT_2),
      {
        cancel: jest.fn(),
      },
    ]);

    await act(async () => {
      await result.current.getMorePaginatedItems();
    });

    await waitFor(() => {
      expect(result.current.currentItems.length).toEqual(TOTAL_LENGTH);
    });
  });

  // it('no debería cargar más elementos si no hay más elementos por cargar', async () => {
  //   const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

  //   expect(result.current.hasMoreItems).toBe(false);

  //   await act(async () => {
  //     await result.current.getMorePaginatedItems();
  //   });

  //   expect(result.current.currentItems.length).toBe(3);
  // });

  // it('debería limpiar los elementos seleccionados cuando se cambia folderUuid', async () => {
  //   const { rerender } = renderHook(({ folderUuid }) => useBackupsPagination(folderUuid, clearSelectedItems), {
  //     initialProps: { folderUuid: 'folder-1' },
  //   });

  //   expect(clearSelectedItems).toHaveBeenCalledTimes(1);

  //   rerender({ folderUuid: 'folder-2' });

  //   expect(clearSelectedItems).toHaveBeenCalledTimes(2);
  // });
});
