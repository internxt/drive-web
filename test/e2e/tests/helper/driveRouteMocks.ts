import { Page, Request, Route } from '@playwright/test';
import { randomBytes, randomUUID } from 'crypto';
import { BASE_API_URL, loggedUser, mockAuthRoutes } from './authRouteMocks';

const OLD_API_URL = process.env.REACT_APP_API_URL;
const PAYMENTS_API_URL = process.env.REACT_APP_PAYMENTS_API_URL;
const BRIDGE_URL = process.env.REACT_APP_STORJ_BRIDGE;
const SHARDS_URL = 'https://e2e-shards.internxt.test';

const FOLDER_CONTENT_UUID_PATTERN = /\/folders\/content\/([^/?]+)/;
const FILE_META_UUID_PATTERN = /\/files\/([^/]+)\/meta/;
const BRIDGE_FILE_INFO_ID_PATTERN = /\/files\/([^/]+)\/info/;
const FILES_LISTING_PATH = '/files/';
const START_UPLOAD_PATH = '/files/start';
const FINISH_UPLOAD_PATH = '/files/finish';
const FILES_EXISTENCE_PATH = '/files/existence';
const FOLDERS_EXISTENCE_PATH = '/folders/existence';

const HTTP_METHOD = { get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH' };
const HTTP_NOT_FOUND = 404;
const SHARD_CONTENT_TYPE = 'application/octet-stream';

const BRIDGE_FILE_VERSION = 2;
const BRIDGE_FILE_ID_BYTES = 12;
const FIRST_UPLOADED_FILE_ID = 5000;
const FIRST_THUMBNAIL_ID = 9000;
const FIRST_CREATED_FOLDER_ID = 1000;
const EXISTING_FILE_SIZE = 1024;
const ITEM_TIMESTAMP = '2026-08-01T10:00:00.000Z';
const ITEM_STATUS = 'EXISTS';

const GIGABYTE = 1024 ** 3;
const MAX_UPLOAD_FILE_SIZE = 20 * GIGABYTE;
const MAX_SPACE_BYTES = 10 * GIGABYTE;
const USED_SPACE_BYTES = 3072;
const MAX_FILE_VERSIONS = 5;

const NO_DUPLICATES = { existentFiles: [], existentFolders: [] };
const buildBootstrapResponses = (isVersioningEnabled: boolean): Record<string, unknown> => ({
  'workspaces/': { availableWorkspaces: [], pendingWorkspaces: [] },
  'sharings/invites**': { invites: [] },
  'sharings/roles': [],
  'files/limits': {
    versioning: { enabled: isVersioningEnabled, maxVersions: MAX_FILE_VERSIONS },
    maxUploadFileSize: MAX_UPLOAD_FILE_SIZE,
  },
  'users/limit': { maxSpaceBytes: MAX_SPACE_BYTES },
  'users/usage': { drive: USED_SPACE_BYTES, backups: 0, total: USED_SPACE_BYTES },
  'users/me/upload-status': { hasUploadedFiles: true },
  'users/avatar/refresh': { avatar: null },
  'referral/enabled': { enabled: false },
});

type RouteHandler = (route: Route, request: Request) => Promise<void>;
type FileEntryRequest = {
  fileId: string;
  type: string;
  size: number;
  plainName: string;
  bucket: string;
  folderUuid: string;
};
type ThumbnailEntryRequest = {
  bucketFile: string;
  bucketId: string;
  fileUuid: string;
  type: string;
  size: number;
  maxWidth: number;
  maxHeight: number;
  encryptVersion: string;
};
type FinishUploadRequest = {
  index: string;
  shards: { hash: string; uuid: string }[];
  hmac?: { type: string; value: string };
};

type ExistenceCheckRequest = { files: { plainName: string; type: string }[] };
type FolderExistenceCheckRequest = { plainNames: string[] };
export type TrashRequest = { items: { uuid: string; type: string }[] };
export type MoveRequest = { uuid: string; destinationFolder: string; name?: string };
export type CreateFolderRequest = { plainName: string; parentFolderUuid: string };

export const ROOT_FOLDER_UUID: string = loggedUser.user.rootFolderId;

/**
 * Uploads only reach the bridge, and so `fileEntries`, in Chromium: Playwright cannot route
 * the bridge CORS preflight in Firefox.
 */
type RecordedRequests = {
  fileEntries: FileEntryRequest[];
  thumbnailEntries: ThumbnailEntryRequest[];
  downloadedFileIds: string[];
  trash: TrashRequest[];
  moves: MoveRequest[];
  createdFolders: CreateFolderRequest[];
  replacedFileUuids: string[];
};
export type MockedDriveOptions = {
  files?: ExistingFile[];
  folders?: ExistingFolder[];
  declaredSizes?: Record<string, number>;
  isVersioningEnabled?: boolean;
};

const buildThumbnail = (id: number, fileId: number, entry: ThumbnailEntryRequest) => ({
  id,
  file_id: fileId,
  max_width: entry.maxWidth,
  max_height: entry.maxHeight,
  type: entry.type,
  size: entry.size,
  bucket_id: entry.bucketId,
  bucket_file: entry.bucketFile,
  encrypt_version: entry.encryptVersion,
});
type StoredThumbnail = ReturnType<typeof buildThumbnail>;

const buildFile = (
  id: number,
  { fileId, type, size, plainName, bucket, folderUuid }: FileEntryRequest,
  uuid: string = randomUUID(),
) => {
  const thumbnails: StoredThumbnail[] = [];

  return {
    id,
    uuid,
    fileId,
    name: plainName,
    plainName,
    plain_name: plainName,
    type,
    size,
    bucket,
    folderUuid,
    createdAt: ITEM_TIMESTAMP,
    updatedAt: ITEM_TIMESTAMP,
    status: ITEM_STATUS,
    thumbnails,
  };
};
type StoredFile = ReturnType<typeof buildFile>;

export const buildExistingFile = (id: number, plainName: string, type: string, folderUuid = ROOT_FOLDER_UUID) =>
  buildFile(
    id,
    {
      fileId: `existing-bridge-file-${id}`,
      type,
      size: EXISTING_FILE_SIZE,
      plainName,
      bucket: loggedUser.user.bucket,
      folderUuid,
    },
    `existing-file-uuid-${id}`,
  );
export type ExistingFile = StoredFile;

export const buildExistingFolder = (id: number, plainName: string, parentUuid = ROOT_FOLDER_UUID) => ({
  id,
  uuid: `existing-folder-uuid-${id}`,
  name: plainName,
  plainName,
  plain_name: plainName,
  parentUuid,
  parentId: null,
  bucket: loggedUser.user.bucket,
  createdAt: ITEM_TIMESTAMP,
  updatedAt: ITEM_TIMESTAMP,
  deleted: false,
  removed: false,
});
export type ExistingFolder = ReturnType<typeof buildExistingFolder>;

/**
 * Trashing removes items and creating a folder adds it, so follow-up listings and
 * existence checks see the new state.
 */
class InMemoryDrive {
  private files: StoredFile[];
  private folders: ExistingFolder[];
  private readonly declaredSizes: Record<string, number>;
  private uploadedFilesCount = 0;
  private thumbnailsCount = 0;
  private createdFoldersCount = 0;

  constructor({ files = [], folders = [], declaredSizes = {} }: MockedDriveOptions) {
    this.files = [...files];
    this.folders = [...folders];
    this.declaredSizes = declaredSizes;
  }

  filesIn(folderUuid: string) {
    return this.files.filter((file) => file.folderUuid === folderUuid);
  }

  existingFilesIn(folderUuid: string, candidates: ExistenceCheckRequest['files']) {
    return this.filesIn(folderUuid).filter((existing) =>
      candidates.some(({ plainName, type }) => plainName === existing.plainName && type === existing.type),
    );
  }

  foldersIn(folderUuid: string) {
    return this.folders.filter((folder) => folder.parentUuid === folderUuid);
  }

  existingFoldersIn(folderUuid: string, plainNames: string[]) {
    return this.foldersIn(folderUuid).filter((existing) => plainNames.includes(existing.plainName));
  }

  createFolder({ plainName, parentFolderUuid }: CreateFolderRequest) {
    const folder = buildExistingFolder(FIRST_CREATED_FOLDER_ID + this.createdFoldersCount, plainName, parentFolderUuid);
    this.createdFoldersCount += 1;
    this.folders.push(folder);
    return folder;
  }

  trash(uuids: string[]) {
    const trashed = new Set(uuids);
    this.files = this.files.filter((file) => !trashed.has(file.uuid));
    this.folders = this.folders.filter((folder) => !trashed.has(folder.uuid));
  }

  findFile(uuid: string) {
    return this.files.find((file) => file.uuid === uuid);
  }

  addFile(entry: FileEntryRequest) {
    const size = this.declaredSizes[entry.plainName] ?? entry.size;
    const file = buildFile(FIRST_UPLOADED_FILE_ID + this.uploadedFilesCount, { ...entry, size });
    this.uploadedFilesCount += 1;
    this.files.push(file);
    return file;
  }

  addThumbnail(entry: ThumbnailEntryRequest) {
    const file = this.findFile(entry.fileUuid);
    if (!file) return undefined;

    this.thumbnailsCount += 1;
    const thumbnail = buildThumbnail(FIRST_THUMBNAIL_ID + this.thumbnailsCount, file.id, entry);
    file.thumbnails.push(thumbnail);
    return thumbnail;
  }
}

class InMemoryBridge {
  private readonly shards = new Map<string, Buffer>();
  private readonly files = new Map<string, FinishUploadRequest>();

  startUpload() {
    const uuid = randomUUID();
    return { index: 0, uuid, url: `${SHARDS_URL}/${uuid}`, urls: null };
  }

  storeShard(uuid: string, content: Buffer) {
    this.shards.set(uuid, content);
  }

  readShard(uuid: string) {
    return this.shards.get(uuid);
  }

  finishUpload(upload: FinishUploadRequest) {
    const id = randomBytes(BRIDGE_FILE_ID_BYTES).toString('hex');
    this.files.set(id, upload);
    return { id, index: upload.index, bucket: loggedUser.user.bucket };
  }

  fileInfo(id: string) {
    const upload = this.files.get(id);
    if (!upload) return undefined;

    const shards = upload.shards.map(({ hash, uuid }, index) => ({
      index,
      hash,
      size: this.readShard(uuid)?.length ?? 0,
      url: `${SHARDS_URL}/${uuid}`,
    }));

    return {
      id,
      bucket: loggedUser.user.bucket,
      index: upload.index,
      hmac: upload.hmac,
      version: BRIDGE_FILE_VERSION,
      size: shards.reduce((total, shard) => total + shard.size, 0),
      shards,
    };
  }
}

const firstCapture = (pattern: RegExp, url: string) => pattern.exec(url)?.[1] ?? '';

const fulfillNotFound = (route: Route) => route.fulfill({ status: HTTP_NOT_FOUND });

const fulfillJsonIfFound = (route: Route, body: object | undefined) =>
  body ? route.fulfill({ json: body }) : fulfillNotFound(route);

const mockRouteForMethod = (page: Page, url: string, method: string, handler: RouteHandler) =>
  page.route(url, (route, request) => (request.method() === method ? handler(route, request) : route.fallback()));

const mockAppBootstrapCalls = async (page: Page, isVersioningEnabled: boolean) => {
  for (const baseUrl of [BASE_API_URL, OLD_API_URL, PAYMENTS_API_URL]) {
    await page.route(`${baseUrl}/**`, (route) => route.fulfill({ json: {} }));
  }

  for (const [path, body] of Object.entries(buildBootstrapResponses(isVersioningEnabled))) {
    await page.route(`${BASE_API_URL}/${path}`, (route) => route.fulfill({ json: body }));
  }
};

const fulfillExistenceCheck = (route: Route, request: Request, drive: InMemoryDrive) => {
  const url = request.url();
  const folderUuid = firstCapture(FOLDER_CONTENT_UUID_PATTERN, url);

  if (url.endsWith(FILES_EXISTENCE_PATH)) {
    const { files } = request.postDataJSON() as ExistenceCheckRequest;
    return route.fulfill({ json: { existentFiles: drive.existingFilesIn(folderUuid, files) } });
  }
  if (url.endsWith(FOLDERS_EXISTENCE_PATH)) {
    const { plainNames } = request.postDataJSON() as FolderExistenceCheckRequest;
    return route.fulfill({ json: { existentFolders: drive.existingFoldersIn(folderUuid, plainNames) } });
  }
  return route.fulfill({ json: NO_DUPLICATES });
};

const mockFolderContentRoutes = async (page: Page, drive: InMemoryDrive) => {
  const folderContentUrl = `${BASE_API_URL}/folders/content/**`;

  await page.route(folderContentUrl, (route, request) => {
    const url = request.url();
    const folderUuid = firstCapture(FOLDER_CONTENT_UUID_PATTERN, url);
    const isFilesListing = url.includes(FILES_LISTING_PATH);
    return route.fulfill({
      json: isFilesListing ? { files: drive.filesIn(folderUuid) } : { folders: drive.foldersIn(folderUuid) },
    });
  });
  await mockRouteForMethod(page, folderContentUrl, HTTP_METHOD.post, (route, request) =>
    fulfillExistenceCheck(route, request, drive),
  );
};

const mockFileEntryRoutes = async (page: Page, drive: InMemoryDrive, requests: RecordedRequests) => {
  await mockRouteForMethod(page, `${BASE_API_URL}/files`, HTTP_METHOD.post, (route, request) => {
    const fileEntry = request.postDataJSON() as FileEntryRequest;
    requests.fileEntries.push(fileEntry);
    return route.fulfill({ json: drive.addFile(fileEntry) });
  });

  await mockRouteForMethod(page, `${BASE_API_URL}/files/thumbnail`, HTTP_METHOD.post, (route, request) => {
    const thumbnailEntry = request.postDataJSON() as ThumbnailEntryRequest;
    requests.thumbnailEntries.push(thumbnailEntry);
    return fulfillJsonIfFound(route, drive.addThumbnail(thumbnailEntry));
  });

  await mockRouteForMethod(page, `${BASE_API_URL}/files/*/meta`, HTTP_METHOD.get, (route, request) =>
    fulfillJsonIfFound(route, drive.findFile(firstCapture(FILE_META_UUID_PATTERN, request.url()))),
  );
};

const mockCreateFolderRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  mockRouteForMethod(page, `${BASE_API_URL}/folders`, HTTP_METHOD.post, (route, request) => {
    const createFolderRequest = request.postDataJSON() as CreateFolderRequest;
    requests.createdFolders.push(createFolderRequest);
    return route.fulfill({ json: drive.createFolder(createFolderRequest) });
  });

const mockMoveFileRoute = (page: Page, requests: RecordedRequests) =>
  mockRouteForMethod(page, `${BASE_API_URL}/files/*`, HTTP_METHOD.patch, (route, request) => {
    const uuid = request.url().split('/').pop() ?? '';
    const { destinationFolder, name } = request.postDataJSON() as Omit<MoveRequest, 'uuid'>;
    requests.moves.push(name ? { uuid, destinationFolder, name } : { uuid, destinationFolder });
    return route.fulfill({ json: {} });
  });

const mockReplaceFileRoute = (page: Page, requests: RecordedRequests) =>
  mockRouteForMethod(page, `${BASE_API_URL}/files/*`, HTTP_METHOD.put, (route, request) => {
    requests.replacedFileUuids.push(request.url().split('/').pop() ?? '');
    return route.fulfill({ json: {} });
  });

const mockTrashRoute = (page: Page, drive: InMemoryDrive, requests: RecordedRequests) =>
  mockRouteForMethod(page, `${BASE_API_URL}/storage/trash/add`, HTTP_METHOD.post, (route, request) => {
    const trashRequest = request.postDataJSON() as TrashRequest;
    drive.trash(trashRequest.items.map((item) => item.uuid));
    requests.trash.push(trashRequest);
    return route.fulfill({ json: {} });
  });

const fulfillBridgeCall = (route: Route, request: Request, bridge: InMemoryBridge, requests: RecordedRequests) => {
  const url = request.url();
  if (url.includes(START_UPLOAD_PATH)) return route.fulfill({ json: { uploads: [bridge.startUpload()] } });
  if (url.endsWith(FINISH_UPLOAD_PATH)) {
    return route.fulfill({ json: bridge.finishUpload(request.postDataJSON() as FinishUploadRequest) });
  }

  const fileId = firstCapture(BRIDGE_FILE_INFO_ID_PATTERN, url);
  requests.downloadedFileIds.push(fileId);
  return fulfillJsonIfFound(route, bridge.fileInfo(fileId));
};

const fulfillShardCall = (route: Route, request: Request, bridge: InMemoryBridge) => {
  const uuid = request.url().split('/').pop() ?? '';

  if (request.method() === HTTP_METHOD.put) {
    bridge.storeShard(uuid, request.postDataBuffer() ?? Buffer.alloc(0));
    return route.fulfill();
  }

  const shard = bridge.readShard(uuid);
  return shard ? route.fulfill({ contentType: SHARD_CONTENT_TYPE, body: shard }) : fulfillNotFound(route);
};

const mockBridgeStorageRoutes = async (page: Page, requests: RecordedRequests) => {
  const bridge = new InMemoryBridge();

  await page.route(`${BRIDGE_URL}/**buckets/**`, (route, request) =>
    fulfillBridgeCall(route, request, bridge, requests),
  );
  await page.route(`${SHARDS_URL}/**`, (route, request) => fulfillShardCall(route, request, bridge));
};

export const mockDriveRoutes = async (page: Page, options: MockedDriveOptions = {}): Promise<RecordedRequests> => {
  const drive = new InMemoryDrive(options);
  const requests: RecordedRequests = {
    fileEntries: [],
    thumbnailEntries: [],
    downloadedFileIds: [],
    trash: [],
    moves: [],
    createdFolders: [],
    replacedFileUuids: [],
  };

  await mockAppBootstrapCalls(page, options.isVersioningEnabled ?? false);
  await mockAuthRoutes(page);
  await mockFolderContentRoutes(page, drive);
  await mockFileEntryRoutes(page, drive, requests);
  await mockCreateFolderRoute(page, drive, requests);
  await mockMoveFileRoute(page, requests);
  await mockReplaceFileRoute(page, requests);
  await mockTrashRoute(page, drive, requests);
  await mockBridgeStorageRoutes(page, requests);

  return requests;
};
