import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { t } from 'i18next';
import {
  ArrowsOutCardinal,
  Backspace,
  ClockCounterClockwise,
  Copy,
  Download,
  Eye,
  Gear,
  Link,
  LinkBreak,
  Pencil,
  Trash,
} from 'phosphor-react';
import { Device } from '../../../../backups/types';
import { ListItemMenu } from '../../../../shared/components/List/ListItem';
import { DriveFolderData, DriveItemData } from '../../../types';

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
    name: `${selectedItems.length} items selected`,
    action: () => ({}),
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.move'),
    icon: ArrowsOutCardinal,
    action: moveItems,
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.download'),
    icon: Download,
    action: downloadItems,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.moveToTrash'),
    icon: Trash,
    action: moveToTrash,
    keyboardShortcutOptions: {
      keyboardShortcutIcon: Backspace,
      keyboardShortcutKey: 'Backspace',
    },
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('drive.dropdown.openPreview'),
    icon: Eye,
    action: openPreview,
    disabled: (item) => {
      return item.isFolder;
    },
  },
  {
    name: t('drive.dropdown.getLink'),
    icon: Link,
    action: getLink,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.rename'),
    icon: Pencil,
    action: renameItem,
    keyboardShortcutOptions: {
      keyboardShortcutKey: 'r',
      keyboardShortcutText: 'R',
    },
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.move'),
    icon: ArrowsOutCardinal,
    action: moveItem,
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.download'),
    icon: Download,
    action: downloadItem,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.moveToTrash'),
    icon: Trash,
    action: moveToTrash,
    keyboardShortcutOptions: {
      keyboardShortcutIcon: Backspace,
      keyboardShortcutKey: 'Backspace',
    },
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('drive.dropdown.openPreview'),
    icon: Eye,
    action: openPreview,
    disabled: (item) => {
      return item?.isFolder;
    },
  },
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
  {
    name: t('drive.dropdown.deleteLink'),
    icon: LinkBreak,
    action: deleteLink,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.rename'),
    icon: Pencil,
    action: renameItem,
    keyboardShortcutOptions: {
      keyboardShortcutKey: 'r',
      keyboardShortcutText: 'R',
    },
    disabled: () => {
      return false;
    },
  },

  {
    name: t('drive.dropdown.move'),
    icon: ArrowsOutCardinal,
    action: moveItem,
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.download'),
    icon: Download,
    action: downloadItem,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.moveToTrash'),
    icon: Trash,
    action: moveToTrash,
    keyboardShortcutOptions: {
      keyboardShortcutIcon: Backspace,
      keyboardShortcutKey: 'Backspace',
    },
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('drive.dropdown.deleteLink'),
    icon: LinkBreak,
    action: deleteLink,
    disabled: () => {
      return false;
    },
  },
  {
    name: t('drive.dropdown.download'),
    icon: Download,
    action: downloadItem,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.moveToTrash'),
    icon: Trash,
    action: moveToTrash,
    keyboardShortcutOptions: {
      keyboardShortcutIcon: Backspace,
      keyboardShortcutKey: 'Backspace',
    },
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('drive.dropdown.openPreview'),
    icon: Eye,
    action: openPreview,
    disabled: (item: DriveItemData) => {
      return item?.isFolder;
    },
  },
  {
    name: t('drive.dropdown.restore'),
    icon: ClockCounterClockwise,
    action: restoreItem,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.deletePermanently'),
    icon: Trash,
    action: deletePermanently,
    disabled: () => {
      return false;
    },
  },
];

const contextMenuMultipleSelectedTrashItems = ({
  restoreItem,
  deletePermanently,
}: {
  restoreItem: (item: DriveItemData) => void;
  deletePermanently: (item: DriveItemData) => void;
}): ListItemMenu<DriveItemData> => [
  {
    name: t('drive.dropdown.restore'),
    icon: ClockCounterClockwise,
    action: restoreItem,
    disabled: () => {
      return false;
    },
  },
  { name: '', action: () => false, separator: true },
  {
    name: t('drive.dropdown.deletePermanently'),
    icon: Trash,
    action: deletePermanently,
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('drive.dropdown.download'),
    icon: Download,
    action: () => {
      onDownloadSelectedItems();
    },
    disabled: () => {
      return false;
    },
  },
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
  {
    name: t('shared-links.item-menu.copy-link'),
    icon: Copy,
    action: (item) => {
      copyShareLink(item);
    },
    disabled: () => {
      return false;
    },
  },
  {
    name: t('shared-links.item-menu.link-settings'),
    icon: Gear,
    action: (item) => {
      openLinkSettings(item);
    },
    disabled: () => {
      return false;
    },
  },
  {
    name: t('shared-links.item-menu.delete-link'),
    icon: LinkBreak,
    action: () => {
      deleteLink(true);
    },
    disabled: () => {
      return false;
    },
  },
];

export {
  contextMenuDriveNotSharedLink,
  contextMenuSelectedItems,
  contextMenuDriveItemShared,
  contextMenuTrashItems,
  contextMenuMultipleSelectedTrashItems,
  contextMenuSelectedBackupItems,
  contextMenuBackupItems,
  contextMenuDriveItemSharedsView,
  contextMenuMultipleSharedView,
};
