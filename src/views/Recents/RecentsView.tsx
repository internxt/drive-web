import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet-async';

import DriveExplorer from 'app/drive/components/DriveExplorer/DriveExplorer';
import navigationService from 'app/core/services/navigation.service';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { DriveItemData } from 'app/drive/types';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface RecentsViewProps {
  isLoadingRecents: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const RecentsView = (props: RecentsViewProps) => {
  const { items, isLoadingRecents, dispatch } = props;
  const { translate } = useTranslationContext();

  useEffect(() => {
    dispatch(storageActions.clearSelectedItems());
    props.dispatch(storageThunks.resetNamePathThunk());
    fetchRecentsContent();
  }, []);

  const fetchRecentsContent = () => {
    dispatch(storageThunks.fetchRecentsThunk());
  };

  const redirectToDrive = () => {
    navigationService.push(AppView.Drive);
  };

  return (
    <>
      <Helmet>
        <title>{translate('sideNav.recents')} - Internxt Drive</title>
      </Helmet>
      <DriveExplorer
        title={translate('views.recents.head')}
        isLoading={isLoadingRecents}
        items={items}
        onFolderCreated={redirectToDrive}
        fetchFolderContent={fetchRecentsContent}
      />
    </>
  );
};

export default connect((state: RootState) => {
  return {
    isLoadingRecents: state.storage.isLoadingRecents,
    items: storageSelectors.filteredItems(state)(state.storage.recents),
  };
})(RecentsView);
