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

/**
 * Every request the specs may want to assert on, recorded by the mocked routes.
 * Bridge uploads are only observable in Chromium: Playwright cannot route their CORS
 * preflight in Firefox, so assert on the task panel when a spec must run in both.
 */
export type RecordedRequests = {
  trash: TrashRequest[];
  bridge: string[];
};

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

/**
 * The Drive the mocked API serves. Trashing removes items, so follow-up listings and
 * duplicate checks see the new state.
 */
class InMemoryDrive {
  private files: ExistingFile[];

  constructor(files: ExistingFile[]) {
    this.files = [...files];
  }

  filesIn(folderUuid: string) {
    return this.files.filter((file) => file.folderUuid === folderUuid);
  }

  trash(uuids: string[]) {
    const trashed = new Set(uuids);
    this.files = this.files.filter((file) => !trashed.has(file.uuid));
  }
}

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const getFolderUuidFromUrl = (url: string) => /\/folders\/content\/([^/?]+)/.exec(url)?.[1] ?? '';

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
 * Folder listings and the file duplicate check, scoped to the folder in the URL.
 */
const mockFolderContentRoutes = (page: Page, drive: InMemoryDrive) =>
  page.route(`${BASE_API_URL}/folders/content/**`, (route, request) => {
    const url = request.url();
    const folderUuid = getFolderUuidFromUrl(url);
    const isExistenceCheck = request.method() === 'POST';

    if (isExistenceCheck && url.endsWith('/files/existence')) {
      const { files } = request.postDataJSON() as { files: { plainName: string; type: string }[] };
      const existentFiles = drive
        .filesIn(folderUuid)
        .filter((existing) =>
          files.some((file) => file.plainName === existing.plainName && file.type === existing.type),
        );
      return fulfillJson(route, { existentFiles });
    }

    if (isExistenceCheck) return fulfillJson(route, { existentFolders: [] });
    if (url.includes('/files/')) return fulfillJson(route, { files: drive.filesIn(folderUuid) });
    if (url.includes('/folders/')) return fulfillJson(route, { folders: [] });
    return fulfillJson(route, {});
  });

const mockTrashRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  page.route(`${BASE_API_URL}/storage/trash/add`, (route, request) => {
    const trashRequest = request.postDataJSON() as TrashRequest;
    drive.trash(trashRequest.items.map((item) => item.uuid));
    requests.trash.push(trashRequest);
    return fulfillJson(route, {});
  });

const mockBridgeRoute = (page: Page, requests: RecordedRequests) =>
  page.route(`${BRIDGE_URL}/**buckets/**`, (route, request) => {
    requests.bridge.push(request.url());
    return route.abort();
  });

/**
 * Mocks everything a logged-in Drive view needs on top of an in-memory Drive made of the
 * given files, blocks bucket uploads to the bridge, and returns the recorder of every
 * request a spec may assert on.
 * Routes are registered from the most generic to the most specific because Playwright
 * matches the last registered route first.
 */
export const mockDriveRoutes = async (page: Page, files: ExistingFile[]): Promise<RecordedRequests> => {
  const drive = new InMemoryDrive(files);
  const requests: RecordedRequests = { trash: [], bridge: [] };

  await mockAppBootstrapCalls(page);
  await mockAuthRoutes(page);
  await mockFolderContentRoutes(page, drive);
  await mockTrashRoute(page, drive, requests);
  await mockBridgeRoute(page, requests);

  return requests;
};
