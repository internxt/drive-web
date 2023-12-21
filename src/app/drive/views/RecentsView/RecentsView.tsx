import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet-async';

import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import navigationService from '../../../core/services/navigation.service';
import { AppDispatch, RootState } from '../../../store';
import { storageSelectors } from '../../../store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { DriveItemData } from '../../types';
import { AppView } from '../../../core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface RecentsViewProps {
  isLoadingRecents: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const RecentsView = (props: RecentsViewProps) => {
  const { translate } = useTranslationContext();
  useEffect(() => {
    props.dispatch(storageThunks.resetNamePathThunk());
    refreshRecents();
  }, []);

  const refreshRecents = () => {
    const { dispatch } = props;

    dispatch(storageThunks.fetchRecentsThunk());
  };

  const redirectToDrive = () => {
    navigationService.push(AppView.Drive);
  };

  const { items, isLoadingRecents } = props;

  return (
    <>
      <Helmet>
        <title>{translate('sideNav.recents')} - Internxt Drive</title>
      </Helmet>
      <DriveExplorer
        title={translate('views.recents.head') as string}
        isLoading={isLoadingRecents}
        items={items}
        onFolderCreated={redirectToDrive}
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
