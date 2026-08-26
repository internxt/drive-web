import { Page, Route } from '@playwright/test';
import { getLoggedUser } from './getUser';
import { mockAuthRoutes } from './authRouteMocks';

const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;
const OLD_API_URL = process.env.REACT_APP_API_URL;
const PAYMENTS_API_URL = process.env.REACT_APP_PAYMENTS_API_URL;
const BRIDGE_URL = process.env.REACT_APP_STORJ_BRIDGE;

const loggedUser = getLoggedUser();

export type TrashRequest = { items: { uuid: string; type: string }[] };
export type ExistingFile = ReturnType<typeof buildExistingFile>;

export const buildExistingFile = (id: number, plainName: string, type: string) => ({
  id,
  uuid: `existing-file-uuid-${id}`,
  fileId: `existing-bridge-file-${id}`,
  name: plainName,
  plainName,
  plain_name: plainName,
  type,
  size: 1024,
  bucket: loggedUser.user.bucket,
  folderUuid: loggedUser.user.rootFolderId,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  status: 'EXISTS',
  thumbnails: [],
});

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Answers the calls the app makes while bootstrapping the Drive view with minimal valid
 * payloads, and any other API call with an empty 200. The app logs the user out on any
 * 401, and the mocked session token is not valid against a real backend.
 */
const mockAppBootstrapCalls = async (page: Page) => {
  for (const baseUrl of [BASE_API_URL, OLD_API_URL, PAYMENTS_API_URL]) {
    await page.route(`${baseUrl}/**`, (route) => fulfillJson(route, {}));
  }

  const bootstrapResponses: Record<string, unknown> = {
    'workspaces/': { availableWorkspaces: [], pendingWorkspaces: [] },
    'sharings/invites**': { invites: [] },
    'sharings/roles': [],
    'files/limits': { versioning: { enabled: false, maxVersions: 0 }, maxUploadFileSize: 21474836480 },
    'users/limit': { maxSpaceBytes: 10737418240 },
    'users/usage': { drive: 3072, backups: 0, total: 3072 },
    'users/me/upload-status': { hasUploadedFiles: true },
    'users/avatar/refresh': { avatar: null },
    'referral/enabled': { enabled: false },
  };

  for (const [path, body] of Object.entries(bootstrapResponses)) {
    await page.route(`${BASE_API_URL}/${path}`, (route) => fulfillJson(route, body));
  }
};

/**
 * Mocks everything a logged-in Drive view with the given files needs: app bootstrap and auth
 * calls, the root folder listing and the duplicate checks against it. Records every "move to
 * trash" request and blocks bucket uploads to the bridge while recording them.
 * Routes are registered from the most generic to the most specific because Playwright matches
 * the last registered route first.
 */
export const mockDriveRoutes = async (
  page: Page,
  {
    existingFiles,
    trashRequests,
    bridgeRequests,
  }: { existingFiles: ExistingFile[]; trashRequests: TrashRequest[]; bridgeRequests: string[] },
) => {
  await mockAppBootstrapCalls(page);
  await mockAuthRoutes(page);

  await page.route(`${BASE_API_URL}/folders/content/**`, (route, request) => {
    const url = request.url();
    const isExistenceCheck = request.method() === 'POST';

    if (isExistenceCheck && url.endsWith('/files/existence')) {
      const { files } = request.postDataJSON() as { files: { plainName: string; type: string }[] };
      const existentFiles = existingFiles.filter((existing) =>
        files.some((file) => file.plainName === existing.plainName && file.type === existing.type),
      );
      return fulfillJson(route, { existentFiles });
    }

    if (isExistenceCheck) return fulfillJson(route, { existentFolders: [] });
    if (url.includes('/files/')) return fulfillJson(route, { files: existingFiles });
    if (url.includes('/folders/')) return fulfillJson(route, { folders: [] });
    return fulfillJson(route, {});
  });

  await page.route(`${BASE_API_URL}/storage/trash/add`, (route, request) => {
    trashRequests.push(request.postDataJSON());
    return fulfillJson(route, {});
  });

  await page.route(`${BRIDGE_URL}/**buckets/**`, (route, request) => {
    bridgeRequests.push(request.url());
    return route.abort();
  });
};
