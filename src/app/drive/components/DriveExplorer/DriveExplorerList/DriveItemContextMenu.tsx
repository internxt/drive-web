import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { t } from 'i18next';
import {
  ArrowsOutCardinal,
  Backspace,
  ClockCounterClockwise,
  Copy,
  DownloadSimple,
  Eye,
  Gear,
  Link,
  LinkBreak,
  PencilSimple,
  Trash,
} from 'phosphor-react';
import { Device } from '../../../../backups/types';
import { ListItemMenu } from '../../../../shared/components/List/ListItem';
import { DriveFolderData, DriveItemData } from '../../../types';

const getOpenPreviewMenuItem = (openPreview: (target) => void) => ({
  name: t('drive.dropdown.openPreview'),
  icon: Eye,
  action: openPreview,
  disabled: (item) => {
    return item.isFolder;
  },
});

const getGetLinkMenuItem = (getLink: (target) => void) => ({
  name: t('drive.dropdown.getLink'),
  icon: Link,
  action: getLink,
  disabled: () => {
    return false;
  },
});

const getRenameMenuItem = (renameItem: (target) => void) => ({
  name: t('drive.dropdown.rename'),
  icon: PencilSimple,
  action: renameItem,
  keyboardShortcutOptions: {
    keyboardShortcutText: 'R',
  },
  disabled: () => {
    return false;
  },
});

const getDownloadMenuItem = (downloadItems: (target?) => void) => ({
  name: t('drive.dropdown.download'),
  icon: DownloadSimple,
  action: downloadItems,
  disabled: () => {
    return false;
  },
});

const getMoveToTrashMenuItem = (moveToTrash: (target?) => void) => ({
  name: t('drive.dropdown.moveToTrash'),
  icon: Trash,
  action: moveToTrash,
  keyboardShortcutOptions: {
    keyboardShortcutIcon: Backspace,
  },
  disabled: () => {
    return false;
  },
});

const getMoveItemMenuItem = (moveItem: (target?) => void) => ({
  name: t('drive.dropdown.move'),
  icon: ArrowsOutCardinal,
  action: moveItem,
  disabled: () => {
    return false;
  },
});

const getDeleteLinkMenuItem = (deleteLink: (target?) => void) => ({
  name: t('drive.dropdown.deleteLink'),
  icon: LinkBreak,
  action: deleteLink,
  disabled: () => {
    return false;
  },
});

const getRestoreMenuItem = (restoreItem: (target?) => void) => ({
  name: t('drive.dropdown.restore'),
  icon: ClockCounterClockwise,
  action: restoreItem,
  disabled: () => {
    return false;
  },
});

const getDeletePermanentlyMenuItem = (deletePermanently: (target?) => void) => ({
  name: t('drive.dropdown.deletePermanently'),
  icon: Trash,
  action: deletePermanently,
  disabled: () => {
    return false;
  },
});

const getSharedLinkMenuItems = ({
  copyLink,
  openLinkSettings,
  deleteLink,
}: {
  copyLink: (target?) => void;
  openLinkSettings: (target?) => void;
  deleteLink: (target?) => void;
}) => [
  {
    name: t('drive.dropdown.copyLink'),
    icon: Copy,
    action: copyLink,
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.linkSettings'),
    icon: Gear,
    action: openLinkSettings,
    disabled: () => {
      return false;
    },
  },
  getDeleteLinkMenuItem(deleteLink),
];

const contextMenuSelectedItems = ({
  selectedItems,
  moveItems,
  downloadItems,
  moveToTrash,
}: {
  selectedItems: DriveItemData[];
  moveItems: (item: DriveItemData) => void;
  downloadItems: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  {
    name: `${selectedItems.length} ${t('contextMenu.itemsSelected')}`,
    action: () => ({}),
    disabled: () => {
      return true;
    },
  },
  { name: '', action: () => false, separator: true },
  getMoveItemMenuItem(moveItems),
  getDownloadMenuItem(downloadItems),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveNotSharedLink = ({
  openPreview,
  getLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  getOpenPreviewMenuItem(openPreview),
  getGetLinkMenuItem(getLink),
  { name: '', action: () => false, separator: true },
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveFolderNotSharedLink = ({
  getLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  getLink: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  getGetLinkMenuItem(getLink),
  { name: '', action: () => false, separator: true },
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveItemShared = ({
  openPreview,
  copyLink,
  openLinkSettings,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openLinkSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  deleteLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): ListItemMenu<DriveItemData | (ListShareLinksItem & { code: string })> => [
  getOpenPreviewMenuItem(openPreview),
  ...getSharedLinkMenuItems({ copyLink, openLinkSettings, deleteLink }),
  { name: '', action: () => false, separator: true },
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveFolderShared = ({
  copyLink,
  openLinkSettings,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openLinkSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  deleteLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): ListItemMenu<DriveItemData | (ListShareLinksItem & { code: string })> => [
  ...getSharedLinkMenuItems({ copyLink, openLinkSettings, deleteLink }),
  { name: '', action: () => false, separator: true },
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuMultipleSharedView = ({
  deleteLink,
  downloadItem,
  moveToTrash,
}: {
  deleteLink: (item: ListShareLinksItem) => void;
  downloadItem: (item: ListShareLinksItem) => void;
  moveToTrash: (item: ListShareLinksItem) => void;
}): ListItemMenu<ListShareLinksItem> => [
  getDeleteLinkMenuItem(deleteLink),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuTrashItems = ({
  openPreview,
  restoreItem,
  deletePermanently,
}: {
  openPreview: (item: DriveItemData) => void;
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  getOpenPreviewMenuItem(openPreview),
  getRestoreMenuItem(restoreItem),
  { name: '', action: () => false, separator: true },
  getDeletePermanentlyMenuItem(deletePermanently),
];

const contextMenuTrashFolder = ({
  restoreItem,
  deletePermanently,
}: {
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  getRestoreMenuItem(restoreItem),
  { name: '', action: () => false, separator: true },
  getDeletePermanentlyMenuItem(deletePermanently),
];

const contextMenuMultipleSelectedTrashItems = ({
  restoreItem,
  deletePermanently,
}: {
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  getRestoreMenuItem(restoreItem),
  { name: '', action: () => false, separator: true },
  getDeletePermanentlyMenuItem(deletePermanently),
];

const contextMenuBackupItems = ({
  onDeviceDeleted,
  selectedDevices,
}: {
  selectedDevices: (Device | DriveFolderData)[];
  onDeviceDeleted: (device: (Device | DriveFolderData)[]) => void;
}): ListItemMenu<unknown> => [
  {
    name: t('drive.dropdown.delete'),
    icon: Trash,
    action: () => {
      onDeviceDeleted(selectedDevices);
    },
    disabled: () => {
      return false;
    },
  },
];

const contextMenuSelectedBackupItems = ({
  onDownloadSelectedItems,
  onDeleteSelectedItems,
}: {
  onDownloadSelectedItems: () => void;
  onDeleteSelectedItems: () => void;
}): ListItemMenu<unknown> => [
  getDownloadMenuItem(onDownloadSelectedItems),
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.delete'),
    icon: Trash,
    action: () => {
      onDeleteSelectedItems();
    },
    disabled: () => {
      return false;
    },
  },
];

const contextMenuDriveItemSharedsView = ({
  copyShareLink,
  openLinkSettings,
  deleteLink,
}: {
  copyShareLink: (item) => void;
  openLinkSettings: (item) => void;
  deleteLink: (open: boolean) => void;
}): ListItemMenu<DriveItemData> => [
  ...getSharedLinkMenuItems({ copyLink: copyShareLink, openLinkSettings, deleteLink: () => deleteLink(true) }),
];

export {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveNotSharedLink,
  contextMenuSelectedItems,
  contextMenuDriveItemShared,
  contextMenuDriveFolderShared,
  contextMenuTrashItems,
  contextMenuTrashFolder,
  contextMenuMultipleSelectedTrashItems,
  contextMenuSelectedBackupItems,
  contextMenuBackupItems,
  contextMenuDriveItemSharedsView,
  contextMenuMultipleSharedView,
};
