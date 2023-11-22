import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { t } from 'i18next';
import {
  ArrowsOutCardinal,
  Backspace,
  ClockCounterClockwise,
  DownloadSimple,
  Eye,
  Info,
  Link,
  LinkBreak,
  PencilSimple,
  Trash,
  Users,
} from '@phosphor-icons/react';
import { Device } from '../../../../backups/types';
import { ListItemMenu } from '../../../../shared/components/List/ListItem';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import { AdvancedSharedItem } from '../../../../share/types';

const getOpenPreviewMenuItem = (openPreview: (target) => void) => ({
  name: t('drive.dropdown.openPreview'),
  icon: Eye,
  action: openPreview,
  disabled: (item) => {
    return item.isFolder;
  },
});

const shareLinkMenuItem = (shareLink: (target) => void) => ({
  name: t('drive.dropdown.shareLink'),
  icon: Users,
  action: shareLink,
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

const manageLinkAccessMenuItem = (manageAccess: (target) => void) => ({
  name: t('drive.dropdown.manageLinkAccess'),
  icon: Users,
  action: manageAccess,
  disabled: () => {
    return false;
  },
});

const getCopyLinkMenuItem = (getLink: (target) => void) => ({
  name: t('drive.dropdown.copyLink'),
  icon: Link,
  action: getLink,
  disabled: () => {
    return false;
  },
});

const showDetailsMenuItem = (showDetails: (target) => void) => ({
  name: t('drive.dropdown.details'),
  icon: Info,
  action: showDetails,
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
  shareLink,
  openPreview,
  showDetails,
  getLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  shareLink: (item: DriveItemData) => void;
  openPreview: (item: DriveItemData) => void;
  showDetails: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  shareLinkMenuItem(shareLink),
  getCopyLinkMenuItem(getLink),
  { name: '', action: () => false, separator: true },
  getOpenPreviewMenuItem(openPreview),
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveFolderNotSharedLink = ({
  shareLink,
  getLink,
  showDetails,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  shareLink: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  showDetails: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  shareLinkMenuItem(shareLink),
  getCopyLinkMenuItem(getLink),
  { name: '', action: () => false, separator: true },
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveItemShared = ({
  openPreview,
  showDetails,
  copyLink,
  openShareAccessSettings,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  showDetails: (item: DriveItemData) => void;
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openShareAccessSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  deleteLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): ListItemMenu<DriveItemData | (ListShareLinksItem & { code: string })> => [
  ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyLink)],
  { name: '', action: () => false, separator: true },
  getOpenPreviewMenuItem(openPreview),
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { name: '', action: () => false, separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveFolderShared = ({
  copyLink,
  openShareAccessSettings,
  showDetails,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openShareAccessSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  showDetails: (item: DriveItemData) => void;
  deleteLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): ListItemMenu<DriveItemData | (ListShareLinksItem & { code: string })> => [
  ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyLink)],
  { name: '', action: () => false, separator: true },
  showDetailsMenuItem(showDetails),
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
  openShareAccessSettings,
  deleteLink,
}: {
  copyShareLink: (item) => void;
  openShareAccessSettings: (item) => void;
  deleteLink: (open: boolean) => void;
}): ListItemMenu<DriveItemData> => [
  ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyShareLink)],
];

const contextMenuDriveItemSharedAFS = ({
  openPreview,
  showDetails,
  copyLink,
  openShareAccessSettings,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview: (item: AdvancedSharedItem) => void;
  showDetails: (item: AdvancedSharedItem) => void;
  copyLink: (item: AdvancedSharedItem) => void;
  openShareAccessSettings: (item: AdvancedSharedItem) => void;
  deleteLink: (item: AdvancedSharedItem) => void;
  renameItem?: (item: AdvancedSharedItem) => void;
  moveItem?: (item: AdvancedSharedItem) => void;
  downloadItem: (item: AdvancedSharedItem) => Promise<void>;
  moveToTrash?: (item: AdvancedSharedItem) => void;
}): ListItemMenu<AdvancedSharedItem> => [
  manageLinkAccessMenuItem(openShareAccessSettings),
  ...[getOpenPreviewMenuItem(openPreview)],
  showDetailsMenuItem(showDetails),
  renameItem && getRenameMenuItem(renameItem),
  moveItem && getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  moveToTrash && { name: '', action: () => false, separator: true },
  moveToTrash && getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveFolderSharedAFS = ({
  copyLink,
  openShareAccessSettings,
  showDetails,
  deleteLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  copyLink: (item: any) => void;
  openShareAccessSettings: (item: any) => void;
  deleteLink: (item: any) => void;
  showDetails: (item: any) => void;
  renameItem?: (item: any) => void;
  moveItem?: (item: any) => void;
  downloadItem: (item: any) => Promise<void>;
  moveToTrash?: (item: any) => void;
}): ListItemMenu<any> => [
  manageLinkAccessMenuItem(openShareAccessSettings),
  { name: '', action: () => false, separator: true },
  showDetailsMenuItem(showDetails),
  renameItem && getRenameMenuItem(renameItem),
  moveItem && getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  moveToTrash && { name: '', action: () => false, separator: true },
  moveToTrash && getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuMultipleSharedViewAFS = ({
  deleteLink,
  downloadItem,
  moveToTrash,
}: {
  deleteLink: (item: AdvancedSharedItem) => void;
  downloadItem: (item: AdvancedSharedItem) => Promise<void>;
  moveToTrash?: (item: AdvancedSharedItem) => void;
}): ListItemMenu<AdvancedSharedItem> => [
  getDownloadMenuItem(downloadItem),
  moveToTrash && { name: '', action: () => false, separator: true },
  moveToTrash && getMoveToTrashMenuItem(moveToTrash),
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
  contextMenuDriveItemSharedAFS,
  contextMenuDriveFolderSharedAFS,
  contextMenuMultipleSharedViewAFS,
};
