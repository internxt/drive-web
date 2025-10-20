import envService from 'app/core/services/env.service';

export const CANONICAL_DRIVE_HOSTNAME = 'drive.internxt.com';
export const CANONICAL_DRIVE_ORIGIN = `https://${CANONICAL_DRIVE_HOSTNAME}`;

const WHITELISTED_PATH_PREFIXES = new Set(['/sh/file/', '/sh/folder/', '/d/file/', '/d/folder/']);

export const isWhitelistedPath = (pathname: string): boolean => {
  const parts = pathname.split('/');
  if (parts.length < 3) return false;

  const prefix = `/${parts[1]}/${parts[2]}/`;
  return WHITELISTED_PATH_PREFIXES.has(prefix);
};

export const buildCanonicalUrlFromParts = (pathname: string, search: string, hash: string): string => {
  try {
    const relativeUrl = `${pathname}${search}${hash}`;
    const normalizedUrl = new URL(relativeUrl, CANONICAL_DRIVE_ORIGIN);

    if (normalizedUrl.origin !== CANONICAL_DRIVE_ORIGIN) {
      return CANONICAL_DRIVE_ORIGIN;
    }

    return normalizedUrl.toString();
  } catch {
    return CANONICAL_DRIVE_ORIGIN;
  }
};

export const buildSafeCanonicalUrl = (): string => {
  const isBrowser = globalThis?.location !== undefined;

  if (!isBrowser) {
    return CANONICAL_DRIVE_ORIGIN;
  }

  const { pathname, search, hash } = globalThis.location;
  return buildCanonicalUrlFromParts(pathname, search, hash);
};

export const enforceCanonicalDriveDomain = (): void => {
  const isBrowser = globalThis !== undefined;

  if (!isBrowser || !envService.isProduction()) {
    return;
  }

  const shouldSkipRedirect = envService.getVariable('dontRedirect') === 'true';

  if (shouldSkipRedirect) {
    return;
  }

  const { hostname, pathname } = globalThis.location;

  if (hostname === CANONICAL_DRIVE_HOSTNAME) {
    return;
  }

  if (isWhitelistedPath(pathname)) {
    return;
  }

  const safeUrl = buildSafeCanonicalUrl();

  globalThis.location.replace(safeUrl);
};
