import { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from '../../types';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { Helmet } from 'react-helmet-async';
import { uiActions } from 'app/store/slices/ui';
import newStorageService from 'app/drive/services/new-storage.service';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import fileService from 'app/drive/services/file.service';
import BreadcrumbsDriveView from 'app/shared/components/Breadcrumbs/Containers/BreadcrumbsDriveView';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  currentFolderId: number;
  dispatch: AppDispatch;
}

const DriveView = (props: DriveViewProps) => {
  const { dispatch, namePath, items, isLoading } = props;
  const pathname = navigationService.history.location.pathname;
  const [title, setTitle] = useState('Internxt Drive');

  useEffect(() => {
    dispatch(uiActions.setIsFileViewerOpen(false));

    const isFolderView = navigationService.isCurrentPath('folder');
    const isFileView = navigationService.isCurrentPath('file');
    const itemUuid = navigationService.getUuid();

    if (isFolderView && itemUuid) {
      goFolder(itemUuid);
    }

    if (isFileView && itemUuid) {
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

  const goFile = async (folderUuid) => {
    try {
      const fileMeta = await fileService.getFile(folderUuid);
      // Commented to fix getting unwanted content when opening a file preview,
      // may need to check this if you want to load the folder where a file is
      // located which has been accessed directly by URL (without navigating to it).
      // dispatch(storageThunks.fetchFolderContentThunk(fileMeta.folderId));
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(fileMeta));
      fileMeta.plainName && setTitle(`${fileMeta.plainName}.${fileMeta.type} - Internxt Drive`);
    } catch (error) {
      navigationService.push(AppView.FolderFileNotFound, { itemType: 'file' });
      errorService.reportError(error);
    }
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}`} />
      </Helmet>
      <DriveExplorer
        title={<BreadcrumbsDriveView namePath={namePath} dispatch={dispatch} />}
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
    currentFolderId,
    items: sortedItems,
  };
})(DriveView);
