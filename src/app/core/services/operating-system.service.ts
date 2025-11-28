export type OperatingSystem = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'UNIX' | 'Unknown';

function getOperatingSystem(): OperatingSystem {
  const uaData = navigator.userAgentData;
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (platform.includes('android')) return 'Android';
    if (platform.includes('ios')) return 'iOS';
  }

  const ua = navigator.userAgent ?? navigator.vendor ?? window.opera;
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';

  const appVersion = navigator.appVersion ?? '';
  if (appVersion.indexOf('Win') !== -1) return 'Windows';
  if (appVersion.indexOf('Mac') !== -1) return 'macOS';
  if (appVersion.indexOf('Linux') !== -1) return 'Linux';
  if (appVersion.indexOf('X11') !== -1) return 'UNIX';

  return 'Unknown';
}

const operatingSystemService = {
  getOperatingSystem,
};

export default operatingSystemService;
