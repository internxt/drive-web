import { useDispatch } from 'react-redux';
import { downloadItemsAsZipThunk, downloadItemsThunk } from '../storage.thunks/downloadItemsThunk';
import { createFilesIterator, createFoldersIterator } from '../../../../drive/services/folder.service';
import { uploadFolderThunk } from '../storage.thunks/uploadFolderThunk';
import { uploadItemsThunk } from '../storage.thunks/uploadItemsThunk';
import { DriveItemData } from '../../../../drive/types';
import { UploadFolderData } from '../../../../tasks/types';

export const useReduxActions = () => {
  const dispatch = useDispatch();

  const downloadItemsAsZip = (items: DriveItemData[], existingTaskId: string) => {
    dispatch(
      downloadItemsAsZipThunk({
        items,
        existingTaskId,
        fileIterator: createFilesIterator,
        folderIterator: createFoldersIterator,
      }),
    );
  };

  const downloadItems = (item: DriveItemData, existingTaskId: string) => {
    dispatch(downloadItemsThunk([{ ...item, taskId: existingTaskId }]));
  };

  const uploadFolder = (data: UploadFolderData & { taskId: string }) => {
    dispatch(
      uploadFolderThunk({
        root: data.folder,
        currentFolderId: data.parentFolderId,
        options: { taskId: data.taskId },
      }),
    );
  };

  const uploadItem = (data: { uploadFile: File; parentFolderId: number; taskId: string; fileType: string }) => {
    dispatch(
      uploadItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
      }),
    );
  };

  return { downloadItemsAsZip, downloadItems, uploadFolder, uploadItem };
};
