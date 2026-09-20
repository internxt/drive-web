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
export type TrashedFile = ReturnType<typeof buildTrashedFile>;

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
  trashedFiles?: TrashedFile[];
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

const toTrashedFile = (file: ExistingFile, originalFolderUuid: string) => ({
  ...file,
  status: 'TRASHED',
  parent: { uuid: originalFolderUuid, status: 'EXISTS' },
});

export const buildTrashedFile = (id: number, plainName: string, type: string, originalFolderUuid = ROOT_FOLDER_UUID) =>
  toTrashedFile(buildExistingFile(id, plainName, type, originalFolderUuid), originalFolderUuid);

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

const ROOT_FOLDER: ExistingFolder = { ...buildExistingFolder(0, 'Drive', ''), uuid: ROOT_FOLDER_UUID };

/**
 * The Drive the mocked API serves. Trashing, creating and moving update it, so follow-up
 * listings and duplicate checks see the new state.
 */
class InMemoryDrive {
  private files: ExistingFile[];
  private folders: ExistingFolder[];
  private trashedFiles: TrashedFile[];
  private createdFoldersCount = 0;

  constructor({ files = [], folders = [], trashedFiles = [] }: MockedDriveOptions) {
    this.files = [...files];
    this.folders = [...folders];
    this.trashedFiles = [...trashedFiles];
  }

  trashedFilesPage(offset: number, limit: number) {
    return this.trashedFiles.slice(offset, offset + limit).map((file) => ({
      ...file,
      parent: { ...file.parent, plainName: this.findFolder(file.parent.uuid)?.plainName },
    }));
  }

  moveFile({ uuid, destinationFolder, name }: MoveRequest) {
    const file = [...this.files, ...this.trashedFiles].find((candidate) => candidate.uuid === uuid);
    if (!file) return;

    const movedName = name ?? file.plainName;
    const movedFile: ExistingFile = {
      ...buildExistingFile(file.id, movedName, file.type, destinationFolder),
      uuid: file.uuid,
      fileId: file.fileId,
    };

    this.files = this.files.filter((candidate) => candidate.uuid !== uuid);
    this.trashedFiles = this.trashedFiles.filter((candidate) => candidate.uuid !== uuid);
    this.files.push(movedFile);
  }

  filesIn(folderUuid: string) {
    return this.files.filter((file) => file.folderUuid === folderUuid);
  }

  foldersIn(folderUuid: string) {
    return this.folders.filter((folder) => folder.parentUuid === folderUuid);
  }

  findFolder(folderUuid: string) {
    return this.folders.find((folder) => folder.uuid === folderUuid);
  }

  ancestorsOf(folderUuid: string) {
    const ancestors: ExistingFolder[] = [];
    let folder = this.findFolder(folderUuid);

    while (folder) {
      ancestors.push(folder);
      folder = this.findFolder(folder.parentUuid);
    }

    return [...ancestors, ROOT_FOLDER];
  }

  createFolder({ plainName, parentFolderUuid }: CreateFolderRequest) {
    this.createdFoldersCount += 1;
    const folder = buildExistingFolder(1000 + this.createdFoldersCount, plainName, parentFolderUuid);
    this.folders.push(folder);
    return folder;
  }

  trash(uuids: string[]) {
    const trashed = new Set(uuids);
    const newlyTrashedFiles = this.files
      .filter((file) => trashed.has(file.uuid))
      .map((file) => toTrashedFile(file, file.folderUuid));

    this.trashedFiles.push(...newlyTrashedFiles);
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

const mockFolderNavigationRoutes = async (page: Page, drive: InMemoryDrive) => {
  const getFolderUuid = (url: string) => /\/folders\/([^/?]+)\/(meta|ancestors)/.exec(url)?.[1] ?? '';

  await page.route(`${BASE_API_URL}/folders/*/meta`, (route, request) => {
    const folder = drive.findFolder(getFolderUuid(request.url()));
    if (!folder) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });

    return fulfillJson(route, folder);
  });

  await page.route(`${BASE_API_URL}/folders/*/ancestors`, (route, request) =>
    fulfillJson(route, drive.ancestorsOf(getFolderUuid(request.url()))),
  );
};

const mockCreateFolderRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  page.route(`${BASE_API_URL}/folders`, (route, request) => {
    if (request.method() !== 'POST') return route.fallback();

    const createFolderRequest = request.postDataJSON() as CreateFolderRequest;
    requests.createdFolders.push(createFolderRequest);
    return fulfillJson(route, drive.createFolder(createFolderRequest));
  });

const mockMoveFileRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  page.route(`${BASE_API_URL}/files/*`, (route, request) => {
    if (request.method() !== 'PATCH') return route.fallback();

    const uuid = request.url().split('/').pop() ?? '';
    const { destinationFolder, name } = request.postDataJSON() as Omit<MoveRequest, 'uuid'>;
    const moveRequest: MoveRequest = name ? { uuid, destinationFolder, name } : { uuid, destinationFolder };
    drive.moveFile(moveRequest);
    requests.moves.push(moveRequest);
    return fulfillJson(route, {});
  });

export const failMovesOf = async (page: Page, file: ExistingFile | TrashedFile): Promise<MoveRequest[]> => {
  const rejectedMoves: MoveRequest[] = [];

  await page.route(`${BASE_API_URL}/files/${file.uuid}`, (route, request) => {
    if (request.method() !== 'PATCH') return route.fallback();

    const { destinationFolder, name } = request.postDataJSON() as Omit<MoveRequest, 'uuid'>;
    rejectedMoves.push({ uuid: file.uuid, destinationFolder, name });
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    });
  });

  return rejectedMoves;
};

const mockTrashListingRoute = (page: Page, drive: InMemoryDrive) =>
  page.route(`${BASE_API_URL}/storage/trash/paginated**`, (route, request) => {
    const query = new URL(request.url()).searchParams;
    if (query.get('type') !== 'files') return fulfillJson(route, { result: [] });

    const offset = Number(query.get('offset') ?? 0);
    const limit = Number(query.get('limit') ?? 50);
    return fulfillJson(route, { result: drive.trashedFilesPage(offset, limit) });
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
  await mockFolderNavigationRoutes(page, drive);
  await mockCreateFolderRoute(page, drive, requests);
  await mockMoveFileRoute(page, drive, requests);
  await mockTrashRoute(page, drive, requests);
  await mockTrashListingRoute(page, drive);
  await mockBridgeRoute(page, requests);

  return requests;
};
