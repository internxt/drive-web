import { Component, ReactNode, useEffect } from 'react';
import { connect } from 'react-redux';

import DriveExplorer from 'app/drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch, RootState } from 'app/store';
import { storageSelectors } from 'app/store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import getTrash from '../../../../use_cases/trash/get_trash';
import { get } from 'app/i18n/services/i18n.service';
import { useTranslation } from 'react-i18next';

export interface TrashViewProps {
  isLoadingItemsOnTrash: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const TrashView = (props: TrashViewProps) => {
  const { t } = useTranslation();
  useEffect(() => {
    props.dispatch(storageThunks.resetNamePathThunk());
    getTrash();
  }, []);

  const { items, isLoadingItemsOnTrash } = props;
  return (
    <DriveExplorer
      title={t('trash.trash') as string}
      titleClassName="px-3"
      isLoading={isLoadingItemsOnTrash}
      items={items}
    />
  );
};

export default connect((state: RootState) => {
  return {
    isLoadingDeleted: state.storage.isLoadingDeleted,
    items: storageSelectors.filteredItems(state)(state.storage.itemsOnTrash), //.itemsOnTrash),
  };
})(TrashView);
