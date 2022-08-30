import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import DriveExplorer from 'app/drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch, RootState } from 'app/store';
import { storageSelectors } from 'app/store/slices/storage';
import storageThunks from '../../../store/slices/storage/storage.thunks';
export interface TrashViewProps {
  isLoadingItemsOnTrash: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

class TrashView extends Component<TrashViewProps> {

  componentDidMount(): void {
    this.props.dispatch(storageThunks.resetNamePathThunk());
    this.refreshDeleted();
  }

  refreshDeleted = () => {
    const { dispatch } = this.props;

    dispatch(storageThunks.fetchDeletedThunk());
  };

  render(): ReactNode {

    const { items, isLoadingItemsOnTrash } = this.props;

    return <DriveExplorer title="Trash" titleClassName="px-3" isLoading={isLoadingItemsOnTrash} items={items} />;
  }
}

export default connect((state: RootState) => {
  return {
    isLoadingDeleted: state.storage.isLoadingDeleted,
    items: storageSelectors.filteredItems(state)(state.storage.itemsOnTrash),//.itemsOnTrash),
  };
})(TrashView);
