function getOperatingSystem(): string {
  let operatingSystem = 'Not known';

  if (globalThis.navigator.appVersion.includes('Win')) {
    operatingSystem = 'WindowsOS';
  }
  if (globalThis.navigator.appVersion.includes('Mac')) {
    operatingSystem = 'MacOS';
  }
  if (globalThis.navigator.appVersion.includes('X11')) {
    operatingSystem = 'UNIXOS';
  }
  if (globalThis.navigator.appVersion.includes('Linux')) {
    operatingSystem = 'LinuxOS';
  }

  return operatingSystem;
}

const operatingSystemService = {
  getOperatingSystem,
};

export default operatingSystemService;
