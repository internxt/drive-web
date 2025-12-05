import { Trash, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { MenuItemType } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FileVersion } from '../types';

interface UseVersionItemActionsParams {
  version: FileVersion;
  onDelete: (id: string) => void;
  onDropdownClose: () => void;
}

export const useVersionItemActions = ({ version, onDelete, onDropdownClose }: UseVersionItemActionsParams) => {
  const { translate } = useTranslationContext();

  const handleRestore = () => {
    onDropdownClose();
  };

  const handleDownload = () => {
    onDropdownClose();
  };

  const handleDelete = () => {
    onDelete(version.id);
    onDropdownClose();
  };

  const menuItems: Array<MenuItemType<FileVersion>> = [
    {
      name: translate('modals.versionHistory.restoreVersion'),
      icon: ClockCounterClockwise,
      action: handleRestore,
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
      action: handleDelete,
    },
  ];

  return { menuItems };
};
