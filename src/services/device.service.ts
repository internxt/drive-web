import { isMobile, isAndroid, isIOS } from 'react-device-detect';

export function redirectForMobile() {
  if (isMobile) {
    if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.internxt.cloud';
    } else if (isIOS) {
      window.location.href = 'https://apps.apple.com/us/app/internxt-drive-secure-file-storage/id1465869889';
    }
  }
}

const deviceService = {
  redirectForMobile
};

export default deviceService;