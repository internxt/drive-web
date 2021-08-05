import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import { storageActions, storageSelectors, StorageState } from '.';
import { getFilenameAndExt, renameFile } from '../../../lib/utils';
import folderService from '../../../services/folder.service';
import storageService from '../../../services/storage.service';
import tasksService from '../../../services/tasks.service';
import downloadService from '../../../services/download.service';
import _ from 'lodash';
import { selectorIsTeam } from '../team';
import { DriveFileData, DriveItemData, FolderPath, NotificationData } from '../../../models/interfaces';
import { FileActionTypes, FileStatusTypes } from '../../../models/enums';
import fileService from '../../../services/file.service';
import { UploadItemPayload } from '../../../services/storage.service/storage-upload.service';
import { MAX_ALLOWED_UPLOAD_SIZE } from '../../../lib/constants';
import { uiActions } from '../ui';
import { tasksActions } from '../tasks';

interface UploadItemsPayload {
  files: File[];
  parentFolderId?: number;
  folderPath?: string;
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

export const fetchRecentsThunk = createAsyncThunk(
  'storage/fetchRecents',
  async (payload: { limit: number }, { getState, dispatch }: any) => {
    const recents: DriveFileData[] = await fileService.fetchRecents(payload.limit);

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setRecents(recents));
  });
interface CreateFolderTreeStructurePayload {
  root: IRoot,
  currentFolderId: number
}
interface IRoot extends DirectoryEntry {
  childrenFiles: File[],
  childrenFolders: IRoot[],
  fullPathEdited: string
}

export const createFolderTreeStructureThunk = createAsyncThunk(
  'storage/createFolderStructure',
  async ({ root, currentFolderId }: CreateFolderTreeStructurePayload, { getState, dispatch }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());

    // Uploads the root folder
    folderService.createFolder(isTeam, currentFolderId, root.name).then((folderUploaded) => {
      // Once the root folder is uploaded it uploads the file children
      dispatch(uploadItemsThunk({ files: root.childrenFiles, parentFolderId: folderUploaded.id, folderPath: root.fullPathEdited }));
      // Once the root folder is uploaded upload folder children
      for (const subTreeRoot of root.childrenFolders) {
        dispatch(createFolderTreeStructureThunk({ root: subTreeRoot, currentFolderId: folderUploaded.id }));
      }
    });
  }
);

export const createFolderTreeStructureThunk2 = createAsyncThunk(
  'storage/createFolderStructure',
  async ({ root, currentFolderId }: CreateFolderTreeStructurePayload, { getState, dispatch }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const promiseArray = [];

    root.folderId = currentFolderId;
    const rootArray = [root];

    while (rootArray.length > 0) {
      root = rootArray.shift();
      // Uploads the root folder
      const folderUploaded = await folderService.createFolder(isTeam, root.folderId, root.name);

      // Once the root folder is uploaded it uploads the file children
      await dispatch(uploadItemsThunk({ files: root.childrenFiles, parentFolderId: folderUploaded.id, folderPath: root.fullPath }));
      // Once the root folder is uploaded upload folder children

      // Anti recursive
      for (const child of root.childrenFolders) {
        child.folderId = folderUploaded.id;
      }
      rootArray.push(...root.childrenFolders);

      /*
      for (const subTreeRoot of root.childrenFolders) {
        dispatch(createFolderTreeStructureThunk({ root: subTreeRoot, currentFolderId: folderUploaded.id }));
      }
      */
    }
  });

export const uploadItemsThunk = createAsyncThunk(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath }: UploadItemsPayload, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { namePath, items } = getState().storage;
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const filesToUpload: any[] = [];
    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = selectorIsTeam(getState());
    const notificationsUuids: string[] = [];

    if (showSizeWarning) {
      toast.warn('File too large.\nYou can only upload or download files of up to 1GB through the web app');
      return;
    }

    parentFolderId = parentFolderId || currentFolderId;

    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');

    // when a folder and its subdirectory is uploaded by drop, this.state.namePath keeps its value at the first level of the parent folder
    // so we need to add the relative folderPath (the path from parent folder uploaded to the level of the file being uploaded)
    // when uploading deeper files than the current level
    // TODO:
    /*
    if (files.folderPath) {
      if (relativePath !== '') {
        relativePath += '/' + files.folderPath;
      } else {
        // if is the first path level, DO NOT ADD a '/'
        relativePath += files.folderPath;
      }
    }
    */

    files.forEach(file => {
      const { filename, extension } = getFilenameAndExt(file.name);

      filesToUpload.push({ name: filename, size: file.size, type: extension, isLoading: true, content: file });
    });

    for (const file of filesToUpload) {
      const fileNameExists = storageService.name.checkFileNameExists(items, file.name, file.type);

      if (parentFolderId === currentFolderId) {
        //ADD THE FILE FOR UPLOADING TO THE CURRENTCOMMANDERITEMS
        if (fileNameExists) {
          const name: string = file.isFolder ?
            storageService.name.getNewFolderName(file.name, items) :
            storageService.name.getNewFileName(file.name, file.type, items);

          file.name = name;
          // File browser object don't allow to rename, so you have to create a new File object with the old one.
          file.content = renameFile(file.content, file.name);
        }
      }
      const type = file.type === undefined ? null : file.type;
      const notification: NotificationData = {
        uuid: Date.now().toString(),
        action: FileActionTypes.Upload,
        status: FileStatusTypes.Pending,
        name: file.name,
        isFolder: false,
        type
      };

      notificationsUuids.push(notification.uuid);

      dispatch(
        tasksActions.addNotification(notification)
      );
    }

    const uploadErrors: any[] = [];

    const uploadFile = async (notificationUuid, file, path, rateLimited, items) => {
      const updateProgressCallback = (progress) => {
        dispatch(tasksActions.updateNotification({
          uuid: notificationUuid,
          merge: {
            status: FileStatusTypes.Uploading,
            progress
          }
        }));
      };

      dispatch(tasksActions.updateNotification({
        uuid: notificationUuid,
        merge: {
          status: FileStatusTypes.Encrypting
        }
      }));

      await storageService.upload.uploadItem(user.email, file, path, isTeam, updateProgressCallback)
        .then(({ res, data }) => {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: { status: FileStatusTypes.Success }
          }));
          data.name = file.name;
          if (currentFolderId === parentFolderId) {
            dispatch(storageActions.addItems(data));
          }

          if (res.status === 402) {
            rateLimited = true;
            throw new Error('Rate limited');
          }
        }).catch((err) => {
          dispatch(tasksActions.updateNotification({
            uuid: notificationUuid,
            merge: { status: FileStatusTypes.Error }
          }));

          uploadErrors.push(err);
          console.log(err);
        }).finally(() => {
          if (rateLimited) {
            return new Error('Rate limited');
          }
        });

      return uploadErrors;
    };

    for (const [index, file] of filesToUpload.entries()) {

      const type = file.type === undefined ? null : file.type;
      const path = relativePath + '/' + file.name + '.' + type;

      const rateLimited = false;

      file.parentFolderId = parentFolderId;
      file.file = file;
      file.folderPath = folderPath;

      await tasksService.push(() => uploadFile(notificationsUuids[index], file, path, rateLimited, items));

      if (uploadErrors.length > 0) {
        throw new Error('There were some errors during upload');
      }
    }

    return null;
  });

export const downloadItemsThunk = createAsyncThunk(
  'storage/downloadItems',
  async (items: DriveItemData[], { getState, dispatch }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const notificationsUuids: string[] = [];

    items.forEach(item => {
      const uuid: string = Date.now().toString();
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

      await downloadService.downloadFile(item, isTeam, updateProgressCallback);

      dispatch(tasksActions.updateNotification({
        uuid: notificationsUuids[index],
        merge: {
          status: FileStatusTypes.Success
        }
      }));
    }
  });

export const fetchFolderContentThunk = createAsyncThunk(
  'storage/fetchFolderContent',
  async (folderId: number = -1, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { sortFunction, searchFunction } = getState().storage;
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const isTeam: boolean = selectorIsTeam(getState());

    folderId = ~folderId ? folderId : currentFolderId;

    const content = await folderService.fetchFolderContent(folderId, isTeam);

    dispatch(storageActions.clearSelectedItems());

    // Apply search function if is set
    if (searchFunction) {
      content.newCommanderFolders = content.newCommanderFolders.filter(searchFunction);
      content.newCommanderFiles = content.newCommanderFiles.filter(searchFunction);
    }
    // Apply sort function if is set
    if (sortFunction) {
      content.newCommanderFolders.sort(sortFunction);
      content.newCommanderFiles.sort(sortFunction);
    }

    dispatch(
      storageActions.setItems(_.concat(content.newCommanderFolders, content.newCommanderFiles))
    );
  }
);

export const deleteItemsThunk = createAsyncThunk(
  'storage/deleteItems',
  async (itemsToDelete: DriveItemData[], { getState, dispatch }: any) => {
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const isTeam: boolean = selectorIsTeam(getState());

    await storageService.deleteItems(itemsToDelete, isTeam);

    for (const item of itemsToDelete) {
      dispatch(storageActions.deleteItem(item));
    }

    //dispatch(fetchFolderContentThunk(currentFolderId));
  }
);

export const goToFolderThunk = createAsyncThunk(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }: any) => {
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    isInNamePath ?
      dispatch(storageActions.popNamePathUpTo(path)) :
      dispatch(storageActions.pushNamePath(path));

    dispatch(storageActions.setInfoItem(0));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));

    await dispatch(fetchFolderContentThunk(path.id));
  }
);

export const extraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, (state, action) => { })
    .addCase(uploadItemsThunk.fulfilled, (state, action) => { })
    .addCase(uploadItemsThunk.rejected, (state, action: any) => {
      // console.log('uploadItemsThunk rejected: ', action);
      // if (action.error.message === 'There were some errors during upload') {
      //   uploadErrors.forEach(uploadError => {
      //     toast.warn(uploadError.message);
      //   });
      // }

      toast.warn(action.error.message);
    });

  builder
    .addCase(downloadItemsThunk.pending, (state, action) => { })
    .addCase(downloadItemsThunk.fulfilled, (state, action) => { })
    .addCase(downloadItemsThunk.rejected, (state, action) => { });

  builder
    .addCase(createFolderTreeStructureThunk.pending, (state, action) => { })
    .addCase(createFolderTreeStructureThunk.fulfilled, (state, action) => { })
    .addCase(createFolderTreeStructureThunk.rejected, (state, action) => { });

  builder
    .addCase(fetchFolderContentThunk.pending, (state, action) => {
      state.isLoading = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state, action) => {
      state.isLoading = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state, action: any) => {
      state.isLoading = false;
      toast.warn(action.payload);
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
  createFolderTreeStructureThunk
};

export default thunks;