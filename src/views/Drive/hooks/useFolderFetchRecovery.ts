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
  const hasFolderFetchFailed = useAppSelector((state) => state.storage.hasFetchFailedByFolderId[folderId] ?? false);
  const hasDriveFolderFetchFailed = isDriveFolder && hasFolderFetchFailed;

  useEffect(() => {
    if (!hasDriveFolderFetchFailed) return;

    const refetchFolder = () => dispatch(fetchPaginatedFolderContentThunk(folderId));
    window.addEventListener('online', refetchFolder);

    return () => window.removeEventListener('online', refetchFolder);
  }, [hasDriveFolderFetchFailed, folderId]);

  return { canRequestMorePages: hasMoreItems && !hasDriveFolderFetchFailed };
};
