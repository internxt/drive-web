import { useEffect, useState } from 'react';
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
import newStorageService from 'app/drive/services/new-storage.service';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import fileService from 'app/drive/services/file.service';
import useDriveNavigation from '../../../routes/hooks/Drive/useDrive';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const DriveView = (props: DriveViewProps) => {
  const { dispatch, namePath, items, isLoading } = props;
  const [title, setTitle] = useState('Internxt Drive');
  const { isFileView, isFolderView, itemUuid } = useDriveNavigation();

  useEffect(() => {
    dispatch(uiActions.setIsGlobalSearch(false));
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
    return () => {
      dispatch(storageActions.resetDrivePagination());
    };
  }, []);

  useEffect(() => {
    dispatch(uiActions.setIsFileViewerOpen(false));

    if (isFolderView && itemUuid) {
      goFolder(itemUuid);
    }

    if (isFileView && itemUuid) {
      showFile(itemUuid);
    }
  }, [isFileView, isFolderView, itemUuid]);

  const goFolder = async (folderUuid: string) => {
    try {
      const folderMeta = await newStorageService.getFolderMeta(folderUuid);
      dispatch(storageThunks.fetchFolderContentThunk(folderMeta.id));
      dispatch(
        storageThunks.goToFolderThunk({
          name: folderMeta.plainName,
          id: folderMeta.id,
          uuid: folderMeta.uuid,
        }),
      );
      folderMeta.plainName && setTitle(`${folderMeta.plainName} - Internxt Drive`);
    } catch (error) {
      navigationService.push(AppView.FolderFileNotFound, { itemType: 'folder' });
      errorService.reportError(error);
    }
  };

  const showFile = async (fileUUID: string) => {
    try {
      const fileMeta = await fileService.getFile(fileUUID);
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(fileMeta));
      fileMeta.plainName && setTitle(`${fileMeta.plainName}.${fileMeta.type} - Internxt Drive`);
    } catch (error) {
      navigationService.push(AppView.FolderFileNotFound, { itemType: 'file' });
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
        <title>{title}</title>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}`} />
      </Helmet>
      <DriveExplorer
        title={<Breadcrumbs items={breadcrumbItems()} rootBreadcrumbItemDataCy="driveViewRootBreadcrumb" />}
        isLoading={isLoading}
        items={items}
      />
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
    items: sortedItems,
  };
})(DriveView);
