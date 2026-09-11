import { Page, Route } from '@playwright/test';
import { getLoggedUser } from './getUser';
import { mockAuthRoutes } from './authRouteMocks';

const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;
const OLD_API_URL = process.env.REACT_APP_API_URL;
const PAYMENTS_API_URL = process.env.REACT_APP_PAYMENTS_API_URL;
const BRIDGE_URL = process.env.REACT_APP_STORJ_BRIDGE;

const loggedUser = getLoggedUser();

export const ROOT_FOLDER_UUID: string = loggedUser.user.rootFolderId;

export type TrashRequest = { items: { uuid: string; type: string }[] };
export type MoveRequest = { uuid: string; destinationFolder: string; name?: string };
export type CreateFolderRequest = { plainName: string; parentFolderUuid: string };
export type ExistingFile = ReturnType<typeof buildExistingFile>;
export type ExistingFolder = ReturnType<typeof buildExistingFolder>;

/**
 * Every request the specs may want to assert on, recorded by the mocked routes.
 * Bridge uploads are only observable in Chromium: Playwright cannot route their CORS
 * preflight in Firefox, so assert on the task panel when a spec must run in both.
 */
export type RecordedRequests = {
  trash: TrashRequest[];
  moves: MoveRequest[];
  createdFolders: CreateFolderRequest[];
  bridge: string[];
};

export type MockedDriveOptions = {
  files?: ExistingFile[];
  folders?: ExistingFolder[];
  isVersioningEnabled?: boolean;
};

export const buildExistingFile = (id: number, plainName: string, type: string, folderUuid = ROOT_FOLDER_UUID) => ({
  id,
  uuid: `existing-file-uuid-${id}`,
  fileId: `existing-bridge-file-${id}`,
  name: plainName,
  plainName,
  plain_name: plainName,
  type,
  size: 1024,
  bucket: loggedUser.user.bucket,
  folderUuid,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  status: 'EXISTS',
  thumbnails: [],
});

export const buildExistingFolder = (id: number, plainName: string, parentUuid = ROOT_FOLDER_UUID) => ({
  id,
  uuid: `existing-folder-uuid-${id}`,
  name: plainName,
  plainName,
  plain_name: plainName,
  parentUuid,
  parentId: null,
  bucket: loggedUser.user.bucket,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  deleted: false,
  removed: false,
});

/**
 * The Drive the mocked API serves. Trashing removes items and creating a folder adds it,
 * so follow-up listings and duplicate checks see the new state.
 */
class InMemoryDrive {
  private files: ExistingFile[];
  private folders: ExistingFolder[];
  private createdFoldersCount = 0;

  constructor({ files = [], folders = [] }: MockedDriveOptions) {
    this.files = [...files];
    this.folders = [...folders];
  }

  filesIn(folderUuid: string) {
    return this.files.filter((file) => file.folderUuid === folderUuid);
  }

  foldersIn(folderUuid: string) {
    return this.folders.filter((folder) => folder.parentUuid === folderUuid);
  }

  createFolder({ plainName, parentFolderUuid }: CreateFolderRequest) {
    this.createdFoldersCount += 1;
    const folder = buildExistingFolder(1000 + this.createdFoldersCount, plainName, parentFolderUuid);
    this.folders.push(folder);
    return folder;
  }

  trash(uuids: string[]) {
    const trashed = new Set(uuids);
    this.files = this.files.filter((file) => !trashed.has(file.uuid));
    this.folders = this.folders.filter((folder) => !trashed.has(folder.uuid));
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
const mockAppBootstrapCalls = async (page: Page, isVersioningEnabled: boolean) => {
  for (const baseUrl of [BASE_API_URL, OLD_API_URL, PAYMENTS_API_URL]) {
    await page.route(`${baseUrl}/**`, (route) => fulfillJson(route, {}));
  }

  const bootstrapResponses: Record<string, unknown> = {
    'workspaces/': { availableWorkspaces: [], pendingWorkspaces: [] },
    'sharings/invites**': { invites: [] },
    'sharings/roles': [],
    'files/limits': { versioning: { enabled: isVersioningEnabled, maxVersions: 5 }, maxUploadFileSize: 21474836480 },
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
 * Folder listings and the file and folder duplicate checks, all scoped to the folder in
 * the URL.
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

    if (isExistenceCheck && url.endsWith('/folders/existence')) {
      const { plainNames } = request.postDataJSON() as { plainNames: string[] };
      const existentFolders = drive.foldersIn(folderUuid).filter((existing) => plainNames.includes(existing.plainName));
      return fulfillJson(route, { existentFolders });
    }

    if (url.includes('/files/')) return fulfillJson(route, { files: drive.filesIn(folderUuid) });
    if (url.includes('/folders/')) return fulfillJson(route, { folders: drive.foldersIn(folderUuid) });
    return fulfillJson(route, {});
  });

const mockCreateFolderRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  page.route(`${BASE_API_URL}/folders`, (route, request) => {
    if (request.method() !== 'POST') return route.fallback();

    const createFolderRequest = request.postDataJSON() as CreateFolderRequest;
    requests.createdFolders.push(createFolderRequest);
    return fulfillJson(route, drive.createFolder(createFolderRequest));
  });

const mockMoveFileRoute = (page: Page, requests: RecordedRequests) =>
  page.route(`${BASE_API_URL}/files/*`, (route, request) => {
    if (request.method() !== 'PATCH') return route.fallback();

    const uuid = request.url().split('/').pop() ?? '';
    const { destinationFolder, name } = request.postDataJSON() as Omit<MoveRequest, 'uuid'>;
    requests.moves.push(name ? { uuid, destinationFolder, name } : { uuid, destinationFolder });
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
 * given files and folders, blocks bucket uploads to the bridge, and returns the recorder
 * of every request a spec may assert on.
 * Routes are registered from the most generic to the most specific because Playwright
 * matches the last registered route first.
 */
export const mockDriveRoutes = async (page: Page, options: MockedDriveOptions): Promise<RecordedRequests> => {
  const drive = new InMemoryDrive(options);
  const requests: RecordedRequests = { trash: [], moves: [], createdFolders: [], bridge: [] };

  await mockAppBootstrapCalls(page, options.isVersioningEnabled ?? false);
  await mockAuthRoutes(page);
  await mockFolderContentRoutes(page, drive);
  await mockCreateFolderRoute(page, drive, requests);
  await mockMoveFileRoute(page, requests);
  await mockTrashRoute(page, drive, requests);
  await mockBridgeRoute(page, requests);

  return requests;
};
