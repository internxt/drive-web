import { Trash, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { MenuItemType } from '@internxt/ui';
import { FileVersion } from '../types';

interface UseVersionItemActionsParams {
  version: FileVersion;
  onDelete: (id: string) => void;
  onDropdownClose: () => void;
}

export const useVersionItemActions = ({ version, onDelete, onDropdownClose }: UseVersionItemActionsParams) => {
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
      name: 'Restore version',
      icon: ClockCounterClockwise,
      action: handleRestore,
    },
    {
      name: 'Download version',
      icon: DownloadSimple,
      action: handleDownload,
    },
    {
      separator: true,
    },
    {
      name: 'Delete version',
      icon: Trash,
      action: handleDelete,
    },
  ];

  return { menuItems };
};
