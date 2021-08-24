import * as Unicons from '@iconscout/react-unicons';
import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import Breadcrumbs, { BreadcrumbItemData } from '../../components/Breadcrumbs/Breadcrumbs';
import FileExplorer from '../../components/FileExplorer/FileExplorer';
import { DriveItemData, FolderPath } from '../../models/interfaces';
import { AppDispatch, RootState } from '../../store';
import { storageSelectors } from '../../store/slices/storage';
import storageThunks from '../../store/slices/storage/storage.thunks';

interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

class DriveView extends Component<DriveViewProps, {}> {

  componentDidMount(): void {
    const { dispatch } = this.props;

    dispatch(storageThunks.resetNamePathThunk());
    this.fetchItems();
  }

  fetchItems = (): void => {
    const { dispatch } = this.props;

    dispatch(storageThunks.fetchFolderContentThunk());
  }

  get breadcrumbItems(): BreadcrumbItemData[] {
    const { namePath, dispatch } = this.props;
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const firstPath = namePath[0];

      items.push({
        id: firstPath.id,
        label: 'Drive',
        icon: <Unicons.UilHdd className="w-4 h-4 mr-1" />,
        active: true,
        onClick: () => dispatch(storageThunks.goToFolderThunk(firstPath))
      });
      namePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => dispatch(storageThunks.goToFolderThunk(path))
        });
      });
    }

    return items;
  }

  render(): ReactNode {
    const { items, isLoading } = this.props;

    return (
      <FileExplorer
        title={<Breadcrumbs items={this.breadcrumbItems} />}
        isLoading={isLoading}
        items={items}
        onFileUploaded={this.fetchItems}
        onDragAndDropEnd={this.fetchItems}
      />
    );
  }
}

export default connect((state: RootState) => {
  const filteredItems = storageSelectors.filteredItems(state)(state.storage.lists.drive);

  return {
    namePath: state.storage.namePath,
    isLoading: state.storage.isLoading,
    items: filteredItems
  };
})(DriveView);