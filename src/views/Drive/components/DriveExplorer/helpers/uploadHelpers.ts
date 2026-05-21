import { ChangeEvent } from 'react';
import { AppDispatch } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { handleRepeatedUploadingFiles } from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from 'app/drive/services/folder.service/uploadFolderInput.service';
import { IRoot } from 'app/store/slices/storage/types';

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
      const { unrepeatedItems, repeatedItems, existingItems } = await handleRepeatedUploadingFiles(
        Array.from(files),
        currentFolderId,
      );

      if (repeatedItems.length > 0) {
        dispatch(
          uiActions.setIsNameCollisionDialogOpen({
            open: true,
            info: {
              groups: [
                {
                  destinationUuid: currentFolderId,
                  duplicatedItems: repeatedItems as any,
                  existingItems: existingItems as any,
                  unrepeatedItems: unrepeatedItems as any,
                },
              ],
              operation: 'upload',
            },
          }),
        );
      }

      if (unrepeatedItems.length > 0) {
        dispatch(
          storageThunks.uploadItemsThunk({
            files: unrepeatedItems as File[],
            parentFolderId: currentFolderId,
          }),
        ).then(() => {
          onFileUploaded?.();
          dispatch(fetchSortedFolderContentThunk(currentFolderId));
        });
      }

      resetFileInput?.();
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
    resetFolderInput?.();
  };
};
