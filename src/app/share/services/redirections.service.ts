import { History } from 'history';
import { t } from 'i18next';
import navigationService from '../../core/services/navigation.service';
import workspacesService from '../../core/services/workspace.service';
import { AppView } from '../../core/types';
import { AdvancedSharedItem } from '../types';
import shareService from './share.service';

/**
 * Handles access to a private shared folder, fetching its content and navigating accordingly.
 *
 * @param {Object} options - Options object containing parameters.
 * @param {string} options.folderUUID - The UUID of the folder to access.
 * @param {History} options.history - The history object for navigation.
 * @param {(sharedFolder: AdvancedSharedItem) => void} options.navigateToFolder - Function to navigate to the accessed folder.
 * @param {(errorMessage: string) => void} options.onError - Function to be executed if an error occurs during the process.
 */
const handlePrivateSharedFolderAccess = async ({
  folderUUID,
  history,
  navigateToFolder,
  onError,
  workspaceItemData,
}: {
  folderUUID: string;
  history: History;
  navigateToFolder: (sharedFolder: AdvancedSharedItem) => void;
  onError: (errorMessage: string) => void;
  workspaceItemData: { workspaceId?: string; teamId?: string };
}) => {
  let statusError: null | number = null;
  try {
    const sharedFolderData = await getPrivateSharedFolderAccessData(folderUUID, workspaceItemData?.workspaceId);
    navigateToFolder(sharedFolderData as AdvancedSharedItem);
  } catch (error: any) {
    let errorMessage;
    switch (error.status) {
      case 403:
        statusError = 403;
        navigationService.push(AppView.RequestAccess, { folderuuid: folderUUID });
        return;
      case 404:
        errorMessage = t('shared.errors.folderNotExists');
        break;
      default:
        errorMessage = t('shared.errors.generic');
        break;
    }
    navigationService.push(AppView.Shared);
    onError(errorMessage);
  } finally {
    if (statusError !== 403) {
      updateURL(history);
    }
  }
};

const getPrivateSharedFolderAccessData = async (folderUUID: string, workspaceId?: string) => {
  let response;
  if (workspaceId) {
    const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFiles(workspaceId, folderUUID, 0, 0);
    response = await promise;
  } else {
    response = await shareService.getSharedFolderContent(folderUUID, 'folders', '', 0, 0);
  }

  // TODO: ADD TO SDK TYPES THE NECESSARY FIELDS
  const sharedFolderData = { plainName: (response as any).name, uuid: folderUUID, isFolder: true };
  return sharedFolderData;
};

const updateURL = (history: History) => {
  const currentURL = history.location.pathname;
  const newURL = currentURL.replace(/folderuuid=valor&?/, '');
  history.replace(newURL);
};

export { handlePrivateSharedFolderAccess };
