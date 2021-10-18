function getOperatingSystem(): string {
  let operatingSystem = 'Not known';

  if (window.navigator.appVersion.indexOf('Win') !== -1) {
    operatingSystem = 'WindowsOS';
  }
  if (window.navigator.appVersion.indexOf('Mac') !== -1) {
    operatingSystem = 'MacOS';
  }
  if (window.navigator.appVersion.indexOf('X11') !== -1) {
    operatingSystem = 'UNIXOS';
  }
  if (window.navigator.appVersion.indexOf('Linux') !== -1) {
    operatingSystem = 'LinuxOS';
  }

  return operatingSystem;
}

const operatingSystemService = {
  getOperatingSystem,
};

export default operatingSystemService;
