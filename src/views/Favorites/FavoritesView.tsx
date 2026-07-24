import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet-async';

import DriveExplorer from 'views/Drive/components/DriveExplorer/DriveExplorer';
import navigationService from 'services/navigation.service';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { DriveItemData } from 'app/drive/types';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface FavoritesViewProps {
  isLoadingFavorites: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const FavoritesView = (props: FavoritesViewProps) => {
  const { items, isLoadingFavorites, dispatch } = props;
  const { translate } = useTranslationContext();

  useEffect(() => {
    dispatch(storageActions.clearSelectedItems());
    props.dispatch(storageThunks.resetNamePathThunk());
  }, []);

  const fetchFavoritesContent = () => {
    dispatch(storageActions.resetFavoritesPagination());
    dispatch(storageThunks.fetchFavoritesThunk());
  };

  const redirectToDrive = () => {
    navigationService.push(AppView.Drive);
  };

  return (
    <>
      <Helmet>
        <title>{translate('sideNav.favorites')} - Internxt Drive</title>
      </Helmet>
      <DriveExplorer
        title={translate('views.favorites.head')}
        isLoading={isLoadingFavorites}
        items={items}
        onFolderCreated={redirectToDrive}
        fetchFolderContent={fetchFavoritesContent}
      />
    </>
  );
};

export default connect((state: RootState) => {
  return {
    isLoadingFavorites: state.storage.isLoadingFavorites,
    items: storageSelectors.filteredItems(state)(state.storage.favorites),
  };
})(FavoritesView);
