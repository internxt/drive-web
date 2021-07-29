import operatingSystemService from './operating-system.service';

function getDownloadAppUrl(): string {
  switch (operatingSystemService.getOperatingSystem()) {
    case 'WindowsOS':
      window.location.href = 'https://internxt.com/downloads/drive.exe';
      break;
    case 'MacOS':
      window.location.href = 'https://internxt.com/downloads/drive.dmg';
      break;
    case 'Linux':
    case 'UNIXOS':
      window.location.href = 'https://internxt.com/downloads/drive.deb';
      break;
    default:
      window.location.href = 'https://github.com/internxt/drive-desktop/releases';
      break;
  }
}

const desktopService = {
  getDownloadAppUrl
};

export default desktopService;