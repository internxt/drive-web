import { ChangeEvent, useCallback, useRef } from 'react';
import { transformInputFilesToItems } from 'app/drive/services/folder.service/uploadFolderInput.service';
import { IRoot } from 'app/store/slices/storage/types';
import { notifyUploadFailed } from 'app/upload/notifyUploadFailed';
import { useUploadItems } from 'app/upload/useUploadItems';

export const useDriveExplorerUpload = (currentFolderId: string) => {
  const { uploadItems } = useUploadItems();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadToCurrentFolder = useCallback(
    (rootList: IRoot[], files: File[]) =>
      uploadItems({ destinationFolderUuid: currentFolderId, roots: rootList, files }).catch(notifyUploadFailed),
    [uploadItems, currentFolderId],
  );

  const onUploadFileButtonClicked = useCallback(() => fileInputRef.current?.click(), []);
  const onUploadFolderButtonClicked = useCallback(() => folderInputRef.current?.click(), []);

  const onFileInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      await uploadToCurrentFolder([], Array.from(input.files));
    } finally {
      input.value = '';
    }
  };

  const onFolderInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    try {
      const { rootList, files } = transformInputFilesToItems(Array.from(input.files), currentFolderId);
      await uploadToCurrentFolder(rootList, files);
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
    uploadToCurrentFolder,
  };
};
