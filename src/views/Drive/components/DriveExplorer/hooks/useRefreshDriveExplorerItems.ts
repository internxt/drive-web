import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';

export const REFRESH_AFTER_CHANGE_DELAY_MS = 500;

export const useRefreshDriveExplorerItems = (fetchFolderContent?: () => void) => {
  const dispatch = useAppDispatch();
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);

  const refreshItems = useCallback(() => {
    if (fetchFolderContent) {
      fetchFolderContent();
    } else {
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    }
  }, [dispatch, currentFolderId, fetchFolderContent]);

  const refreshItemsAfterChange = useCallback(() => {
    setTimeout(refreshItems, REFRESH_AFTER_CHANGE_DELAY_MS);
  }, [refreshItems]);

  return { refreshItems, refreshItemsAfterChange };
};
