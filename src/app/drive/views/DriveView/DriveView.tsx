import { Component, ReactNode, useMemo } from 'react';
import { connect } from 'react-redux';

import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from '../../types';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  currentFolderId: number;
  dispatch: AppDispatch;
}

class DriveView extends Component<DriveViewProps> {
  componentDidMount(): void {
    const { dispatch } = this.props;

    dispatch(storageThunks.resetNamePathThunk());
    this.fetchItems();
  }

  fetchItems = (): void => {
    const { dispatch, currentFolderId } = this.props;

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageThunks.fetchFolderContentThunk(currentFolderId));
  };

  get breadcrumbItems(): BreadcrumbItemData[] {
    const { namePath, dispatch } = this.props;
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const firstPath = namePath[0];

      items.push({
        id: firstPath.id,
        label: 'Drive',
        icon: null, //<UilHdd className="w-4 h-4 mr-1" />
        active: true,
        isFirstPath: true,
        onClick: () => dispatch(storageThunks.goToFolderThunk(firstPath)),
      });
      namePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => dispatch(storageThunks.goToFolderThunk(path)),
        });
      });
    }

    return items;
  }

  render(): ReactNode {
    const { items, isLoading } = this.props;

    return <DriveExplorer title={<Breadcrumbs items={this.breadcrumbItems} />} isLoading={isLoading} items={items} />;
  }
}

// TODO: THIS IS TEMPORARY, REMOVE WHEN FALSE PAGINATION IS REMOVED
const sortFoldersFirst = (items: DriveItemData[]) =>
  items.sort((a, b) => Number(b?.isFolder ?? false) - Number(a?.isFolder ?? false));

export default connect((state: RootState) => {
  const currentFolderId = storageSelectors.currentFolderId(state);
  const items = storageSelectors.filteredItems(state)(storageSelectors.currentFolderItems(state));
  const sortedItems = sortFoldersFirst(items);

  return {
    namePath: state.storage.namePath,
    isLoading: state.storage.loadingFolders[currentFolderId],
    currentFolderId,
    items: sortedItems,
  };
})(DriveView);
