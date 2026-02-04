import { Trash, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { MenuItemType } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import fileVersionService from '../services/fileVersion.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { RootState } from 'app/store';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { FileVersion } from '@internxt/sdk/dist/drive/storage/types';
import dateService from 'services/date.service';
import { items as itemsUtils } from '@internxt/lib';

interface UseVersionItemActionsParams {
  version: FileVersion;
  onDropdownClose: () => void;
}

export const useVersionItemActions = ({ version, onDropdownClose }: UseVersionItemActionsParams) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useAppSelector(workspacesSelectors.getWorkspaceCredentials);

  const handleRestoreClick = () => {
    onDropdownClose();
    dispatch(uiActions.setVersionToRestore(version));
    dispatch(uiActions.setIsRestoreVersionDialogOpen(true));
  };

  const handleDownload = async () => {
    onDropdownClose();

    if (!item) {
      notificationsService.show({
        text: translate('modals.versionHistory.downloadError'),
        type: ToastType.Error,
      });
      return;
    }

    const entireFilename = item.plainName || item.name;
    const formattedDate = dateService.format(version.createdAt, 'DD-MM-YYYY [at] HH:mm');
    const { filename, extension } = itemsUtils.getFilenameAndExt(entireFilename);

    const fileExtension = extension || item.type ? `.${extension || item.type}` : '';
    const versionFileName = `(${formattedDate}) ${filename}${fileExtension}`;

    await fileVersionService.downloadVersion(version, item, versionFileName, selectedWorkspace, workspaceCredentials);
  };

  const handleDeleteClick = () => {
    onDropdownClose();
    dispatch(uiActions.setVersionToDelete(version));
    dispatch(uiActions.setIsDeleteVersionDialogOpen(true));
  };

  const menuItems: Array<MenuItemType<FileVersion>> = [
    {
      name: translate('modals.versionHistory.restoreVersion'),
      icon: ClockCounterClockwise,
      action: handleRestoreClick,
    },
    {
      name: translate('modals.versionHistory.downloadVersion'),
      icon: DownloadSimple,
      action: handleDownload,
    },
    {
      separator: true,
    },
    {
      name: translate('modals.versionHistory.deleteVersion'),
      icon: Trash,
      action: handleDeleteClick,
    },
  ];

  return { menuItems };
};
