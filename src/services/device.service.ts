import { isMobile, isAndroid, isIOS, isSafari } from 'react-device-detect';

const deviceService = {
  isMobile(): boolean {
    return isMobile;
  },
  redirectForMobile(): void {
    if (isMobile) {
      if (isAndroid) {
        globalThis.location.href = 'https://play.google.com/store/apps/details?id=com.internxt.cloud';
      } else if (isIOS) {
        globalThis.location.href = 'https://apps.apple.com/us/app/internxt-drive-secure-file-storage/id1465869889';
      }
    }
  },
  isSafari(): boolean {
    return isSafari;
  },
};

export default deviceService;
