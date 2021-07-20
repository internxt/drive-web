import folderWithCrossGray from '../assets/icons/folder-with-cross-gray.svg';
import clockGray from '../assets/icons/clock-gray.svg';
import accountGray from '../assets/icons/account-gray.svg';
import supportGray from '../assets/icons/support-gray.svg';
import logOutGray from '../assets/icons/logout-gray.svg';
import backArrows from '../assets/icons/double-back-arrows-gray.svg';
import internxtShortLogo from '../assets/icons/internxt-short-logo.svg';
import internxtLongLogo from '../assets/icons/internxt-long-logo.svg';
import folderBlue from '../assets/icons/folder-blue.svg';
import fileSuccessGreen from '../assets/icons/file-success-green.svg';
import fileErrorRed from '../assets/icons/file-error-red.svg';
import fileEncryptingGray from '../assets/icons/file-encrypting-gray.svg';
import doubleArrowUpBlue from '../assets/icons/double-arrow-up-blue.svg';
import doubleArrowUpWhite from '../assets/icons/double-arrow-up-white.svg';
import crossGray from '../assets/icons/cross-gray.svg';
import crossWhite from '../assets/icons/cross-white.svg';
import crossNeutralBlue from '../assets/icons/cross-neutral-blue.svg';
import crossBlue from '../assets/icons/cross-blue.svg';
import defaultFile from '../assets/icons/default-file.svg';
import breadcrumbsStorage from '../assets/icons/breadcrumbs/breadcrumbs-storage.svg';
import breadcrumbsFolder from '../assets/icons/breadcrumbs/breadcrumbs-folder.svg';
import defaultAvatar from '../assets/icons/default-avatar.svg';
import upload from '../assets/icons/upload.svg';
import listView from '../assets/icons/list-view.svg';
import mosaicView from '../assets/icons/mosaic-view.svg';
import createFolder from '../assets/icons/create-folder.svg';
import downloadItems from '../assets/icons/download-items.svg';
import deleteItems from '../assets/icons/delete-items.svg';
import shareItems from '../assets/icons/share-items.svg';
import actions from '../assets/icons/actions.svg';
import settings from '../assets/icons/settings.svg';
import itemInfo from '../assets/icons/item-info.svg';
import desktop from '../assets/icons/desktop.svg';
import previousPage from '../assets/icons/previous-page.svg';
import nextPage from '../assets/icons/next-page.svg';
import lightMode from '../assets/icons/light-mode.svg';
import darkMode from '../assets/icons/dark-mode.svg';
import arrowUpWhite from '../assets/icons/arrow-up-inside-box.svg';
import mailGray from '../assets/icons/mail-gray.svg';
import lockGray from '../assets/icons/lock-gray.svg';
import eyeGray from '../assets/icons/eye-gray.svg';
import eyeSlashGray from '../assets/icons/eye-slash-gray.svg';
import userGray from '../assets/icons/user-gray.svg';
import search from '../assets/icons/search.svg';

export enum IconType {
  FolderWithCrossGray = 'folderWithCrossGray',
  ClockGray = 'clockGray',
  AccountGray = 'accountGray',
  SupportGray = 'supportGray',
  LogOutGray = 'logOutGray',
  BackArrows = 'backArrows',
  InternxtLongLogo = 'internxtLongLogo',
  InternxtShortLogo = 'internxtShortLogo',
  FolderBlue = 'folderBlue',
  FileSuccessGreen = 'fileSuccessGreen',
  FileErrorRed = 'fileErrorRed',
  FileEncryptingGray = 'fileEncryptingGray',
  DoubleArrowUpBlue = 'doubleArrowUpBlue',
  DoubleArrowUpWhite = 'doubleArrowUpWhite',
  CrossGray = 'crossGray',
  CrossWhite = 'crossWhite',
  CrossNeutralBlue = 'crossNeutralBlue',
  CrossBlue = 'crossBlue',
  DefaultFile = 'defaultFile',
  BreadcrumbsStorage = 'breadcrumbsStorage',
  BreadcrumbsFolder = 'breadcrumbsFolder',
  DefaultAvatar = 'defaultAvatar',
  Upload = 'upload',
  ListView = 'listView',
  MosaicView = 'mosaicView',
  CreateFolder = 'createFolder',
  DownloadItems = 'downloadItems',
  DeleteItems = 'deleteItems',
  ShareItems = 'shareItems',
  Actions = 'actions',
  Settings = 'settings',
  ItemInfo = 'itemInfo',
  Desktop = 'desktop',
  PreviousPage = 'previousPage',
  NextPage = 'nextPage',
  LightMode = 'lightMode',
  DarkMode = 'darkMode',
  ArrowUpWhite = 'arrowUpWhite',
  MailGray = 'mailGray',
  LockGray = 'lockGray',
  EyeGray = 'eyeGray',
  EyeSlashGray = 'eyeSlashGray',
  UserGray = 'userGray',
  Search = 'search'
}

const icons = {
  folderWithCrossGray,
  clockGray,
  accountGray,
  supportGray,
  logOutGray,
  backArrows,
  internxtShortLogo,
  internxtLongLogo,
  folderBlue,
  fileSuccessGreen,
  fileErrorRed,
  fileEncryptingGray,
  doubleArrowUpBlue,
  doubleArrowUpWhite,
  crossGray,
  crossWhite,
  crossNeutralBlue,
  crossBlue,
  defaultFile,
  breadcrumbsStorage,
  breadcrumbsFolder,
  defaultAvatar,
  upload,
  listView,
  mosaicView,
  createFolder,
  downloadItems,
  deleteItems,
  shareItems,
  actions,
  settings,
  itemInfo,
  desktop,
  previousPage,
  nextPage,
  lightMode,
  darkMode,
  arrowUpWhite,
  mailGray,
  lockGray,
  eyeGray,
  eyeSlashGray,
  userGray,
  search
};

export const getIcon = (iconName: IconType): string => {
  return icons[iconName];
};

const iconService = {
  getIcon
};

export default iconService;