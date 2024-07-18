import { useCallback } from 'react';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import navigationService from '../../core/services/navigation.service';
import { TaskNotification, TaskType } from '../types';

interface OpenItem {
  openItem: () => void;
}

type OpenItemProps = {
  notification: TaskNotification;
  showOpenFileError: () => void;
  showOpenFolderError: () => void;
  selectedWorkspace?: WorkspaceData | null;
};

export const useOpenItem = ({
  notification,
  showOpenFileError,
  showOpenFolderError,
  selectedWorkspace,
}: OpenItemProps): OpenItem => {
  const openItem = useCallback(() => {
    const { item, action } = notification;
    const isFolderUpload = action === TaskType.UploadFolder;

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
