import axios from 'axios';
import operatingSystemService from './operating-system.service';

const INTERNXT_BASE_URL = 'https://internxt.com';

async function getDownloadAppUrl() {
  const app = await axios({
    method: 'GET',
    url: `${INTERNXT_BASE_URL}/api/download`,
  });

  switch (operatingSystemService.getOperatingSystem()) {
    case 'LinuxOS':
    case 'UNIXOS':
      return app.data.platforms.Linux || `${INTERNXT_BASE_URL}/downloads/drive.deb`;
    case 'WindowsOS':
      return app.data.platforms.Windows || `${INTERNXT_BASE_URL}/downloads/drive.exe`;
    case 'MacOS':
      return app.data.platforms.MacOS || `${INTERNXT_BASE_URL}/downloads/drive.dmg`;
    default:
      break;
  }
}

const desktopService = {
  getDownloadAppUrl,
};

export default desktopService;
