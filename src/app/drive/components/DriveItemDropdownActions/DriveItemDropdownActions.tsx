import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch } from 'app/store/hooks';
import { Menu } from '@headlessui/react';
import { DriveItemData } from 'app/drive/types';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
} from '../DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { sharedThunks } from 'app/store/slices/sharedLinks';

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
  const isSharedItem = item?.sharings && item?.sharings?.length > 0;

  const {
    onCopyLinkButtonClicked,
    onMoveItemButtonClicked,
    onMoveToTrashButtonClicked,
    onShowDetailsButtonClicked,
    onDownloadItemButtonClicked,
    onLinkSettingsButtonClicked,
    onRenameItemButtonClicked,
    onOpenPreviewButtonClicked,
  } = useDriveItemActions(item as DriveItemData);

  const menuItems = isSharedItem
    ? item?.isFolder
      ? contextMenuDriveFolderShared({
          copyLink: onCopyLinkButtonClicked,
          openShareAccessSettings: onLinkSettingsButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          deleteLink: (item) => {
            dispatch(
              sharedThunks.deleteLinkThunk({
                linkId: (item as DriveItemData)?.shares?.[0]?.id as string,
                item: item as DriveItemData,
              }),
            );
          },
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        })
      : contextMenuDriveItemShared({
          openPreview: onOpenPreviewButtonClicked,
          showDetails: onShowDetailsButtonClicked,
          copyLink: onCopyLinkButtonClicked,
          openShareAccessSettings: onOpenPreviewButtonClicked,
          deleteLink: () => ({}),
          renameItem: onRenameItemButtonClicked,
          moveItem: onMoveItemButtonClicked,
          downloadItem: onDownloadItemButtonClicked,
          moveToTrash: onMoveToTrashButtonClicked,
        })
    : item?.isFolder
    ? contextMenuDriveFolderNotSharedLink({
        shareLink: onLinkSettingsButtonClicked,
        showDetails: onShowDetailsButtonClicked,
        getLink: onCopyLinkButtonClicked,
        renameItem: onRenameItemButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: onMoveToTrashButtonClicked,
      })
    : contextMenuDriveNotSharedLink({
        shareLink: onLinkSettingsButtonClicked,
        openPreview: onOpenPreviewButtonClicked,
        showDetails: onShowDetailsButtonClicked,
        getLink: onCopyLinkButtonClicked,
        renameItem: onRenameItemButtonClicked,
        moveItem: onMoveItemButtonClicked,
        downloadItem: onDownloadItemButtonClicked,
        moveToTrash: onMoveToTrashButtonClicked,
      });

  return (
    <div className="flex flex-col rounded-lg bg-surface py-1.5 shadow-subtle-hard dark:bg-gray-5">
      {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}
      {openDropdown && item && (
        <>
          {menuItems?.map((option, i) => (
            <div key={i}>
              {option && option.separator ? (
                <div className="my-0.5 flex w-full flex-row px-4">
                  <div className="h-px w-full bg-gray-10" />
                </div>
              ) : (
                option && (
                  <Menu.Item disabled={option.disabled?.(item)}>
                    {({ active, disabled }) => {
                      return (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            option.action?.(item);
                          }}
                          className={`flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base ${
                            active
                              ? 'bg-gray-5 text-gray-100 dark:bg-gray-10'
                              : disabled
                              ? 'pointer-events-none font-medium text-gray-100'
                              : 'text-gray-80'
                          }`}
                        >
                          <div className="flex flex-row items-center space-x-2">
                            {option.icon && <option.icon size={20} />}
                            <span>{option.name}</span>
                          </div>
                          <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
                            {option.keyboardShortcutOptions?.keyboardShortcutIcon && (
                              <option.keyboardShortcutOptions.keyboardShortcutIcon size={14} />
                            )}
                            {option.keyboardShortcutOptions?.keyboardShortcutText ?? ''}
                          </span>
                        </div>
                      );
                    }}
                  </Menu.Item>
                )
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default FileDropdownActions;
