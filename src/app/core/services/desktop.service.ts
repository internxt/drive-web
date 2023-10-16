import operatingSystemService from './operating-system.service';

const INTERNXT_BASE_URL = 'https://internxt.com';

async function getDownloadAppUrl() {
  const app = await fetch(`${INTERNXT_BASE_URL}/api/download`, {
    method: 'GET',
  });

  const platforms = await app.json();

  switch (operatingSystemService.getOperatingSystem()) {
    case 'LinuxOS':
    case 'UNIXOS':
      return platforms.platforms.Linux || `${INTERNXT_BASE_URL}/downloads/drive.deb`;
    case 'WindowsOS':
      return platforms.platforms.Windows || `${INTERNXT_BASE_URL}/downloads/drive.exe`;
    case 'MacOS':
      return platforms.platforms.MacOS || `${INTERNXT_BASE_URL}/downloads/drive.dmg`;
    default:
      break;
  }
}

const desktopService = {
  getDownloadAppUrl,
};

export default desktopService;
