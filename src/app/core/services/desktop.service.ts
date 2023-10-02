import axios from 'axios';
import operatingSystemService from './operating-system.service';

async function getDownloadAppUrl() {
  const app = await fetch('https://internxt.com/api/download', {
    method: 'GET',
  });

  const platforms = await app.json();

  switch (operatingSystemService.getOperatingSystem()) {
    case 'LinuxOS' || 'UNIXOS':
      return platforms.platforms.Linux || 'https://internxt.com/downloads/drive.deb';
    case 'WindowsOS':
      return platforms.platforms.Windows || 'https://internxt.com/downloads/drive.exe';
    case 'MacOS':
      return platforms.platforms.MacOS || 'https://internxt.com/downloads/drive.dmg';
    default:
      break;
  }
}

const desktopService = {
  getDownloadAppUrl,
};

export default desktopService;
