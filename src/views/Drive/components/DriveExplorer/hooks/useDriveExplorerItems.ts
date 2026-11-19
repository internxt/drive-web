import { useCallback, useEffect, useRef, useState } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchPaginatedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';
import errorService from 'services/error.service';
import { useFavoritesPagination } from 'views/Favorites/hooks';
import { useTrashPagination } from 'views/Trash/hooks/useTrashPagination';
import { usePaginationState } from 'views/Drive/hooks/usePaginationState';

type GetTrashPaginated = NonNullable<Parameters<typeof useTrashPagination>[0]['getTrashPaginated']>;

interface UseDriveExplorerItemsProps {
  isTrash: boolean;
  isFavorites: boolean;
  isRecents: boolean;
  isLoading: boolean;
  getTrashPaginated?: GetTrashPaginated;
}

export const useDriveExplorerItems = ({
  isTrash,
  isFavorites,
  isRecents,
  isLoading,
  getTrashPaginated,
}: UseDriveExplorerItemsProps) => {
  const dispatch = useAppDispatch();
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const order = useAppSelector((state: RootState) => state.storage.order);
  const folderOnTrashLength = useAppSelector((state: RootState) => state.storage.folderOnTrashLength);
  const filesOnTrashLength = useAppSelector((state: RootState) => state.storage.filesOnTrashLength);
  const hasMoreDriveFolders = useAppSelector(
    (state: RootState) => state.storage.hasMoreDriveFolders[currentFolderId] ?? true,
  );
  const hasMoreDriveFiles = useAppSelector(
    (state: RootState) => state.storage.hasMoreDriveFiles[currentFolderId] ?? true,
  );

  const { hasMoreFavoriteFolders, hasMoreFavoriteFiles, fetchFavorites } = useFavoritesPagination();
  const hasMoreFolders = isFavorites ? hasMoreFavoriteFolders : hasMoreDriveFolders;
  const hasMoreFiles = isFavorites ? hasMoreFavoriteFiles : hasMoreDriveFiles;

  const paginationState = usePaginationState({ isTrash, hasMoreFiles, hasMoreFolders });
  const { setHasMoreItems } = paginationState;

  const {
    isLoadingTrashItems,
    hasMoreTrashFolders,
    setHasMoreTrashFolders,
    setIsLoadingTrashItems,
    getMoreTrashItems,
  } = useTrashPagination({
    getTrashPaginated,
    folderOnTrashLength,
    filesOnTrashLength,
    setHasMoreItems,
    order,
  });

  const hasMoreItemsToLoad = !isRecents && paginationState.hasMoreItemsToLoad;
  const isEmptyFolder = !isLoading && !hasMoreItemsToLoad;

  const loadMoreItems = () => {
    if (isRecents) return;

    if (isTrash) {
      getMoreTrashItems().catch((error) => errorService.reportError(error));
    } else if (isFavorites) {
      fetchFavorites();
    } else {
      void dispatch(fetchPaginatedFolderContentThunk(currentFolderId));
    }
  };

  const latestLoadMoreItems = useRef(loadMoreItems);
  latestLoadMoreItems.current = loadMoreItems;

  const resetPaginationState = useCallback(() => {
    dispatch(storageActions.resetTrash());
    dispatch(storageActions.resetFavoritesPagination());
    setHasMoreItems(true);
    setHasMoreTrashFolders(true);
    setIsLoadingTrashItems(false);
  }, [dispatch, setHasMoreItems, setHasMoreTrashFolders, setIsLoadingTrashItems]);

  const onTrashCleared = useCallback(() => {
    dispatch(storageActions.resetTrash());
    setHasMoreItems(false);
    setHasMoreTrashFolders(false);
  }, [dispatch, setHasMoreItems, setHasMoreTrashFolders]);

  const trashOrder = isTrash ? order : null;
  const [firstPageRequest, setFirstPageRequest] = useState(0);

  useEffect(() => {
    resetPaginationState();
    setFirstPageRequest((request) => request + 1);
  }, [currentFolderId, trashOrder, resetPaginationState]);

  useEffect(() => {
    if (firstPageRequest > 0) latestLoadMoreItems.current();
  }, [firstPageRequest]);

  const areFoldersLoaded = isTrash ? !hasMoreTrashFolders : !hasMoreFolders;
  const previousFoldersLoad = useRef({ currentFolderId, trashOrder, firstPageRequest, areFoldersLoaded });

  useEffect(() => {
    const previous = previousFoldersLoad.current;
    previousFoldersLoad.current = { currentFolderId, trashOrder, firstPageRequest, areFoldersLoaded };

    const isSameListing =
      previous.currentFolderId === currentFolderId &&
      previous.trashOrder === trashOrder &&
      previous.firstPageRequest === firstPageRequest;
    const haveFoldersJustFinished = isSameListing && !previous.areFoldersLoaded && areFoldersLoaded;
    if (haveFoldersJustFinished) latestLoadMoreItems.current();
  }, [currentFolderId, trashOrder, firstPageRequest, areFoldersLoaded]);

  return {
    hasMoreItemsToLoad,
    isEmptyFolder,
    isLoadingTrashItems,
    loadMoreItems,
    resetPaginationState,
    onTrashCleared,
  };
};
