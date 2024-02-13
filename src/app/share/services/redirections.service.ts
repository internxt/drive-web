import { t } from 'i18next';
import navigationService from '../../core/services/navigation.service';
import { AppView } from '../../core/types';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import shareService from './share.service';
import { History } from 'history';
import { AdvancedSharedItem } from '../types';

/**
 * Handles access to a private shared folder, fetching its content and navigating accordingly.
 *
 * @param {Object} options - Options object containing parameters.
 * @param {string} options.folderUUID - The UUID of the folder to access.
 * @param {History} options.history - The history object for navigation.
 * @param {(sharedFolder: AdvancedSharedItem) => void} options.navigateToFolder - Function to navigate to the accessed folder.
 * @param {() => void} options.onError - Function to be executed if an error occurs during the process.
 */
const handlePrivateSharedFolderAccess = ({
  folderUUID,
  history,
  navigateToFolder,
  onError,
}: {
  folderUUID: string;
  history: History;
  navigateToFolder: (sharedFolder: AdvancedSharedItem) => void;
  onError: () => void;
}) => {
  let statusError: null | number = null;

  if (folderUUID)
    shareService
      .getSharedFolderContent(folderUUID, 'folders', '', 0, 15)
      .then((item) => {
        // TODO: Check getSharedFolderContent response types and add it to SDK
        const shareItem = { plainName: (item as any).name, uuid: folderUUID, isFolder: true };
        navigateToFolder(shareItem as AdvancedSharedItem);
      })
      .catch((error) => {
        if (error.status === 403) {
          statusError = 403;
          navigationService.push(AppView.RequestAccess, { folderuuid: folderUUID });
          return;
        } else if (error.status === 404) {
          notificationsService.show({ text: t('shared.errors.folderNotExists'), type: ToastType.Error });
        } else {
          notificationsService.show({ text: t('shared.errors.generic'), type: ToastType.Error });
        }
        navigationService.push(AppView.Shared);
        onError();
      })
      .finally(() => {
        if (statusError !== 403) {
          updateURL(history);
        }
      });
};

const updateURL = (history: History) => {
  const currentURL = history.location.pathname;
  const newURL = currentURL.replace(/folderuuid=valor&?/, '');
  history.replace(newURL);
};

export { handlePrivateSharedFolderAccess };
