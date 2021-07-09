import { IconTypes } from '../models/interfaces';
import folderWithCrossGray from '../assets/icons/folder-with-cross-gray.svg';
import clockGray from '../assets/icons/clock-gray.svg';
import accountGray from '../assets/icons/account-gray.svg';
import supportGray from '../assets/icons/support-gray.svg';
import logOutGray from '../assets/icons/logout-gray.svg';
import backArrows from '../assets/icons/double-back-arrows-gray.svg';
import internxtShortLogo from '../assets/icons/internxt-short-logo.svg';
import internxtLongLogo from '../assets/icons/internxt-long-logo.svg';

const icons = {
  folderWithCrossGray: folderWithCrossGray,
  clockGray: clockGray,
  accountGray: accountGray,
  supportGray: supportGray,
  logOutGray: logOutGray,
  backArrows: backArrows,
  internxtShortLogo: internxtShortLogo,
  internxtLongLogo: internxtLongLogo
};

export const getIcon = (iconName: IconTypes): string => {
  return icons[iconName];
};
