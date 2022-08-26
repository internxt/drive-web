import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import DriveExplorer from 'app/drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch, RootState } from 'app/store';
import { storageSelectors } from 'app/store/slices/storage';

export interface TrashViewProps {
  isLoadingItemsOnTrash: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

class TrashView extends Component<TrashViewProps> {
  render(): ReactNode {
    const { items, isLoadingItemsOnTrash } = this.props;

    return <DriveExplorer title="Trash" titleClassName="px-3" isLoading={isLoadingItemsOnTrash} items={items} />;
  }
}

export default connect((state: RootState) => {
  return {
    isLoadingDeleted: state.storage.isLoadingDeleted,
    items: storageSelectors.filteredItems(state)(state.storage.itemsOnTrash),
  };
})(TrashView);
