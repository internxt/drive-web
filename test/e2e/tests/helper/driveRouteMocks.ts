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

const HTTP_METHOD = { get: 'GET', post: 'POST', put: 'PUT' };
const HTTP_NOT_FOUND = 404;
const SHARD_CONTENT_TYPE = 'application/octet-stream';

const BRIDGE_FILE_VERSION = 2;
const BRIDGE_FILE_ID_BYTES = 12;
const FIRST_UPLOADED_FILE_ID = 5000;
const FIRST_THUMBNAIL_ID = 9000;
const EXISTING_FILE_SIZE = 1024;
const ITEM_TIMESTAMP = '2026-08-01T10:00:00.000Z';
const ITEM_STATUS = 'EXISTS';

const GIGABYTE = 1024 ** 3;
const MAX_UPLOAD_FILE_SIZE = 20 * GIGABYTE;
const MAX_SPACE_BYTES = 10 * GIGABYTE;
const USED_SPACE_BYTES = 3072;

const NO_DUPLICATES = { existentFiles: [], existentFolders: [] };
const BOOTSTRAP_RESPONSES: Record<string, unknown> = {
  'workspaces/': { availableWorkspaces: [], pendingWorkspaces: [] },
  'sharings/invites**': { invites: [] },
  'sharings/roles': [],
  'files/limits': { versioning: { enabled: false, maxVersions: 0 }, maxUploadFileSize: MAX_UPLOAD_FILE_SIZE },
  'users/limit': { maxSpaceBytes: MAX_SPACE_BYTES },
  'users/usage': { drive: USED_SPACE_BYTES, backups: 0, total: USED_SPACE_BYTES },
  'users/me/upload-status': { hasUploadedFiles: true },
  'users/avatar/refresh': { avatar: null },
  'referral/enabled': { enabled: false },
};

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
export type TrashRequest = { items: { uuid: string; type: string }[] };

/**
 * Uploads only reach the bridge, and so `fileEntries`, in Chromium: Playwright cannot route
 * the bridge CORS preflight in Firefox.
 */
type RecordedRequests = {
  fileEntries: FileEntryRequest[];
  thumbnailEntries: ThumbnailEntryRequest[];
  downloadedFileIds: string[];
  trash: TrashRequest[];
};
export type MockedDriveOptions = {
  files?: ExistingFile[];
  declaredSizes?: Record<string, number>;
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

export const buildExistingFile = (id: number, plainName: string, type: string) =>
  buildFile(
    id,
    {
      fileId: `existing-bridge-file-${id}`,
      type,
      size: EXISTING_FILE_SIZE,
      plainName,
      bucket: loggedUser.user.bucket,
      folderUuid: loggedUser.user.rootFolderId,
    },
    `existing-file-uuid-${id}`,
  );
export type ExistingFile = StoredFile;

/**
 * Trashing removes files, so follow-up listings and existence checks see the new state.
 */
class InMemoryDrive {
  private files: StoredFile[];
  private readonly declaredSizes: Record<string, number>;
  private uploadedFilesCount = 0;
  private thumbnailsCount = 0;

  constructor({ files = [], declaredSizes = {} }: MockedDriveOptions) {
    this.files = [...files];
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

  trash(uuids: string[]) {
    const trashed = new Set(uuids);
    this.files = this.files.filter((file) => !trashed.has(file.uuid));
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

const mockAppBootstrapCalls = async (page: Page) => {
  for (const baseUrl of [BASE_API_URL, OLD_API_URL, PAYMENTS_API_URL]) {
    await page.route(`${baseUrl}/**`, (route) => route.fulfill({ json: {} }));
  }

  for (const [path, body] of Object.entries(BOOTSTRAP_RESPONSES)) {
    await page.route(`${BASE_API_URL}/${path}`, (route) => route.fulfill({ json: body }));
  }
};

const fulfillExistenceCheck = (route: Route, request: Request, drive: InMemoryDrive) => {
  const url = request.url();
  if (!url.endsWith(FILES_EXISTENCE_PATH)) return route.fulfill({ json: NO_DUPLICATES });

  const { files } = request.postDataJSON() as ExistenceCheckRequest;
  const existentFiles = drive.existingFilesIn(firstCapture(FOLDER_CONTENT_UUID_PATTERN, url), files);
  return route.fulfill({ json: { existentFiles } });
};

const mockFolderContentRoutes = async (page: Page, drive: InMemoryDrive) => {
  const folderContentUrl = `${BASE_API_URL}/folders/content/**`;

  await page.route(folderContentUrl, (route, request) => {
    const url = request.url();
    const isFilesListing = url.includes(FILES_LISTING_PATH);
    const files = drive.filesIn(firstCapture(FOLDER_CONTENT_UUID_PATTERN, url));
    return route.fulfill({ json: isFilesListing ? { files } : { folders: [] } });
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
  const requests: RecordedRequests = { fileEntries: [], thumbnailEntries: [], downloadedFileIds: [], trash: [] };

  await mockAppBootstrapCalls(page);
  await mockAuthRoutes(page);
  await mockFolderContentRoutes(page, drive);
  await mockFileEntryRoutes(page, drive, requests);
  await mockTrashRoute(page, drive, requests);
  await mockBridgeStorageRoutes(page, requests);

  return requests;
};
