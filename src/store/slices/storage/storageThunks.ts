import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import async from 'async';

import { storageActions, StorageState } from '.';
import { getFilenameAndExt, renameFile } from '../../../lib/utils';
import fileService from '../../../services/file.service';
import folderService from '../../../services/folder.service';
import storageService from '../../../services/storage.service';
import { UploadItemPayload } from '../../../services/storage.service/storage-upload.service';
import { RejectedActionFromAsyncThunk } from '@reduxjs/toolkit/dist/matchers';
import queueFileLogger from '../../../services/queueFileLogger';
import { updateFileStatusLogger } from '../files';
import downloadService from '../../../services/download.service';
import { DriveFileData } from '../../../models/interfaces';
import fileLogger from '../../../services/fileLogger';
import { FileActionTypes, FileStatusTypes } from '../../../models/enums';

interface UploadItemsPayload {
  files: File[];
  parentFolderId?: number;
  folderPath?: string;
}

export const uploadItemsThunk = createAsyncThunk(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath }: UploadItemsPayload, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { namePath, currentFolderId, items } = getState().storage;
    const filesToUpload: any[] = [];
    const MAX_ALLOWED_UPLOAD_SIZE = 1024 * 1024 * 1024;
    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);

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
    /* if (files.folderPath) {
      if (relativePath !== '') {
        relativePath += '/' + files.folderPath;
      } else {
        // if is the first path level, DO NOT ADD a '/'
        relativePath += files.folderPath;
      }
    } */

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
      const path = relativePath + '/' + file.name + '.' + type;

      dispatch(updateFileStatusLogger({ action: 'upload', status: 'pending', filePath: path, isFolder: false }));

    }

    const uploadErrors: any[] = [];

    const uploadFile = async (file, path, rateLimited, items) => {

      await storageService.upload.uploadItem(user.email, file, path, dispatch)
        .then(({ res, data }) => {
          dispatch(updateFileStatusLogger({ action: 'upload', status: 'success', filePath: path, isFolder: false }));

          // if (parentFolderId === currentFolderId) {
          //const index = items.findIndex((obj) => obj.name === file.name);

          //   items[index].fileId = data.fileId;
          //   items[index].id = data.id;
          // }

          if (res.status === 402) {
            rateLimited = true;
            throw new Error('Rate limited');
          }
        }).catch((err) => {
          dispatch(updateFileStatusLogger({ action: 'upload', status: 'error', filePath: path, isFolder: false }));

          uploadErrors.push(err);
          console.log(err);
        }).finally(() => {
          if (rateLimited) {
            return new Error('Rate limited');
          }
        });
      return uploadErrors;
    };

    for (const file of filesToUpload) {

      const type = file.type === undefined ? null : file.type;
      const path = relativePath + '/' + file.name + '.' + type;

      const rateLimited = false;

      file.parentFolderId = parentFolderId;
      file.isTeam = !!user.teams;
      file.file = file;
      file.folderPath = folderPath;

      await queueFileLogger.push(() => uploadFile(file, path, rateLimited, items));

      if (uploadErrors.length > 0) {
        throw new Error('There were some errors during upload');
      }
    }

    return null;
  });

export const downloadItemsThunk = createAsyncThunk(
  'storage/downloadItems',
  async (items: DriveFileData[], { getState, dispatch }: any) => {
    const { namePath } = getState().storage;

    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');

    items.forEach((item) => {
      const path = relativePath + '/' + item.name + '.' + item.type;

      dispatch(updateFileStatusLogger({ action: 'download', status: 'pending', filePath: path, isFolder: false }));
    });
    for (const item of items) {
      const path = relativePath + '/' + item.name + '.' + item.type;

      await queueFileLogger.push(() => downloadService.downloadFile(item, path, dispatch));
    }
  });

export const fetchFolderContentThunk = createAsyncThunk(
  'storage/fetchFolderContent',
  async (folderId: number = -1, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { currentFolderId, sortFunction, searchFunction } = getState().storage;
    const isTeam: boolean = !!user.teams;

    folderId = ~folderId ? folderId : currentFolderId;

    await fileService.fetchWelcomeFile(isTeam);
    const content = await folderService.fetchFolderContent(folderId, isTeam);

    dispatch(
      storageActions.resetSelectedItems()
    );

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
      storageActions.setCurrentFolderId(content.contentFolders.id)
    );
    dispatch(
      storageActions.setItems(_.concat(content.newCommanderFolders, content.newCommanderFiles))
    );
    dispatch(
      storageActions.setCurrentFolderBucket(content.contentFolders.bucket)
    );

    dispatch(storageActions.pushNamePath({
      name: content.contentFolders.name,
      id: content.contentFolders.id,
      bucket: content.contentFolders.bucket,
      id_team: content.contentFolders.id_team
    }));
  }
);

export const deleteItemsThunk = createAsyncThunk(
  'storage/deleteItems',
  async (undefined, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { items, itemsToDeleteIds, currentFolderId } = getState().storage;
    const itemsToDelete: any[] = items.filter(item => itemsToDeleteIds.includes(item.id));

    console.log(itemsToDelete);
    await storageService.deleteItems(itemsToDelete);

    dispatch(fetchFolderContentThunk(currentFolderId));
  }
);

export const goToFolderThunk = createAsyncThunk(
  'storage/goToFolder',
  async (folderId: number, { getState, dispatch }: any) => {
    dispatch(storageActions.goToNamePath(folderId));
    dispatch(storageActions.setCurrentFolderId(folderId));
    await dispatch(fetchFolderContentThunk(folderId));
  }
);

export const extraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, (state, action) => { })
    .addCase(uploadItemsThunk.fulfilled, (state, action) => { })
    .addCase(uploadItemsThunk.rejected, (state, action: any) => {
      console.log('uploadItemsThunk rejected: ', action);
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
  uploadItemsThunk,
  downloadItemsThunk,
  fetchFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk
};

export default thunks;