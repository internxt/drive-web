import { ChangeEvent, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { transformInputFilesToItems } from 'app/drive/services/folder.service/uploadFolderInput.service';
import { IRoot } from 'app/store/slices/storage/types';
import { notifyUploadFailed, uploadItemsToFolder } from '../helpers/uploadHelpers';

export const useDriveExplorerUpload = (currentFolderId: string) => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadItems = useCallback(
    (rootList: IRoot[], files: File[]) =>
      uploadItemsToFolder({ dispatch, currentFolderId, selectedWorkspace, maxUploadFileSize }, rootList, files),
    [dispatch, currentFolderId, selectedWorkspace, maxUploadFileSize],
  );

  const onUploadFileButtonClicked = useCallback(() => fileInputRef.current?.click(), []);
  const onUploadFolderButtonClicked = useCallback(() => folderInputRef.current?.click(), []);

  const onFileInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      await uploadItems([], Array.from(input.files));
    } finally {
      input.value = '';
    }
  };

  const onFolderInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      const { rootList, files } = transformInputFilesToItems(Array.from(input.files), currentFolderId);
      await uploadItems(rootList, files);
    } catch (error) {
      notifyUploadFailed(error);
    } finally {
      input.value = '';
    }
  };

  return {
    fileInputRef,
    folderInputRef,
    onUploadFileButtonClicked,
    onUploadFolderButtonClicked,
    onFileInputChanged,
    onFolderInputChanged,
    uploadItems,
  };
};
