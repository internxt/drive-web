import { useDispatch } from 'react-redux';
import { SharedItemAuthenticationData, UploadFolderData } from '../../../../tasks/types';
import { uploadFolderThunk } from '../storage.thunks/uploadFolderThunk';
import { uploadItemsThunk, uploadSharedItemsThunk } from '../storage.thunks/uploadItemsThunk';

export const useReduxActions = () => {
  const dispatch = useDispatch();

  const uploadFolder = (data: UploadFolderData & { taskId: string }) => {
    dispatch(
      uploadFolderThunk({
        root: data.folder,
        currentFolderId: data.parentFolderId,
        options: { taskId: data.taskId },
      }),
    );
  };

  const uploadItem = (data: { uploadFile: File; parentFolderId: string; taskId: string; fileType: string }) => {
    dispatch(
      uploadItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
      }),
    );
  };

  const uploadSharedItem = (data: {
    uploadFile: File;
    parentFolderId: string;
    taskId: string;
    fileType: string;
    sharedItemAuthenticationData: SharedItemAuthenticationData;
  }) => {
    dispatch(
      uploadSharedItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        currentFolderId: data.sharedItemAuthenticationData.currentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
        ownerUserAuthenticationData: data.sharedItemAuthenticationData.ownerUserAuthenticationData,
        isDeepFolder: data.sharedItemAuthenticationData.isDeepFolder,
      }),
    );
  };

  return { uploadFolder, uploadItem, uploadSharedItem };
};
