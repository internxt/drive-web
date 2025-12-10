import { Trash, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { MenuItemType } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FileVersion } from '../types';
import fileVersionService from '../services/file-version.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { RootState } from 'app/store';

interface UseVersionItemActionsParams {
  version: FileVersion;
  onDropdownClose: () => void;
}

export const useVersionItemActions = ({ version, onDropdownClose }: UseVersionItemActionsParams) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);

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

    try {
      const fileName = item.type ? `${item.plainName || item.name}.${item.type}` : item.plainName || item.name;
      await fileVersionService.downloadVersion(version, fileName, item.bucket);
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
      notificationsService.show({
        text: translate('modals.versionHistory.downloadError'),
        type: ToastType.Error,
      });
    }
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
