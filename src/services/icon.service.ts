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
  DefaultFile = 'defaultFile'
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
  defaultFile
};

export const getIcon = (iconName: IconType): string => {
  return icons[iconName];
};

const iconService = {
  getIcon
};

export default iconService;