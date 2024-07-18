import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import navigationService from '../../core/services/navigation.service';
import { TaskNotification, TaskType } from '../types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

interface OpenItem {
  openItem: () => void;
}

type OpenItemProps = {
  notification: TaskNotification;
  showOpenFileError: () => void;
  showOpenFolderError: () => void;
};

export const useOpenItem = ({ notification, showOpenFileError, showOpenFolderError }: OpenItemProps): OpenItem => {
  const openItem = useCallback(() => {
    const { item, action } = notification;
    const isFolderUpload = action === TaskType.UploadFolder;
    const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);

    if (isFolderUpload) {
      if (notification?.itemUUID?.rootFolderUUID) {
        navigationService.pushFolder(
          notification?.itemUUID?.rootFolderUUID,
          selectedWorkspace?.workspaceUser.workspaceId,
        );
      } else {
        showOpenFolderError();
      }
    } else if (item) {
      if (notification?.itemUUID?.fileUUID) {
        navigationService.pushFile(notification?.itemUUID?.fileUUID, selectedWorkspace?.workspaceUser.workspaceId);
      } else {
        showOpenFileError();
      }
    }
  }, [notification]);

  return { openItem };
};
