import {
  PencilSimple,
  Trash,
  DownloadSimple,
  Link,
  Users,
  Eye,
  ArrowsOutCardinal,
  Backspace,
} from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { Menu } from '@headlessui/react';
import { storageActions } from 'app/store/slices/storage';
import { DriveItemData } from 'app/drive/types';
import shareService from 'app/share/services/share.service';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import moveItemsToTrash from 'use_cases/trash/move-items-to-trash';
import navigationService from '../../../core/services/navigation.service';

interface FileDropdownActionsProps {
  title?: string;
  onRenameButtonClicked: any;
  isTrash?: boolean;
  item?: DriveItemData;
  closeDropdown: () => void;
  openDropdown: boolean;
}

type MenuItem = {
  id: string;
  icon: any;
  text: string;
  onClick: () => void;
  className?: string;
  iconClassName?: string;
  divider?: boolean;
  keyboardShortcutOptions?: {
    keyboardShortcutIcon?: any;
    keyboardShortcutText?: string;
  };
} | null;

const FileDropdownActions = (props: FileDropdownActionsProps) => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const { title, item, openDropdown, closeDropdown } = props;

  const menuItems: MenuItem[] = [
    {
      id: 'share',
      icon: Users,
      text: translate('drive.dropdown.share'),
      onClick: () => {
        dispatch(
          storageActions.setItemToShare({
            share: (item as DriveItemData)?.shares?.[0],
            item: item as DriveItemData,
          }),
        );
        dispatch(uiActions.setIsShareDialogOpen(true));
      },
    },
    {
      id: 'get-link',
      icon: Link,
      text: translate('drive.dropdown.getLink'),

      onClick: () => {
        const driveItem = item as DriveItemData;
        shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
      },
      divider: true,
    },
    !item?.isFolder
      ? {
          id: 'preview',
          icon: Eye,
          text: translate('drive.dropdown.openPreview'),

          onClick: () => {
            navigationService.pushFile(item?.uuid);
          },
        }
      : null,
    {
      id: 'rename',
      icon: PencilSimple,
      text: translate('drive.dropdown.rename'),
      keyboardShortcutOptions: {
        keyboardShortcutText: 'R',
      },
      onClick: () => props.onRenameButtonClicked(item as DriveItemData),
    },
    {
      id: 'move',
      icon: ArrowsOutCardinal,
      text: translate('drive.dropdown.move'),

      onClick: () => {
        dispatch(storageActions.setItemsToMove([item as DriveItemData]));
        dispatch(uiActions.setIsMoveItemsDialogOpen(true));
      },
    },
    {
      id: 'download',
      icon: DownloadSimple,
      text: translate('drive.dropdown.download'),

      onClick: () => {
        dispatch(storageThunks.downloadItemsThunk([item as DriveItemData]));
      },
      divider: true,
    },
    {
      id: 'trash',
      icon: Trash,
      text: props.isTrash ? translate('drive.dropdown.deletePermanently') : translate('drive.dropdown.moveToTrash'),
      keyboardShortcutOptions: {
        keyboardShortcutIcon: Backspace,
      },
      onClick: () => {
        moveItemsToTrash([item as DriveItemData]);
      },
    },
  ];

  return (
    <div className="flex flex-col rounded-lg bg-surface py-1.5 shadow-subtle-hard dark:bg-gray-5">
      {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}
      {openDropdown && (
        <>
          {menuItems.map(
            (item) =>
              item && (
                <div key={item.id}>
                  <Menu.Item as={'div'}>
                    <div
                      onKeyDown={(e) => {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClick();
                        closeDropdown();
                      }}
                      className={
                        'flex cursor-pointer flex-row items-center justify-between space-x-3 whitespace-nowrap px-4 py-1.5 text-base text-gray-80 hover:bg-gray-5 hover:text-gray-100 dark:hover:bg-gray-10'
                      }
                    >
                      <div className="flex flex-row items-center space-x-2">
                        {item.icon && <item.icon size={20} className={item.iconClassName} />}
                        <span>{item.text}</span>
                      </div>
                      <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                        {item.keyboardShortcutOptions?.keyboardShortcutIcon && (
                          <item.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                        )}
                        {item.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                      </span>
                    </div>
                  </Menu.Item>
                  {item.divider && <div className="border-b border-gray-10" />}
                </div>
              ),
          )}
        </>
      )}
    </div>
  );
};

export default FileDropdownActions;
