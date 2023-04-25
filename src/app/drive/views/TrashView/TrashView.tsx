import { useEffect } from 'react';
import { connect } from 'react-redux';

import DriveExplorer from 'app/drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch, RootState } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface TrashViewProps {
  isLoadingItemsOnTrash: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const TrashView = (props: TrashViewProps) => {
  const { translate } = useTranslationContext();

  useEffect(() => {
    const { dispatch } = props;

    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
  }, []);

  const { items, isLoadingItemsOnTrash } = props;
  return <DriveExplorer title={translate('trash.trash') as string} isLoading={isLoadingItemsOnTrash} items={items} />;
};

export default connect((state: RootState) => {
  return {
    isLoadingDeleted: state.storage.isLoadingDeleted,
    items: state.storage.itemsOnTrash, //storageSelectors.filteredItems(state)(state.storage.itemsOnTrash), //.itemsOnTrash),
  };
})(TrashView);
