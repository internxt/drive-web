import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { connect, useSelector } from 'react-redux';

import DriveExplorer from 'views/Drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AppDispatch, RootState } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import { getTrashPaginated, getWorkspaceTrashPaginated } from './services';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { uiActions } from 'app/store/slices/ui';
import { useAppSelector } from 'app/store/hooks';
import AutomaticTrashDisposalDialog from './components/AutomaticTrashDisposalDialog';
import { userSelectors } from 'app/store/slices/user';

export interface TrashViewProps {
  isLoadingItemsOnTrash: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const TrashView = (props: TrashViewProps) => {
  const { items, isLoadingItemsOnTrash } = props;
  const { translate } = useTranslationContext();

  const workspaceSelected = useSelector(workspacesSelectors.getSelectedWorkspace);
  const hasSignedToday = useAppSelector(userSelectors.hasSignedToday);
  const getTrash = workspaceSelected ? getWorkspaceTrashPaginated : getTrashPaginated;

  useEffect(() => {
    const { dispatch } = props;
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());

    if (!hasSignedToday) {
      dispatch(uiActions.setIsAutomaticTrashDisposalDialogOpen(true));
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>{translate('sideNav.trash')} - Internxt Drive</title>
      </Helmet>
      <DriveExplorer
        title={translate('trash.trash')}
        isLoading={isLoadingItemsOnTrash}
        items={items}
        getTrashPaginated={getTrash}
      />
      <AutomaticTrashDisposalDialog />
    </>
  );
};

export default connect((state: RootState) => {
  return {
    isLoadingDeleted: state.storage.isLoadingDeleted,
    items: state.storage.itemsOnTrash,
  };
})(TrashView);
