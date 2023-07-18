import { detect } from 'detect-browser';

function getName(): string | undefined {
  return detect()?.name;
}

function isFirefox(): boolean {
  return getName() === 'firefox';
}

function isBrave(): boolean {
  const maybeBrave = (window.navigator as { brave?: { isBrave?: { name: 'isBrave' } } }).brave;

  return maybeBrave != undefined && maybeBrave?.isBrave?.name == 'isBrave';
}

function isFirefoxPrivateBrowsing(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!isFirefox()) return resolve(false);
      const db = window.indexedDB.open('check_firefox_private');
      // We are going to assume that if we cannot connect to indexedDB
      // this is Firefox Private Browsing since indexedDB is not available
      // in that Firefox mode
      db.onerror = () => resolve(true);
      db.onsuccess = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export enum Browser {
  Brave = 'Brave',
  Firefox = 'Firefox',
}
export type IsBrowserOptions = {
  browser: Browser;
  incognito?: boolean;
};

/**
 * Checks if we are running in a browser with the given configuration
 *
 * @param isBrowserOptions Options to check if we are running on that browser
 * @returns If we are running on a browser with that config
 */
async function isBrowser(isBrowserOptions: IsBrowserOptions): Promise<boolean> {
  const { browser, incognito } = isBrowserOptions;

  if (browser === Browser.Brave && !incognito) {
    return isBrave();
  }

  if (browser === Browser.Brave && incognito) {
    throw new Error('Not able to detect Brave in incognito mode');
  }

  if (browser === Browser.Firefox && !incognito) {
    return isFirefox();
  }

  if (browser === Browser.Firefox && incognito) {
    return isFirefoxPrivateBrowsing();
  }

  throw new Error('Incorrect browser options or browser not supported');
}

export default {
  getName,
  isFirefox,
  isBrave,
  isBrowser,
  isFirefoxPrivateBrowsing,
};
