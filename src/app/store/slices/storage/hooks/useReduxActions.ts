import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import fileVersionsSelectors from 'app/store/slices/fileVersions/fileVersions.selectors';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import errorService from 'services/error.service';
import { SharedItemAuthenticationData, UploadFolderData } from '../../../../tasks/types';
import { uploadItemsThunk, uploadSharedItemsThunk } from '../storage.thunks/uploadItemsThunk';

export const useReduxActions = () => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);

  const uploadFolder = (data: UploadFolderData & { taskId: string }) => {
    uploadFoldersWithTracking({
      payload: [{ root: data.folder, currentFolderId: data.parentFolderId, options: { taskId: data.taskId } }],
      selectedWorkspace,
      dispatch,
      maxUploadFileSize,
    }).catch((error) => errorService.reportError(error));
  };

  const uploadItem = (data: { uploadFile: File; parentFolderId: string; taskId: string; fileType: string }) => {
    void dispatch(
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
    void dispatch(
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

  const uploadRetryItem = (data: { uploadFile: File; parentFolderId: string; taskId: string; fileType: string }) => {
    return dispatch(
      uploadItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
        isRetry: true,
      }),
    );
  };

  return { uploadFolder, uploadItem, uploadSharedItem, uploadRetryItem };
};
