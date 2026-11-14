import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { fetchPaginatedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';

interface UseFolderFetchRecoveryProps {
  folderId: string;
  hasMoreItems: boolean;
  isDriveFolder: boolean;
}

/**
 * Pauses paging of a Drive folder whose last content request failed, so a visible end of the list
 * cannot re-request it in a loop, and requests the folder again once the browser is back online.
 */
export const useFolderFetchRecovery = ({ folderId, hasMoreItems, isDriveFolder }: UseFolderFetchRecoveryProps) => {
  const dispatch = useAppDispatch();
  const hasFetchFailed = useAppSelector((state) => state.storage.hasFetchFailedByFolderId[folderId] ?? false);
  const shouldPausePaging = isDriveFolder && hasFetchFailed;

  useEffect(() => {
    if (!shouldPausePaging) return;

    const refetchFolder = () => dispatch(fetchPaginatedFolderContentThunk(folderId));
    window.addEventListener('online', refetchFolder);

    return () => window.removeEventListener('online', refetchFolder);
  }, [shouldPausePaging, folderId, dispatch]);

  return { canRequestMorePages: hasMoreItems && !shouldPausePaging };
};
