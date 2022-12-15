import operatingSystemService from './operating-system.service';

interface AssetInfo {
  browser_download_url: string;
}

interface LatestReleaseInfo {
  id: number;
  name: string;
  published_at: Date;
  assets: AssetInfo[];
}

export async function getLatestReleaseInfo(user: string, repo: string) {
  const fetchUrl = `https://api.github.com/repos/${user}/${repo}/releases/latest`;
  const res = await fetch(fetchUrl);

  if (res.status !== 200) {
    throw Error('Release not found');
  }

  const info: LatestReleaseInfo = await res.json();

  let windows;
  let linux;
  let macos;

  info.assets.forEach((asset) => {
    const match: any = asset.browser_download_url.match(/\.(\w+)$/);

    switch (match[1]) {
      case 'exe':
        windows = asset.browser_download_url;
        break;
      case 'dmg':
        macos = asset.browser_download_url;
        break;
      case 'deb':
        linux = asset.browser_download_url;
        break;
      default:
        break;
    }
  });

  const url = {
    version: info.name,
    links: {
      windows,
      linux,
      macos,
    },
    cached: false,
  };

  return url;
}

async function getDownloadAppUrl(): Promise<string> {
  const release = await getLatestReleaseInfo('internxt', 'drive-desktop').catch(() => ({
    cached: false,
    links: { linux: null, windows: null, macos: null },
  }));

  let url: string;

  switch (operatingSystemService.getOperatingSystem()) {
    case 'WindowsOS':
      url = release.links.windows || '';
      break;
    case 'MacOS':
      url = release.links.macos || '';
      break;
    case 'LinuxOS':
      url = release.links.linux || '';
      break;
    default:
      url = '';
      break;
  }

  return url;
}

const desktopService = {
  getDownloadAppUrl,
};

export default desktopService;
