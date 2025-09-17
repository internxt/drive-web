import { ChangeEvent } from 'react';
import { AppDispatch } from '../../../../store';
import { uiActions } from '../../../../store/slices/ui';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from '../../../../store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { handleRepeatedUploadingFiles } from '../../../../store/slices/storage/storage.thunks/renameItemsThunk';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from '../../../services/folder.service/uploadFolderInput.service';
import { IRoot } from '../../../../store/slices/storage/types';
import errorService from '../../../../core/services/error.service';

export const UPLOAD_ITEMS_LIMIT = 3000;

export const createFileUploadHandler = (
  dispatch: AppDispatch,
  currentFolderId: string,
  onFileUploaded?: () => void,
  resetFileInput?: () => void,
) => {
  return async (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const files = target.files;

    if (!files) return;

    if (files.length <= UPLOAD_ITEMS_LIMIT) {
      const unrepeatedUploadedFiles = (await handleRepeatedUploadingFiles(
        Array.from(files),
        dispatch,
        currentFolderId,
      )) as File[];

      dispatch(
        storageThunks.uploadItemsThunk({
          files: Array.from(unrepeatedUploadedFiles),
          parentFolderId: currentFolderId,
        }),
      ).then(() => {
        onFileUploaded && onFileUploaded();
        dispatch(fetchSortedFolderContentThunk(currentFolderId));
      });

      resetFileInput && resetFileInput();
    } else {
      dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
    }
  };
};

export const createFolderUploadHandler = <T>(
  currentFolderId: string,
  props: T,
  uploadItems: (props: T, rootList: IRoot[], rootFiles: File[]) => Promise<void>,
  resetFolderInput?: () => void,
) => {
  return async (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const files = target.files;

    if (!files) return;

    const filesArray = Array.from(files);
    const filesJson = transformInputFilesToJSON(filesArray);
    const { rootList, rootFiles } = transformJsonFilesToItems(filesJson, currentFolderId);

    await uploadItems(props, rootList, rootFiles);
    resetFolderInput && resetFolderInput();
  };
};
