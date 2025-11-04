import { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';

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
import useDriveNavigation from 'app/routes/hooks/Drive/useDrive';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import DriveExplorer from 'views/Drive/components/DriveExplorer/DriveExplorer';
import { DriveItemData, FolderPath } from 'app/drive/types';
import { workspacesActions, workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import localStorageService from 'app/core/services/local-storage.service';
import { STORAGE_KEYS } from 'app/core/services/storage-keys';
import workspacesService from 'app/core/services/workspace.service';
import { useHistory } from 'react-router-dom';
import envService from 'app/core/services/env.service';

export interface DriveViewProps {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

const DriveView = (props: DriveViewProps) => {
  const { dispatch, namePath, items, isLoading } = props;
  const [title, setTitle] = useState('Internxt Drive');
  const { isFileView, isFolderView, itemUuid, workspaceUuid, isOverviewSubsection } = useDriveNavigation();
  const credentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);
  const fileViewer = useAppSelector((state: RootState) => state.ui.fileViewerItem);
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const [tokenHeader, setTokenHeader] = useState<string>('');
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const isSelectedWorkspace = selectedWorkspace?.workspace.id === workspaceUuid;
  const history = useHistory();

  useEffect(() => {
    dispatch(uiActions.setIsGlobalSearch(false));
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
  }, []);

  useEffect(() => {
    if (fileViewer) {
      setTitle(`${fileViewer?.plainName ?? fileViewer?.name} - Internxt Drive`);
    }
  }, [fileViewer]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (!isFileView && !isFolderView && !isOverviewSubsection) {
        navigationService.setWorkspaceFromParams(workspaceThunks, dispatch, false);
      }
    };
    globalThis.addEventListener('popstate', handlePopState);

    return () => {
      globalThis.removeEventListener('popstate', handlePopState);
    };
  }, [history]);

  useEffect(() => {
    if (!isFileView && !isFolderView && workspaceUuid && !isSelectedWorkspace && !isOverviewSubsection) {
      setWorkspaceWithUrl(workspaceUuid);
    }

    if (!workspaceUuid && isSelectedWorkspace) {
      setPersonalWithUrl();
    }
  }, [workspaceUuid, workspaces, isFileView, isFolderView]);

  useEffect(() => {
    dispatch(uiActions.setIsFileViewerOpen(false));
    if (isFolderView && itemUuid && workspaceUuid && !isSelectedWorkspace) {
      setWorkspaceWithUrl(workspaceUuid);
    } else if (isFolderView && itemUuid && !workspaceUuid) {
      setPersonalWithUrl();
      goFolder(itemUuid);
    } else if (isFolderView && itemUuid) {
      goFolder(itemUuid, tokenHeader);
    }

    if (isFileView && itemUuid && workspaceUuid && !isSelectedWorkspace) {
      setWorkspaceWithUrl(workspaceUuid);
    } else if (isFileView && itemUuid && !workspaceUuid) {
      setPersonalWithUrl();
      showFile(itemUuid);
    } else if (isFileView && itemUuid) {
      showFile(itemUuid, tokenHeader);
    }
  }, [isFileView, isFolderView, itemUuid, credentials, workspaceUuid]);

  const setWorkspaceWithUrl = async (workspaceId: string) => {
    try {
      const credentials = await workspacesService.getWorkspaceCredentials(workspaceId);
      const workspace = workspaces.find((workspace) => workspace.workspace.id === workspaceUuid);
      dispatch(workspacesActions.setCredentials(credentials));
      localStorageService.set(STORAGE_KEYS.WORKSPACE_CREDENTIALS, JSON.stringify(credentials));
      dispatch(workspacesActions.setSelectedWorkspace(workspace ?? null));
      localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(workspace));
      setTokenHeader(credentials.tokenHeader);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const setPersonalWithUrl = () => {
    dispatch(workspacesActions.setCredentials(null));
    dispatch(workspacesActions.setSelectedWorkspace(null));
    localStorageService.set(STORAGE_KEYS.WORKSPACE_CREDENTIALS, 'null');
    localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, 'null');
  };

  const goFolder = async (folderUuid: string, workspacesToken?: string) => {
    try {
      const folderMeta = await newStorageService.getFolderMeta(folderUuid, workspacesToken);

      dispatch(
        storageThunks.goToFolderThunk({
          name: folderMeta.plainName,
          uuid: folderMeta.uuid,
        }),
      );

      dispatch(storageActions.setForceLoading(false));
      folderMeta.plainName && setTitle(`${folderMeta.plainName} - Internxt Drive`);
    } catch (error) {
      navigationService.push(AppView.FolderFileNotFound, { itemType: 'folder' });
      errorService.reportError(error);
    }
  };

  const showFile = async (fileUUID: string, workspacesToken?: string) => {
    try {
      const fileMeta = await fileService.getFile(fileUUID, workspacesToken);
      dispatch(uiActions.setIsFileViewerOpen(true));
      /*
       * PreviewFileItem and FileMeta properties do not match, so we need to manually map them.
       * We should find a better way to do this, probably by improving and refactoring the PreviewFileItem type,
       * so we only have to map the properties that are different, if any.
       */
      dispatch(
        uiActions.setFileViewerItem({
          name: fileMeta.name,
          bucket: fileMeta.bucket,
          size: Number(fileMeta.size),
          type: fileMeta.type,
          created_at: fileMeta.createdAt,
          createdAt: fileMeta.createdAt,
          currentThumbnail: null,
          deleted: false,
          deletedAt: null,
          encrypt_version: fileMeta.encryptVersion,
          fileId: fileMeta.fileId,
          folder_id: fileMeta.folderId,
          folderId: fileMeta.folderId,
          id: fileMeta.id,
          folderUuid: fileMeta.folderUuid,
          plainName: fileMeta.plainName,
          plain_name: fileMeta.plainName,
          status: fileMeta.status,
          uuid: fileMeta.uuid,
          thumbnails: [],
          updatedAt: fileMeta.updatedAt,
        }),
      );
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
        <link rel="canonical" href={`${envService.getVariable('hostname')}`} />
      </Helmet>
      <DriveExplorer title={<BreadcrumbsDriveView namePath={namePath} />} isLoading={isLoading} items={items} />
    </>
  );
};

const sortFoldersFirst = (items: DriveItemData[]) =>
  [...items].sort((a, b) => Number(b?.isFolder ?? false) - Number(a?.isFolder ?? false));

export default connect((state: RootState) => {
  const currentFolderId = storageSelectors.currentFolderId(state);
  const items = storageSelectors.filteredItems(state)(storageSelectors.currentFolderItems(state));
  const sortedItems = sortFoldersFirst(items);

  return {
    namePath: state.storage.namePath,
    isLoading: state.storage.loadingFolders[currentFolderId] ?? true,
    currentFolderId,
    items: sortedItems,
    selectedWorkpace: state.workspaces.selectedWorkspace,
  };
})(DriveView);
