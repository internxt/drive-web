import { afterEach, beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { AppError } from '@internxt/sdk';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import { DriveFileData } from 'app/drive/types';
import { ErrorMessages, HTTP_CODE_ERRORS, HTTP_STATUS_CODES } from 'app/core/constants';
import errorService from 'services/error.service';
import { ConnectionLostError } from 'app/network/requests';
import { TWENTY_MEGABYTES, USE_MULTIPART_THRESHOLD_BYTES } from 'app/network/networkConstants';
import { QueueUtilsService } from 'utils/queueUtils';
import workspacesService from 'services/workspace.service';
import folderService from 'app/drive/services/folder.service';
import {
  getCreatedFolder,
  getFileToUpload,
  getFolderToUpload,
  getUploadFileItem,
  getUploadRepository,
} from 'testUtils/fixtures/upload.fixtures';
import { createFolderItem, UploadManager } from './UploadManager';
import { UploadItem, UploadManagerEvents } from 'app/network/types/upload';
import { UploadFailureReason, UploadItemKind } from 'app/network/types';

vi.mock('app/drive/services/file.service/uploadFile', () => ({ default: vi.fn() }));
vi.mock('app/drive/services/folder.service', () => ({ default: { createFolderByUuid: vi.fn() } }));
vi.mock('services/workspace.service', () => ({ default: { createFolder: vi.fn() } }));

type UploadFileOptions = { abortCallback?: (abort?: () => void) => void };

const HANG_TIMEOUT_MS = 2000;
const networkError = new AppError(ErrorMessages.NetworkError);
const noSpaceLeftError = new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED);
const paymentRequiredError = new AppError('Payment required', HTTP_STATUS_CODES.PAYMENT_REQUIRED);
const fileTooLargeError = new AppError('File too large', 400, HTTP_CODE_ERRORS.FILE_UPLOAD_SIZE_EXCEEDED);

const nameOf = (item: UploadItem) => (item.kind === UploadItemKind.File ? item.file.name : item.folder.name);

const failIfHangs = <T>(promise: Promise<T>): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('upload never settled')), HANG_TIMEOUT_MS)),
  ]);

const createManager = (props: Partial<ConstructorParameters<typeof UploadManager>[0]> = {}) =>
  new UploadManager({ uploadRepository: getUploadRepository(), getPauseKey: nameOf, ...props });

const uploadedNames = () => (uploadFile as Mock).mock.calls.map(([file]) => file.name);

const fakeSlowUploads = () =>
  (uploadFile as Mock).mockImplementation((file: { name: string }, _progress, options: UploadFileOptions) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve({ uuid: `${file.name}-uuid` }), 500);
      options.abortCallback?.(() => {
        clearTimeout(timeout);
        reject(new Error('aborted'));
      });
    });
  });

const fakeUploadFailureOf = (failingName: string, error: unknown) =>
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
    if (file.name === failingName) throw error;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { uuid: `${file.name}-uuid` } as DriveFileData;
  });

const goOffline = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

describe('Uploading files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
  });

  afterEach(() => vi.restoreAllMocks());

  test('When files are uploaded, then each one succeeds with its uploaded data and its plain name', async () => {
    const items = [getUploadFileItem('report'), getUploadFileItem('invoice')];
    const events: UploadManagerEvents = { onItemSucceeded: vi.fn() };

    const { succeeded, failed } = await createManager({ events }).run(items);

    expect(failed).toEqual([]);
    expect(succeeded).toEqual([
      { item: items[0], uploadedItem: { uuid: 'report-uuid', name: 'report' } },
      { item: items[1], uploadedItem: { uuid: 'invoice-uuid', name: 'invoice' } },
    ]);
    expect(events.onItemSucceeded).toHaveBeenCalledWith(items[0], { uuid: 'report-uuid', name: 'report' });
  });

  test('When an upload advances, then its progress is notified', async () => {
    const item = getUploadFileItem('report');
    (uploadFile as Mock).mockImplementation(async (_file, onProgress: (progress: number) => void) => {
      onProgress(0.5);
      return { uuid: 'report-uuid' };
    });
    const events: UploadManagerEvents = { onItemStarted: vi.fn(), onItemProgress: vi.fn() };

    await createManager({ events }).run([item]);

    expect(events.onItemStarted).toHaveBeenCalledWith(item);
    expect(events.onItemProgress).toHaveBeenCalledWith(item, 0.5);
  });

  test('When an upload fails unexpectedly once, then it is retried and succeeds', async () => {
    (uploadFile as Mock).mockRejectedValueOnce(new Error('Server error'));

    const { succeeded } = await createManager().run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(succeeded).toHaveLength(1);
  });

  test('When an upload keeps failing, then it fails as retryable and the other files still upload', async () => {
    const serverError = new Error('Server error');
    fakeUploadFailureOf('broken', serverError);
    const events: UploadManagerEvents = { onItemFailed: vi.fn() };
    const brokenItem = getUploadFileItem('broken');

    const { succeeded, failed } = await failIfHangs(
      createManager({ events }).run([brokenItem, getUploadFileItem('a'), getUploadFileItem('b')]),
    );

    expect(uploadedNames().filter((name) => name === 'broken')).toHaveLength(2);
    expect(succeeded).toHaveLength(2);
    expect(failed).toEqual([
      {
        item: brokenItem,
        failure: { error: serverError, reason: UploadFailureReason.UploadFailed, isRetryable: true },
      },
    ]);
    expect(events.onItemFailed).toHaveBeenCalledWith(brokenItem, failed[0].failure);
  });

  test.each([
    { problem: 'the plan does not allow it', error: paymentRequiredError, reason: UploadFailureReason.UploadFailed },
    { problem: 'the file is too large', error: fileTooLargeError, reason: UploadFailureReason.FileTooLarge },
  ])('When $problem, then the file is not retried and cannot be retried later', async ({ error, reason }) => {
    (uploadFile as Mock).mockRejectedValue(error);

    const { failed } = await createManager().run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledOnce();
    expect(failed[0].failure).toEqual({ error, reason, isRetryable: false });
  });

  test.each([
    { failure: 'the connection is lost', error: new ConnectionLostError(), arrange: () => undefined },
    { failure: 'a network error happens while offline', error: networkError, arrange: goOffline },
  ])('When $failure, then the file is not retried and fails as a retryable connection loss', async (scenario) => {
    scenario.arrange();
    (uploadFile as Mock).mockRejectedValue(scenario.error);

    const { failed } = await createManager().run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledOnce();
    expect(failed[0].failure).toEqual(
      expect.objectContaining({ reason: UploadFailureReason.ConnectionLost, isRetryable: true }),
    );
  });

  test('When a network error happens while online, then the upload is retried and succeeds', async () => {
    (uploadFile as Mock).mockRejectedValueOnce(networkError);

    const { succeeded } = await createManager().run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(succeeded).toHaveLength(1);
  });

  test('When the upload rejects without an error, then the file fails instead of hanging', async () => {
    (uploadFile as Mock).mockRejectedValue(undefined);

    const { failed } = await failIfHangs(createManager().run([getUploadFileItem('report')]));

    expect(failed).toHaveLength(1);
  });

  test('When the storage is full, then the queued files fail without being uploaded', async () => {
    fakeUploadFailureOf('first', noSpaceLeftError);
    const items = ['first', 'a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => getUploadFileItem(name));

    const { failed } = await failIfHangs(createManager().run(items));

    expect(uploadedNames()).toEqual(['first', 'a', 'b', 'c', 'd', 'e']);
    expect(failed.map(({ item }) => nameOf(item))).toEqual(['first', 'f', 'g']);
    expect(failed.every(({ failure }) => failure.reason === UploadFailureReason.NoSpaceLeft)).toBe(true);
  });

  test('When the upload is cancelled, then the queued files are never uploaded and are reported as cancelled', async () => {
    fakeSlowUploads();
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((name) => getUploadFileItem(name));
    const events: UploadManagerEvents = { onItemCancelled: vi.fn(), onItemFailed: vi.fn() };
    const manager = createManager({ events });

    const upload = manager.run(items);
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(6));
    manager.cancelAll();
    const { succeeded, failed } = await failIfHangs(upload);

    expect(uploadFile).toHaveBeenCalledTimes(6);
    expect(succeeded).toEqual([]);
    expect(failed).toEqual([]);
    expect(events.onItemCancelled).toHaveBeenCalledTimes(items.length);
    expect(events.onItemFailed).not.toHaveBeenCalled();
  });

  test('When a single file is cancelled, then only that file stops', async () => {
    fakeSlowUploads();
    const [cancelledItem, otherItem] = [getUploadFileItem('cancelled'), getUploadFileItem('other')];
    const events: UploadManagerEvents = { onItemCancelled: vi.fn() };
    const manager = createManager({ events });

    const upload = manager.run([cancelledItem, otherItem]);
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
    manager.cancelItem(cancelledItem);
    const { succeeded } = await failIfHangs(upload);

    expect(succeeded.map(({ item }) => item)).toEqual([otherItem]);
    expect(events.onItemCancelled).toHaveBeenCalledExactlyOnceWith(cancelledItem);
  });

  test('When small, medium and large files are uploaded together, then the small ones go first and the large ones last and one at a time', async () => {
    let activeLargeUploads = 0;
    let maxActiveLargeUploads = 0;
    (uploadFile as Mock).mockImplementation(async (file: { name: string; size: number }) => {
      const isLarge = file.size >= USE_MULTIPART_THRESHOLD_BYTES;
      if (isLarge) maxActiveLargeUploads = Math.max(maxActiveLargeUploads, ++activeLargeUploads);
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (isLarge) activeLargeUploads--;
      return { uuid: `${file.name}-uuid` };
    });
    const items = [
      getUploadFileItem('large-1', USE_MULTIPART_THRESHOLD_BYTES),
      getUploadFileItem('medium-1', TWENTY_MEGABYTES),
      getUploadFileItem('small-1'),
      getUploadFileItem('large-2', USE_MULTIPART_THRESHOLD_BYTES),
      getUploadFileItem('medium-2', TWENTY_MEGABYTES),
      getUploadFileItem('small-2'),
    ];

    await createManager().run(items);

    expect(uploadedNames()).toEqual(['small-1', 'small-2', 'medium-1', 'medium-2', 'large-1', 'large-2']);
    expect(maxActiveLargeUploads).toBe(1);
  });

  test('When the browser is running out of memory, then fewer files are uploaded at the same time', async () => {
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(1);
    let activeUploads = 0;
    let maxActiveUploads = 0;
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      maxActiveUploads = Math.max(maxActiveUploads, ++activeUploads);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeUploads--;
      return { uuid: `${file.name}-uuid` };
    });
    const items = ['a', 'b', 'c', 'd'].map((name) => getUploadFileItem(name));

    const { succeeded } = await createManager().run(items);

    expect(succeeded).toHaveLength(items.length);
    expect(maxActiveUploads).toBe(1);
  });

  test('When uploading to a workspace, then the workspace credentials are used', async () => {
    const ownerUserAuthenticationData = {
      bucketId: 'workspace-bucket',
      workspaceId: 'workspace-id',
      bridgeUser: 'bridge-user',
      bridgePass: 'bridge-pass',
      encryptionKey: 'encryption-key',
      token: 'token',
      workspacesToken: 'workspaces-token',
      resourcesToken: 'resources-token',
    };

    await createManager({ ownerUserAuthenticationData }).run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({ isTeam: true, ownerUserAuthenticationData }),
      expect.any(Object),
    );
  });

  test('When the upload of a file was paused, then it starts paused under its pause key', async () => {
    const uploadRepository = getUploadRepository(['paused-key']);

    await createManager({ uploadRepository, getPauseKey: () => 'paused-key' }).run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function),
      expect.any(Object),
      expect.objectContaining({ taskId: 'paused-key', isPaused: true }),
    );
  });

  test('When a success listener throws, then every file is uploaded once and the queue keeps going', async () => {
    const items = [getUploadFileItem('a'), getUploadFileItem('b'), getUploadFileItem('c')];
    const events: UploadManagerEvents = {
      onItemSucceeded: vi.fn(() => {
        throw new Error('listener failure');
      }),
    };

    const { succeeded } = await failIfHangs(createManager({ events }).run(items));

    expect(uploadFile).toHaveBeenCalledTimes(items.length);
    expect(succeeded).toHaveLength(items.length);
  });
});

const fakeFolderCreationTaking = (delayMs = 0) =>
  vi.mocked(folderService.createFolderByUuid).mockImplementation((_parentUuid, name) => {
    const cancel = vi.fn();
    const promise = new Promise((resolve) => setTimeout(() => resolve(getCreatedFolder(name)), delayMs));
    return [promise, { cancel }] as never;
  });

const uploadedFileParents = () =>
  Object.fromEntries((uploadFile as Mock).mock.calls.map(([file]) => [file.name, file.parentFolderId]));

describe('Uploading folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
    fakeFolderCreationTaking();
  });

  test('When a folder tree is uploaded, then each folder is created inside its parent and each file inside its folder', async () => {
    const tree = getFolderToUpload('Work', {
      childrenFiles: [getFileToUpload('report.pdf')],
      childrenFolders: [getFolderToUpload('Invoices', { childrenFiles: [getFileToUpload('january.pdf')] })],
    });

    const { succeeded, failed } = await createManager().run([createFolderItem(tree, 'destination-uuid')]);

    expect(failed).toEqual([]);
    expect(succeeded).toHaveLength(4);
    expect(folderService.createFolderByUuid).toHaveBeenCalledWith('destination-uuid', 'Work');
    expect(folderService.createFolderByUuid).toHaveBeenCalledWith('Work-uuid', 'Invoices');
    expect(uploadedFileParents()).toEqual({ report: 'Work-uuid', january: 'Invoices-uuid' });
  });

  test('When the content of a folder is uploaded, then every item knows the folder it belongs to', async () => {
    const rootItem = createFolderItem(
      getFolderToUpload('Work', { childrenFiles: [getFileToUpload('report.pdf')] }),
      'dest',
    );

    const { succeeded } = await createManager().run([rootItem]);

    const fileItem = succeeded.find(({ item }) => item.kind === UploadItemKind.File)?.item;
    expect(fileItem?.parent).toBe(rootItem);
  });

  test('When a folder cannot be created, then its content is not uploaded', async () => {
    vi.mocked(folderService.createFolderByUuid).mockImplementation(
      () => [Promise.reject(new Error('Server error')), { cancel: vi.fn() }] as never,
    );
    const rootItem = createFolderItem(
      getFolderToUpload('Work', { childrenFiles: [getFileToUpload('report.pdf')] }),
      'dest',
    );

    const { failed } = await failIfHangs(createManager().run([rootItem]));

    expect(folderService.createFolderByUuid).toHaveBeenCalledTimes(2);
    expect(failed).toEqual([
      { item: rootItem, failure: expect.objectContaining({ reason: UploadFailureReason.UploadFailed }) },
    ]);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test('When a folder is cancelled, then nothing else inside it is uploaded', async () => {
    fakeSlowUploads();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((name) => getFileToUpload(`${name}.txt`));
    const rootItem = createFolderItem(getFolderToUpload('Work', { childrenFiles: files }), 'dest');
    const manager = createManager();

    const upload = manager.run([rootItem]);
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(6));
    manager.cancelItem(rootItem);
    const { succeeded } = await failIfHangs(upload);

    expect(uploadFile).toHaveBeenCalledTimes(6);
    expect(succeeded.map(({ item }) => item)).toEqual([rootItem]);
  });

  test('When folders appear while files are waiting, then the folders are created first', async () => {
    fakeSlowUploads();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => getUploadFileItem(name));
    const folderItem = createFolderItem(getFolderToUpload('Late'), 'dest');
    const manager = createManager();

    const upload = manager.run([...files, folderItem]);
    await vi.waitFor(() => expect(folderService.createFolderByUuid).toHaveBeenCalled());

    expect(uploadedNames()).not.toContain('g');
    manager.cancelAll();
    await failIfHangs(upload);
  });

  test('When a folder is uploaded to a workspace, then it is created in the workspace and its content waits for it to be available', async () => {
    vi.mocked(workspacesService.createFolder).mockImplementation(
      ({ plainName }) => [Promise.resolve(getCreatedFolder(plainName)), { cancel: vi.fn() }] as never,
    );
    let folderCreatedAt = 0;
    vi.mocked(workspacesService.createFolder).mockImplementationOnce(({ plainName }) => {
      folderCreatedAt = Date.now();
      return [Promise.resolve(getCreatedFolder(plainName)), { cancel: vi.fn() }] as never;
    });
    let fileUploadedAt = 0;
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      fileUploadedAt = Date.now();
      return { uuid: `${file.name}-uuid` };
    });
    const ownerUserAuthenticationData = { workspaceId: 'workspace-id' } as never;
    const rootItem = createFolderItem(
      getFolderToUpload('Work', { childrenFiles: [getFileToUpload('report.pdf')] }),
      'dest',
    );

    await createManager({ ownerUserAuthenticationData }).run([rootItem]);

    expect(workspacesService.createFolder).toHaveBeenCalledWith({
      workspaceId: 'workspace-id',
      parentFolderUuid: 'dest',
      plainName: 'Work',
    });
    expect(folderService.createFolderByUuid).not.toHaveBeenCalled();
    expect(fileUploadedAt - folderCreatedAt).toBeGreaterThanOrEqual(500);
  });

  test('When a large file is uploaded together with a folder, then it waits for the files inside the folder so they are not uploaded one at a time behind it', async () => {
    fakeFolderCreationTaking(30);
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { uuid: `${file.name}-uuid` };
    });
    const largeFile = getUploadFileItem('large', USE_MULTIPART_THRESHOLD_BYTES);
    const folderItem = createFolderItem(
      getFolderToUpload('Photos', { childrenFiles: ['a', 'b', 'c'].map((name) => getFileToUpload(`${name}.png`)) }),
      'dest',
    );

    const { succeeded } = await failIfHangs(createManager().run([largeFile, folderItem]));

    expect(succeeded).toHaveLength(5);
    expect(uploadedNames()).toEqual(['a', 'b', 'c', 'large']);
  });
});
