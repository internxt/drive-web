import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import { storageActions, storageSelectors, StorageState } from '.';
import { getFilenameAndExt, renameFile } from '../../../lib/utils';
import folderService from '../../../services/folder.service';
import storageService from '../../../services/storage.service';
import queueFileLogger from '../../../services/queueFileLogger';
import { updateFileStatusLogger } from '../files';
import downloadService from '../../../services/download.service';
import _ from 'lodash';
import { selectorIsTeam } from '../team';
import { DriveFileData, DriveItemData, FolderPath } from '../../../models/interfaces';
import { FileActionTypes, FileStatusTypes } from '../../../models/enums';
import { UploadItemPayload } from '../../../services/storage.service/storage-upload.service';
import { getAllItems } from '../../../services/dragAndDrop.service';

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

  interface CreateFolderTreeStructurePayload {
    root: IRoot,
    currentFolderId: number
  }
interface IRoot extends DirectoryEntry {
  childrenFiles: File[],
  childrenFolders: IRoot[]
}

export const createFolderTreeStructureThunk = createAsyncThunk(
  'storage/createFolderStructure',
  async ({ root, currentFolderId }: CreateFolderTreeStructurePayload, { getState, dispatch }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());

    // Uploads the root folder
    folderService.createFolder(isTeam, currentFolderId, root.name).then((folderUploaded) => {
      // Once the root folder is uploaded it uploads the file children
      dispatch(uploadItemsThunk({ files: root.childrenFiles, parentFolderId: folderUploaded.id, folderPath: root.fullPath }));
      // Once the root folder is uploaded upload folder children
      for (const subTreeRoot of root.childrenFolders) {
        dispatch(createFolderTreeStructureThunk({ root: subTreeRoot, currentFolderId: folderUploaded.id }));
      }
    });
  }
);

export const uploadItemsThunk = createAsyncThunk(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath }: UploadItemsPayload, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { namePath, items } = getState().storage;
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const filesToUpload: any[] = [];
    const MAX_ALLOWED_UPLOAD_SIZE = 1024 * 1024 * 1024;
    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = selectorIsTeam(getState());

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

      dispatch(updateFileStatusLogger({ action: FileActionTypes.Upload, status: FileStatusTypes.Pending, filePath: path, isFolder: false, type }));

    }

    const uploadErrors: any[] = [];

    const uploadFile = async (file, path, rateLimited, items) => {
      const { filename, extension } = getFilenameAndExt(file.name);

      await storageService.upload.uploadItem(user.email, file, path, dispatch, isTeam)
        .then(({ res, data }) => {
          dispatch(updateFileStatusLogger({ action: FileActionTypes.Upload, status: FileStatusTypes.Success, filePath: path, isFolder: false, type: extension }));

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
          dispatch(updateFileStatusLogger({ action: FileActionTypes.Upload, status: FileStatusTypes.Error, filePath: path, isFolder: false, type: extension }));

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
    const isTeam: boolean = selectorIsTeam(getState());
    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');

    for (const item of items) {
      const path = relativePath + '/' + item.name + '.' + item.type;

      await queueFileLogger.push(() => downloadService.downloadFile(item, path, dispatch, isTeam));
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

    dispatch(fetchFolderContentThunk(currentFolderId));
  }
);

export const goToFolderThunk = createAsyncThunk(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }: any) => {
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    isInNamePath ?
      dispatch(storageActions.popNamePathUpTo(path)) :
      dispatch(storageActions.pushNamePath(path));
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
    .addCase(createFolderTreeStructureThunk.rejected, (state, action) => {
      // console.log('TREE STRUCTURE REJECTED: ', action);
    });

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
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  downloadItemsThunk,
  fetchFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  createFolderTreeStructureThunk
};

export default thunks;