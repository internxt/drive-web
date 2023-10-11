import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from '../../types';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { t } from 'i18next';
import { Helmet } from 'react-helmet-async';
import { uiActions } from 'app/store/slices/ui';
import { DotsThree } from '@phosphor-icons/react';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  currentFolderId: number;
  dispatch: AppDispatch;
  isGlobalSearch: boolean;
}

class DriveView extends Component<DriveViewProps> {
  componentDidMount(): void {
    const { dispatch } = this.props;
    dispatch(storageThunks.resetNamePathThunk());
    this.fetchItems();
  }

  componentWillUnmount(): void {
    const { dispatch } = this.props;
    dispatch(storageActions.resetDrivePagination());
  }

  fetchItems = (): void => {
    const { dispatch } = this.props;

    dispatch(storageActions.clearSelectedItems());
  };

  get breadcrumbItems(): BreadcrumbItemData[] {
    const { isGlobalSearch } = this.props;
    const { namePath, dispatch } = this.props;
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const firstPath = namePath[0];

      items.push({
        id: firstPath.id,
        label: t('sideNav.drive'),
        icon: null,
        active: true,
        isFirstPath: true,
        onClick: () => {
          dispatch(uiActions.setIsGlobalSearch(false));
          dispatch(storageThunks.goToFolderThunk(firstPath));
        },
      });

      isGlobalSearch &&
        items.push({
          id: firstPath.id,
          label: '',
          icon: <DotsThree className="ml-0.5" />,
          active: true,
          isFirstPath: true,
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
      <>
        <Helmet>
          <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/app`} />
        </Helmet>
        <DriveExplorer title={<Breadcrumbs items={this.breadcrumbItems} />} isLoading={isLoading} items={items} />
      </>
    );
  }
}

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
    isGlobalSearch: state.ui.isGlobalSearch,
  };
})(DriveView);
