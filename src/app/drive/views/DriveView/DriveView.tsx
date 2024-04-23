import { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import fileService from 'app/drive/services/file.service';
import newStorageService from 'app/drive/services/new-storage.service';
import BreadcrumbsDriveView from 'app/shared/components/Breadcrumbs/Containers/BreadcrumbsDriveView';
import { AppDispatch, RootState } from 'app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { Helmet } from 'react-helmet-async';
import useDriveNavigation from '../../../routes/hooks/Drive/useDrive';
import DriveExplorer from '../../components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from '../../types';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
  currentFolderId: number;
}

const DriveView = (props: DriveViewProps) => {
  const { dispatch, namePath, items, isLoading, currentFolderId } = props;
  const [title, setTitle] = useState('Internxt Drive');
  const { isFileView, isFolderView, itemUuid } = useDriveNavigation();

  useEffect(() => {
    dispatch(uiActions.setIsGlobalSearch(false));
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
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

  console.log({ currentFolderIdView: currentFolderId });
  const goFolder = async (folderUuid: string) => {
    try {
      const folderMeta = await newStorageService.getFolderMeta(folderUuid);

      // if (currentFolderId === folderMeta.id) {
      //   console.log('go to folder htunk in view called');
      dispatch(
        storageThunks.goToFolderThunk({
          name: folderMeta.plainName,
          id: folderMeta.id,
          uuid: folderMeta.uuid,
        }),
      );
      // }
      dispatch(storageActions.setForceLoading(false));
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

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}`} />
      </Helmet>
      <DriveExplorer title={<BreadcrumbsDriveView namePath={namePath} />} isLoading={isLoading} items={items} />
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
    isLoading: state.storage.loadingFolders[currentFolderId] ?? true,
    currentFolderId,
    items: sortedItems,
  };
})(DriveView);
