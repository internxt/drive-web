import { useCallback } from 'react';
import navigationService from '../../core/services/navigation.service';
import { TaskNotification, TaskType } from '../types';

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

    if (isFolderUpload) {
      if (notification?.itemUUID?.rootFolderUUID) {
        navigationService.pushFolder(notification?.itemUUID?.rootFolderUUID);
      } else {
        showOpenFolderError();
      }
    } else if (item) {
      if (notification?.itemUUID?.fileUUID) {
        navigationService.pushFile(notification?.itemUUID?.fileUUID);
      } else {
        showOpenFileError();
      }
    }
  }, [notification]);

  return { openItem };
};
