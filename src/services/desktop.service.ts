import operatingSystemService from './operating-system.service';

function getDownloadAppUrl(): string {
  let url: string;

  switch (operatingSystemService.getOperatingSystem()) {
    case 'WindowsOS':
      url = 'https://internxt.com/downloads/drive.exe';
      break;
    case 'MacOS':
      url = 'https://internxt.com/downloads/drive.dmg';
      break;
    case 'LinuxOS':
    case 'UNIXOS':
      url = 'https://internxt.com/downloads/drive.deb';
      break;
    default:
      url = 'https://github.com/internxt/drive-desktop/releases';
      break;
  }

  return url;
}

const desktopService = {
  getDownloadAppUrl
};

export default desktopService;