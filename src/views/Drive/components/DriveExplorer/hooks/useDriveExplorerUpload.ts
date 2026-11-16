import { ChangeEvent, useCallback, useRef } from 'react';
import { transformInputFilesToItems } from 'app/drive/services/folder.service/uploadFolderInput.service';
import { IRoot } from 'app/store/slices/storage/types';
import { notifyUploadFailed } from 'app/upload/notifications';
import { useUploadItems } from 'app/upload/useUploadItems';

export const useDriveExplorerUpload = (currentFolderId: string) => {
  const { uploadItems: uploadToFolder } = useUploadItems();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadItems = useCallback(
    (rootList: IRoot[], files: File[]) =>
      uploadToFolder({ destinationFolderUuid: currentFolderId, roots: rootList, files }).catch(notifyUploadFailed),
    [uploadToFolder, currentFolderId],
  );

  const onUploadFileButtonClicked = useCallback(() => fileInputRef.current?.click(), []);
  const onUploadFolderButtonClicked = useCallback(() => folderInputRef.current?.click(), []);

  const onFileInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    const pickedFiles = Array.from(input.files);
    input.value = '';
    await uploadItems([], pickedFiles);
  };

  const onFolderInputChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files) return;

    const pickedFiles = Array.from(input.files);
    input.value = '';
    try {
      const { rootList, files } = transformInputFilesToItems(pickedFiles, currentFolderId);
      await uploadItems(rootList, files);
    } catch (error) {
      notifyUploadFailed(error);
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
