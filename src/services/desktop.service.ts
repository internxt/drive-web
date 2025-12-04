import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import operatingSystemService from './operating-system.service';
import { Translate } from 'app/i18n/types';

const INTERNXT_BASE_URL = 'https://internxt.com';

async function getDownloadAppUrl(): Promise<string | null> {
  const fetchDownloadResponse = await fetch(`${INTERNXT_BASE_URL}/api/download`, {
    method: 'GET',
  });

  const response = await fetchDownloadResponse.json();

  switch (operatingSystemService.getOperatingSystem()) {
    case 'Linux':
    case 'UNIX':
      return response.platforms.Linux ?? `${INTERNXT_BASE_URL}/downloads/drive.deb`;
    case 'Windows':
      return response.platforms.Windows ?? `${INTERNXT_BASE_URL}/downloads/drive.exe`;
    case 'macOS':
      return response.platforms.MacOS ?? `${INTERNXT_BASE_URL}/downloads/drive.dmg`;
    default:
      return null;
  }
}

async function openDownloadAppUrl(translate: Translate) {
  const download = await getDownloadAppUrl();
  if (download) {
    window.open(download, '_self');
  } else {
    notificationsService.show({
      text: translate('errors.downloadingDesktopApp'),
      type: ToastType.Error,
    });
  }
}

const desktopService = {
  getDownloadAppUrl,
  openDownloadAppUrl,
};

export default desktopService;
