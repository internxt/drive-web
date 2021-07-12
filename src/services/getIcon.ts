import { IconTypes } from '../models/interfaces';
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

const icons = {
  folderWithCrossGray: folderWithCrossGray,
  clockGray: clockGray,
  accountGray: accountGray,
  supportGray: supportGray,
  logOutGray: logOutGray,
  backArrows: backArrows,
  internxtShortLogo: internxtShortLogo,
  internxtLongLogo: internxtLongLogo,
  folderBlue: folderBlue,
  fileSuccessGreen: fileSuccessGreen,
  fileErrorRed: fileErrorRed,
  fileEncryptingGray: fileEncryptingGray,
  doubleArrowUpBlue: doubleArrowUpBlue,
  doubleArrowUpWhite: doubleArrowUpWhite,
  crossGray: crossGray,
  crossWhite: crossWhite,
  crossNeutralBlue: crossNeutralBlue,
  crossBlue: crossBlue
};

export const getIcon = (iconName: IconTypes): string => {
  return icons[iconName];
};
