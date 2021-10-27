import * as Unicons from '@iconscout/react-unicons';
import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from '../../types';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import pollingService from 'app/core/services/polling.service';
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

interface DriveViewState {
  databasePolling: NodeJS.Timeout;
}

class DriveView extends Component<DriveViewProps, DriveViewState> {
  componentDidMount(): void {
    const { dispatch } = this.props;

    dispatch(storageThunks.resetNamePathThunk());
    this.fetchItems();

    this.setState({
      databasePolling: pollingService.create(async () => {
        const { currentFolderId } = this.props;
        const currentFolderItems = await databaseService.get(DatabaseCollection.Levels, this.props.currentFolderId);

        if (currentFolderItems) {
          dispatch(storageActions.setItems({ folderId: currentFolderId, items: currentFolderItems }));
        }
      }, 1500),
    });
  }

  componentWillUnmount(): void {
    const { databasePolling } = this.state;

    databasePolling && pollingService.destroy(databasePolling);
  }

  fetchItems = (): void => {
    const { dispatch, currentFolderId } = this.props;

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
        icon: <Unicons.UilHdd className="w-4 h-4 mr-1" />,
        active: true,
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

    return (
      <DriveExplorer
        title={<Breadcrumbs items={this.breadcrumbItems} />}
        isLoading={isLoading}
        titleClassName="px-2"
        items={items}
      />
    );
  }
}

export default connect((state: RootState) => {
  const currentFolderId = storageSelectors.currentFolderId(state);
  const items = storageSelectors.filteredItems(state)(storageSelectors.currentFolderItems(state));

  return {
    namePath: state.storage.namePath,
    isLoading: state.storage.loadingFolders[currentFolderId],
    currentFolderId,
    items,
  };
})(DriveView);
