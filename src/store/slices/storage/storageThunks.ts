import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import _ from 'lodash';

import { storageActions, storageSelectors, StorageState } from '.';
import { getFilenameAndExt } from '../../../lib/utils';
import folderService from '../../../services/folder.service';
import storageService from '../../../services/storage.service';
import downloadService from '../../../services/download.service';
import { selectorIsTeam } from '../team';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, FolderPath, NotificationData } from '../../../models/interfaces';
import { FileActionTypes, FileStatusTypes } from '../../../models/enums';
import fileService from '../../../services/file.service';
import { MAX_ALLOWED_UPLOAD_SIZE } from '../../../lib/constants';
import { uiActions } from '../ui';
import { tasksActions } from '../tasks';
import notify, { ToastType } from '../../../components/Notifications';
import i18n from '../../../services/i18n.service';
import { RootState } from '../..';

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  folderPath: string;
  options?: {
    withNotifications?: boolean,
    onSuccess?: () => void
  }
}

interface CreateFolderTreeStructurePayload {
  root: IRoot,
  currentFolderId: number,
  options?: {
    withNotification?: boolean;
    onSuccess?: () => void;
  }
}
interface IRoot extends DirectoryEntry {
  folderId?: number;
  childrenFiles: File[],
  childrenFolders: IRoot[],
  fullPathEdited: string
}

export const initializeThunk = createAsyncThunk(
  'storage/initialize',
  async (payload: void, { getState, dispatch }: any) => {
    dispatch(resetNamePathThunk());
  });

export const resetNamePathThunk = createAsyncThunk(
  'storage/resetNamePath',
  async (payload: void, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const rootFolderId: number = storageSelectors.rootFolderId(getState());

    dispatch(storageActions.resetNamePath());

    if (user) {
      dispatch(storageActions.pushNamePath({
        id: rootFolderId,
        name: 'Drive'
      }));
    }
  });

export const fetchRecentsThunk = createAsyncThunk<void, { limit: number }, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: { limit: number }, { getState, dispatch }) => {
    const recents: DriveItemData[] = await fileService.fetchRecents(payload.limit) as DriveItemData[];

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setRecents(recents));
  });

export const createFolderTreeStructureThunk = createAsyncThunk<void, CreateFolderTreeStructurePayload, { state: RootState }>(
  'storage/createFolderStructure',
  async ({ root, currentFolderId, options }, { getState, dispatch, requestId }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const levels = [root];
    const notification: NotificationData = {
      uuid: requestId,
      action: FileActionTypes.UploadFolder,
      status: FileStatusTypes.Pending,
      name: root.name,
      isFolder: true
    };

    options = Object.assign({ withNotification: true }, options || {});

    if (options?.withNotification) {
      dispatch(tasksActions.addNotification(notification));
    }

    try {
      root.folderId = currentFolderId;

      while (levels.length > 0) {
        const level: IRoot = levels.shift() as IRoot;
        const folderUploaded = await folderService.createFolder(isTeam, level.folderId, level.name);

        await dispatch(uploadItemsThunk({
          files: level.childrenFiles || [],
          parentFolderId: folderUploaded.id,
          folderPath: level.fullPathEdited,
          options: { withNotifications: false }
        }));

        for (const child of level.childrenFolders) {
          child.folderId = folderUploaded.id;
        }

        levels.push(...level.childrenFolders);
      }

      if (options?.withNotification) {
        dispatch(tasksActions.updateNotification({
          uuid: notification.uuid,
          merge: {
            status: FileStatusTypes.Success
          }
        }));
      }

      options.onSuccess?.();
    } catch (error) {
      options?.withNotification && dispatch(tasksActions.updateNotification({
        uuid: notification.uuid,
        merge: {
          status: FileStatusTypes.Error
        }
      }));

      throw error;
    }
  }
);

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath, options }: UploadItemsPayload, { getState, dispatch, requestId }: any) => {
    const { user } = getState().user;
    const { namePath, items } = getState().storage;

    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = selectorIsTeam(getState());
    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');
    const filesToUpload: any[] = [];
    const uploadErrors: any[] = [];
    const notificationsUuids: string[] = [];

    options = Object.assign({ withNotifications: true }, options || {});

    if (showSizeWarning) {
      toast.warn('File too large.\nYou can only upload or download files of up to 1GB through the web app');
      return;
    }

    for (const file of files) {
      const { filename, extension } = getFilenameAndExt(file.name);
      const parentFolderContent = await folderService.fetchFolderContent(parentFolderId, isTeam);
      const [filenameExist, filenameIndex, finalFilename] = storageService.name.checkFileNameExists(parentFolderContent.newCommanderFiles, filename, extension);
      const fileContent = file;
      const notification: NotificationData = {
        uuid: requestId,
        action: FileActionTypes.Upload,
        status: FileStatusTypes.Pending,
        name: finalFilename,
        isFolder: false,
        type: extension
      };

      filesToUpload.push({ name: finalFilename, size: file.size, type: extension, isLoading: true, content: fileContent });

      if (options?.withNotifications) {
        dispatch(tasksActions.addNotification(notification));
      }
      notificationsUuids.push(notification.uuid);
    }

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      const type = file.type === undefined ? null : file.type;
      const path = relativePath + '/' + file.name + '.' + type;
      const notificationUuid = notificationsUuids[index];
      const updateProgressCallback = (progress) => {
        if (options?.withNotifications) {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: {
              status: FileStatusTypes.Uploading,
              progress
            }
          }));
        }
      };
      const task = async () => {
        if (options?.withNotifications) {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: {
              status: FileStatusTypes.Encrypting
            }
          }));
        }

        const { res, data } = await storageService.upload.uploadItem(user.email, file, path, isTeam, updateProgressCallback);

        if (res.status === 402) {
          throw new Error('Rate limited');
        }
      };

      file.parentFolderId = parentFolderId;
      file.file = file;
      file.folderPath = folderPath;

      await task()
        .then(() => {
          if (options?.withNotifications) {
            dispatch(tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: { status: FileStatusTypes.Success }
            }));
          }
        })
        .catch(error => {
          if (options?.withNotifications) {
            dispatch(tasksActions.updateNotification({
              uuid: notificationUuid,
              merge: { status: FileStatusTypes.Error }
            }));
          }

          uploadErrors.push(error);
          console.error(error);
        });
    }

    options.onSuccess?.();

    if (uploadErrors.length > 0) {
      throw new Error('There were some errors during upload');
    }
  });

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { getState, dispatch, requestId, rejectWithValue }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const notificationsUuids: string[] = [];
    const errors: any[] = [];

    items.forEach((item, i) => {
      const uuid: string = `${requestId}-${i}`;
      const notification: NotificationData = {
        uuid,
        action: FileActionTypes.Download,
        status: FileStatusTypes.Pending,
        name: item.name,
        type: item.type,
        isFolder: item.isFolder
      };

      notificationsUuids.push(uuid);
      dispatch(tasksActions.addNotification(notification));
    });

    for (const [index, item] of items.entries()) {
      try {
        const updateProgressCallback = (progress: number) => dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: {
            status: FileStatusTypes.Downloading,
            progress
          }
        }));

        dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: { status: FileStatusTypes.Decrypting }
        }));

        await downloadService.downloadFile(item, isTeam, updateProgressCallback).then(() => {
          dispatch(tasksActions.updateNotification({
            uuid: notificationsUuids[index],
            merge: {
              status: FileStatusTypes.Success
            }
          }));
        });
      } catch (error) {
        dispatch(tasksActions.updateNotification({
          uuid: notificationsUuids[index],
          merge: {
            status: FileStatusTypes.Error
          }
        }));

        errors.push({ ...error });
      }
    }

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  });

export const fetchFolderContentThunk = createAsyncThunk(
  'storage/fetchFolderContent',
  async (folderId: number = -1, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const isTeam: boolean = selectorIsTeam(getState());

    folderId = ~folderId ? folderId : currentFolderId;

    const content = await folderService.fetchFolderContent(folderId, isTeam);

    dispatch(storageActions.clearSelectedItems());

    dispatch(
      storageActions.setItems(_.concat(content.newCommanderFolders, content.newCommanderFiles))
    );
  }
);

export const deleteItemsThunk = createAsyncThunk(
  'storage/deleteItems',
  async (itemsToDelete: DriveItemData[], { getState, dispatch }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());

    await storageService.deleteItems(itemsToDelete, isTeam);
  }
);

export const goToFolderThunk = createAsyncThunk(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }: any) => {
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    await dispatch(fetchFolderContentThunk(path.id)).unwrap();

    isInNamePath ?
      dispatch(storageActions.popNamePathUpTo(path)) :
      dispatch(storageActions.pushNamePath(path));

    dispatch(storageActions.setInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
  }
);

export const updateItemMetadataThunk = createAsyncThunk<void, { item: DriveItemData, metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload }, { state: RootState }>(
  'storage/updateItemMetadata',
  async (payload: { item: DriveItemData, metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload }, { getState, dispatch }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const { item, metadata } = payload;

    item.isFolder ?
      await folderService.updateMetaData(item.id, metadata, isTeam) :
      await fileService.updateMetaData(item.fileId, metadata, isTeam);

    dispatch(storageActions.patchItem({
      id: item.id,
      isFolder: item.isFolder,
      patch: {
        name: payload.metadata.metadata.itemName
      }
    }));
  });

export const extraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, (state, action) => { })
    .addCase(uploadItemsThunk.fulfilled, (state, action) => { })
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      notify(
        i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
        ToastType.Error
      );
    });

  builder
    .addCase(downloadItemsThunk.pending, (state, action) => { })
    .addCase(downloadItemsThunk.fulfilled, (state, action) => { })
    .addCase(downloadItemsThunk.rejected, (state, action: any) => {
      if (action.payload && action.payload.length > 0) {
        notify(i18n.get('error.downloadingItems'), ToastType.Error);
      } else {
        notify(
          i18n.get('error.downloadingFile', { reason: action.error.message || '' }),
          ToastType.Error
        );
      }
    });

  builder
    .addCase(createFolderTreeStructureThunk.pending, (state, action) => { })
    .addCase(createFolderTreeStructureThunk.fulfilled, (state, action) => { })
    .addCase(createFolderTreeStructureThunk.rejected, (state, action) => {
      let errorMessage = i18n.get('error.uploadingFolder');

      if (action.error.message?.includes('already exists')) {
        errorMessage = i18n.get('error.folderAlreadyExists');
      } else {
        errorMessage = action.error.message || action.error + '';
      }

      notify(errorMessage, ToastType.Error);
    });

  builder
    .addCase(fetchFolderContentThunk.pending, (state, action) => {
      state.isLoading = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state, action) => {
      state.isLoading = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state, action) => {
      state.isLoading = false;
      notify(
        i18n.get('error.fetchingFolderContent'),
        ToastType.Error
      );
    });

  builder
    .addCase(fetchRecentsThunk.pending, (state, action) => {
      state.isLoadingRecents = true;
    })
    .addCase(fetchRecentsThunk.fulfilled, (state, action) => {
      state.isLoadingRecents = false;
    })
    .addCase(fetchRecentsThunk.rejected, (state, action) => {
      state.isLoadingRecents = false;
    });

  builder
    .addCase(deleteItemsThunk.pending, (state, action) => {
      state.isDeletingItems = true;
    })
    .addCase(deleteItemsThunk.fulfilled, (state, action) => {
      state.isDeletingItems = false;
    })
    .addCase(deleteItemsThunk.rejected, (state, action) => {
      state.isDeletingItems = false;
    });

  builder
    .addCase(goToFolderThunk.pending, (state, action) => { })
    .addCase(goToFolderThunk.fulfilled, (state, action) => { })
    .addCase(goToFolderThunk.rejected, (state, action) => { });

  builder
    .addCase(updateItemMetadataThunk.pending, (state, action) => { })
    .addCase(updateItemMetadataThunk.fulfilled, (state, action) => { })
    .addCase(updateItemMetadataThunk.rejected, (state, action) => {
      const errorMessage = (action.error?.message || '').includes('this name exists') ?
        i18n.get('error.fileAlreadyExists') :
        i18n.get('error.changingName');

      notify(errorMessage, ToastType.Error);
    });
};

const thunks = {
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  downloadItemsThunk,
  fetchFolderContentThunk,
  fetchRecentsThunk,
  deleteItemsThunk,
  goToFolderThunk,
  createFolderTreeStructureThunk,
  updateItemMetadataThunk
};

export default thunks;