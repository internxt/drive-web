import { ChangeEvent, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from 'app/drive/services/folder.service/uploadFolderInput.service';
import { UploadDestination, uploadItemsToFolder } from '../helpers/uploadHelpers';

export const useDriveExplorerUpload = (currentFolderId: string) => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const destination: UploadDestination = { dispatch, currentFolderId, selectedWorkspace, maxUploadFileSize };

  const onUploadFileButtonClicked = useCallback(() => fileInputRef.current?.click(), []);
  const onUploadFolderButtonClicked = useCallback(() => folderInputRef.current?.click(), []);

  const onFileInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      await uploadItemsToFolder(destination, [], Array.from(input.files));
    } finally {
      input.value = '';
    }
  };

  const onFolderInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      const filesJson = transformInputFilesToJSON(Array.from(input.files));
      const { rootList, rootFiles } = transformJsonFilesToItems(filesJson, currentFolderId);
      await uploadItemsToFolder(destination, rootList, rootFiles);
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
  };
};
