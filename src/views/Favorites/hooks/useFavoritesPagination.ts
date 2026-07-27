import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import { fetchFavoritesThunk } from '../store/fetchFavoritesThunk';

interface UseFavoritesPaginationHook {
  hasMoreFavoriteFolders: boolean;
  hasMoreFavoriteFiles: boolean;
  fetchFavorites: () => void;
  resetFavoritesPagination: () => void;
}

export const useFavoritesPagination = (): UseFavoritesPaginationHook => {
  const dispatch = useAppDispatch();
  const hasMoreFavoriteFolders = useAppSelector((state: RootState) => state.storage.hasMoreFavoriteFolders);
  const hasMoreFavoriteFiles = useAppSelector((state: RootState) => state.storage.hasMoreFavoriteFiles);

  const fetchFavorites = () => {
    dispatch(fetchFavoritesThunk());
  };

  const resetFavoritesPagination = () => {
    dispatch(storageActions.resetFavoritesPagination());
  };

  return {
    hasMoreFavoriteFolders,
    hasMoreFavoriteFiles,
    fetchFavorites,
    resetFavoritesPagination,
  };
};
