import { useEffect } from 'react';
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
import { useLocation, useHistory } from 'react-router-dom';
import newStorageService from 'app/drive/services/new-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  currentFolderId: number;
  dispatch: AppDispatch;
  isGlobalSearch: boolean;
}

const DriveView = (props: DriveViewProps) => {
  const { dispatch, namePath, items, isLoading } = props;
  const history = useHistory();
  const pathname = useLocation().pathname;

  useEffect(() => {
    dispatch(uiActions.setIsFileViewerOpen(false));
    const pathnameSplit = pathname.split('/');
    const itemType = pathnameSplit[2];
    const itemUuid = pathnameSplit[3];

    if (itemUuid && itemType === 'folder') {
      goFolder(itemUuid);
    }

    if (itemUuid && itemType === 'file') {
      goFile(itemUuid);
    }
  }, [pathname]);

  useEffect(() => {
    dispatch(uiActions.setIsGlobalSearch(false));
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
    return () => {
      dispatch(storageActions.resetDrivePagination());
    };
  }, []);

  const goFolder = async (folderUuid) => {
    try {
      const folderMeta = await newStorageService.getFolderMeta(folderUuid);
      dispatch(
        storageThunks.goToFolderThunk({
          name: folderMeta.plainName,
          id: folderMeta.id,
          uuid: folderMeta.uuid as string,
        }),
      );
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const goFile = async (folderUuid) => {
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const [responsePromise] = storageClient.getFile(folderUuid);

    try {
      const fileMeta = await responsePromise;
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(fileMeta));
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const breadcrumbItems = (): BreadcrumbItemData[] => {
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
          navigationService.push(AppView.Drive);
        },
      });

      namePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => navigationService.pushFolder(path.uuid),
        });
      });
    }

    return items;
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/app`} />
      </Helmet>
      <DriveExplorer title={<Breadcrumbs items={breadcrumbItems()} />} isLoading={isLoading} items={items} />
    </>
  );
};

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
