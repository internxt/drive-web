import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import {
  Backspace,
  ClockCounterClockwise,
  DownloadSimple,
  Eye,
  Icon,
  Info,
  Link,
  PencilSimple,
  Trash,
  Users,
} from '@phosphor-icons/react';
import { ReactComponent as MoveActionIcon } from 'assets/icons/move.svg';
import { t } from 'i18next';
import { Device } from '../../../../backups/types';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import { AdvancedSharedItem } from '../../../../share/types';
import { MenuItemType } from '@internxt/ui';

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

const shareWithTeamMenuItem = (shareWithTeam: (target) => void) => ({
  name: t('drive.dropdown.shareTeam'),
  icon: Users,
  action: shareWithTeam,
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
  icon: MoveActionIcon as Icon,
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
}): Array<MenuItemType<DriveItemData>> => [
  {
    name: `${selectedItems.length} ${t('contextMenu.itemsSelected')}`,
    action: () => {},
    isTitle: () => {
      return true;
    },
  },
  { separator: true },
  getMoveItemMenuItem(moveItems),
  getDownloadMenuItem(downloadItems),
  { separator: true },
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
  openPreview?: (item: DriveItemData) => void;
  showDetails: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> =>
  [
    shareLinkMenuItem(shareLink),
    getCopyLinkMenuItem(getLink),
    { separator: true },
    openPreview && getOpenPreviewMenuItem(openPreview),
    showDetailsMenuItem(showDetails),
    getRenameMenuItem(renameItem),
    getMoveItemMenuItem(moveItem),
    getDownloadMenuItem(downloadItem),
    { separator: true },
    getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<DriveItemData>[];

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
}): Array<MenuItemType<DriveItemData>> => [
  shareLinkMenuItem(shareLink),
  getCopyLinkMenuItem(getLink),
  { separator: true },
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuDriveItemShared = ({
  openPreview,
  showDetails,
  copyLink,
  openShareAccessSettings,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview?: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  showDetails: (item: DriveItemData) => void;
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openShareAccessSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): Array<MenuItemType<DriveItemData | (ListShareLinksItem & { code: string })>> =>
  [
    ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyLink)],
    { separator: true },
    openPreview && getOpenPreviewMenuItem(openPreview),
    showDetailsMenuItem(showDetails),
    getRenameMenuItem(renameItem),
    getMoveItemMenuItem(moveItem),
    getDownloadMenuItem(downloadItem),
    { separator: true },
    getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<DriveItemData | (ListShareLinksItem & { code: string })>[];

const contextMenuDriveFolderShared = ({
  copyLink,
  openShareAccessSettings,
  showDetails,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  copyLink: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  openShareAccessSettings: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  showDetails: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  downloadItem: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
  moveToTrash: (item: DriveItemData | (ListShareLinksItem & { code: string })) => void;
}): Array<MenuItemType<DriveItemData | (ListShareLinksItem & { code: string })>> => [
  ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyLink)],
  { separator: true },
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuMultipleSharedView = ({
  downloadItem,
  moveToTrash,
}: {
  downloadItem: (item: ListShareLinksItem) => void;
  moveToTrash: (item: ListShareLinksItem) => void;
}): Array<MenuItemType<ListShareLinksItem>> => [
  getDownloadMenuItem(downloadItem),
  { separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuTrashItems = ({
  openPreview,
  restoreItem,
  deletePermanently,
}: {
  openPreview?: (item: DriveItemData) => void;
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> =>
  [
    openPreview && getOpenPreviewMenuItem(openPreview),
    getRestoreMenuItem(restoreItem),
    { separator: true },
    getDeletePermanentlyMenuItem(deletePermanently),
  ].filter(Boolean) as MenuItemType<DriveItemData>[];

const contextMenuTrashFolder = ({
  restoreItem,
  deletePermanently,
}: {
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> => [
  getRestoreMenuItem(restoreItem),
  { separator: true },
  getDeletePermanentlyMenuItem(deletePermanently),
];

const contextMenuMultipleSelectedTrashItems = ({
  restoreItem,
  deletePermanently,
}: {
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> => [
  getRestoreMenuItem(restoreItem),
  { separator: true },
  getDeletePermanentlyMenuItem(deletePermanently),
];

const contextMenuBackupItems = ({
  onDeviceDeleted,
  selectedDevices,
}: {
  selectedDevices: (Device | DriveFolderData)[];
  onDeviceDeleted: (device: (Device | DriveFolderData)[]) => void;
}): Array<MenuItemType<unknown>> => [
  {
    name: t('drive.dropdown.delete') ?? '',
    icon: Trash,
    action: () => {
      onDeviceDeleted(selectedDevices);
    },
    disabled: () => false,
  },
];

const contextMenuSelectedBackupItems = ({
  onDownloadSelectedItems,
  onDeleteSelectedItems,
}: {
  onDownloadSelectedItems: () => void;
  onDeleteSelectedItems: () => Promise<void>;
}): Array<MenuItemType<unknown>> => [
  getDownloadMenuItem(onDownloadSelectedItems),
  { separator: true },
  {
    name: t('drive.dropdown.delete') ?? '',
    icon: Trash,
    action: onDeleteSelectedItems,
    disabled: () => {
      return false;
    },
  },
];

const contextMenuDriveItemSharedsView = ({
  copyShareLink,
  openShareAccessSettings,
}: {
  copyShareLink: (item) => void;
  openShareAccessSettings: (item) => void;
}): Array<MenuItemType<DriveItemData>> => [
  ...[manageLinkAccessMenuItem(openShareAccessSettings), getCopyLinkMenuItem(copyShareLink)],
];

const contextMenuDriveItemSharedAFS = ({
  openPreview,
  showDetails,
  openShareAccessSettings,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  openPreview?: (item: AdvancedSharedItem) => void;
  showDetails: (item: AdvancedSharedItem) => void;
  copyLink: (item: AdvancedSharedItem) => void;
  openShareAccessSettings?: (item: AdvancedSharedItem) => void;
  renameItem?: (item: AdvancedSharedItem) => void;
  moveItem?: (item: AdvancedSharedItem) => void;
  downloadItem: (item: AdvancedSharedItem) => void;
  moveToTrash?: (item: AdvancedSharedItem) => void;
}): Array<MenuItemType<AdvancedSharedItem>> =>
  [
    openShareAccessSettings && manageLinkAccessMenuItem(openShareAccessSettings),
    openPreview && getOpenPreviewMenuItem(openPreview),
    showDetailsMenuItem(showDetails),
    renameItem && getRenameMenuItem(renameItem),
    moveItem && getMoveItemMenuItem(moveItem),
    getDownloadMenuItem(downloadItem),
    moveToTrash && { separator: true },
    moveToTrash && getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<AdvancedSharedItem>[];

const contextMenuDriveFolderSharedAFS = ({
  openShareAccessSettings,
  showDetails,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  copyLink: (item: any) => void;
  openShareAccessSettings?: (item: any) => void;
  showDetails: (item: any) => void;
  renameItem?: (item: any) => void;
  moveItem?: (item: any) => void;
  downloadItem: (item: any) => Promise<void>;
  moveToTrash?: (item: any) => void;
}): Array<MenuItemType<any>> =>
  [
    openShareAccessSettings && manageLinkAccessMenuItem(openShareAccessSettings),
    openShareAccessSettings && { separator: true },
    showDetailsMenuItem(showDetails),
    renameItem && getRenameMenuItem(renameItem),
    moveItem && getMoveItemMenuItem(moveItem),
    getDownloadMenuItem(downloadItem),
    moveToTrash && { separator: true },
    moveToTrash && getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<DriveItemData>[];

const contextMenuMultipleSharedViewAFS = ({
  downloadItem,
  moveToTrash,
}: {
  downloadItem: (item: AdvancedSharedItem) => Promise<void>;
  moveToTrash?: (item: AdvancedSharedItem) => void;
}): Array<MenuItemType<AdvancedSharedItem>> =>
  [
    getDownloadMenuItem(downloadItem),
    moveToTrash && { separator: true },
    moveToTrash && getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<AdvancedSharedItem>[];

const contextMenuWorkspaceFolder = ({
  shareLink,
  getLink,
  shareWithTeam,
  showDetails,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  shareLink: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  shareWithTeam: (item: DriveItemData) => void;
  showDetails: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> => [
  shareLinkMenuItem(shareLink),
  getCopyLinkMenuItem(getLink),
  shareWithTeamMenuItem(shareWithTeam),
  { separator: true },
  showDetailsMenuItem(showDetails),
  getRenameMenuItem(renameItem),
  getMoveItemMenuItem(moveItem),
  getDownloadMenuItem(downloadItem),
  { separator: true },
  getMoveToTrashMenuItem(moveToTrash),
];

const contextMenuWorkspaceFile = ({
  shareLink,
  shareWithTeam,
  openPreview,
  showDetails,
  getLink,
  renameItem,
  moveItem,
  downloadItem,
  moveToTrash,
}: {
  shareLink: (item: DriveItemData) => void;
  shareWithTeam: (item: DriveItemData) => void;
  openPreview?: (item: DriveItemData) => void;
  showDetails: (item: DriveItemData) => void;
  getLink: (item: DriveItemData) => void;
  renameItem: (item: DriveItemData) => void;
  moveItem: (item: DriveItemData) => void;
  downloadItem: (item: DriveItemData) => void;
  moveToTrash: (item: DriveItemData) => void;
}): Array<MenuItemType<DriveItemData>> =>
  [
    shareLinkMenuItem(shareLink),
    getCopyLinkMenuItem(getLink),
    shareWithTeamMenuItem(shareWithTeam),
    { separator: true },
    openPreview && getOpenPreviewMenuItem(openPreview),
    showDetailsMenuItem(showDetails),
    getRenameMenuItem(renameItem),
    getMoveItemMenuItem(moveItem),
    getDownloadMenuItem(downloadItem),
    { separator: true },
    getMoveToTrashMenuItem(moveToTrash),
  ].filter(Boolean) as MenuItemType<DriveItemData>[];

export {
  contextMenuBackupItems,
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveFolderSharedAFS,
  contextMenuDriveItemShared,
  contextMenuDriveItemSharedAFS,
  contextMenuDriveItemSharedsView,
  contextMenuDriveNotSharedLink,
  contextMenuMultipleSelectedTrashItems,
  contextMenuMultipleSharedView,
  contextMenuMultipleSharedViewAFS,
  contextMenuSelectedBackupItems,
  contextMenuSelectedItems,
  contextMenuTrashFolder,
  contextMenuTrashItems,
  contextMenuWorkspaceFile,
  contextMenuWorkspaceFolder,
};
