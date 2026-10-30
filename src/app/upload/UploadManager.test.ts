import { afterEach, beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { AppError } from '@internxt/sdk';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import { DriveFileData } from 'app/drive/types';
import { ErrorMessages, HTTP_CODE_ERRORS, HTTP_STATUS_CODES } from 'app/core/constants';
import errorService from 'services/error.service';
import { ConnectionLostError } from 'app/network/requests';
import { TWENTY_MEGABYTES, USE_MULTIPART_THRESHOLD_BYTES } from 'app/network/networkConstants';
import { QueueUtilsService } from 'utils/queueUtils';
import { getUploadFileItem, getUploadRepository } from 'testUtils/fixtures/upload.fixtures';
import { UploadManager } from './UploadManager';
import { UploadItem, UploadManagerEvents } from 'app/network/types/upload';
import { UploadFailureReason } from 'app/network/types';

vi.mock('app/drive/services/file.service/uploadFile', () => ({ default: vi.fn() }));

type UploadFileOptions = { abortCallback?: (abort?: () => void) => void };

const HANG_TIMEOUT_MS = 2000;
const networkError = new AppError(ErrorMessages.NetworkError);
const noSpaceLeftError = new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED);
const paymentRequiredError = new AppError('Payment required', HTTP_STATUS_CODES.PAYMENT_REQUIRED);
const fileTooLargeError = new AppError('File too large', 400, HTTP_CODE_ERRORS.FILE_UPLOAD_SIZE_EXCEEDED);

const nameOf = (item: UploadItem) => item.file.name;

const failIfHangs = <T>(promise: Promise<T>): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('upload never settled')), HANG_TIMEOUT_MS)),
  ]);

const createManager = (props: Partial<ConstructorParameters<typeof UploadManager>[0]> = {}) =>
  new UploadManager({ uploadRepository: getUploadRepository(), getPauseKey: nameOf, ...props });

const startedUploadNames = () => (uploadFile as Mock).mock.calls.map(([file]) => file.name);

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

const makeUploadsNeverFinish = () => (uploadFile as Mock).mockReturnValue(new Promise(() => undefined));

const uploadAtMostAtTheSameTime = (concurrency: number) =>
  vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(concurrency);

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

    expect(startedUploadNames().filter((name) => name === 'broken')).toHaveLength(2);
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
  ])('When $problem, then the file is never retried', async ({ error, reason }) => {
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

  test('When a network error happens once while online, then the upload is retried and succeeds', async () => {
    (uploadFile as Mock).mockRejectedValueOnce(networkError);

    const { succeeded } = await createManager().run([getUploadFileItem('report')]);

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(succeeded).toHaveLength(1);
  });

  test('When the storage gets full, then the file uploading at the same time finishes and the waiting ones fail without being uploaded', async () => {
    uploadAtMostAtTheSameTime(2);
    fakeUploadFailureOf('fills-the-storage', noSpaceLeftError);
    const items = ['fills-the-storage', 'uploading', 'waiting-1', 'waiting-2'].map((name) => getUploadFileItem(name));

    const { succeeded, failed } = await failIfHangs(createManager().run(items));

    expect(startedUploadNames()).toEqual(['fills-the-storage', 'uploading']);
    expect(succeeded.map(({ item }) => nameOf(item))).toEqual(['uploading']);
    expect(failed.map(({ item }) => nameOf(item))).toEqual(['fills-the-storage', 'waiting-1', 'waiting-2']);
    expect(failed.every(({ failure }) => failure.reason === UploadFailureReason.NoSpaceLeft)).toBe(true);
  });

  test('When a file is cancelled while its paused state is being read, then it is never uploaded and is reported as cancelled', async () => {
    const report = getUploadFileItem('report');
    const events: UploadManagerEvents = { onItemCancelled: vi.fn(), onItemFailed: vi.fn() };
    const uploadRepository = getUploadRepository();
    const manager = createManager({ events, uploadRepository });
    vi.mocked(uploadRepository.getUploadState).mockImplementationOnce(async () => {
      manager.cancelItem(report);
      return undefined;
    });

    await manager.run([report]);

    expect(uploadFile).not.toHaveBeenCalled();
    expect(events.onItemCancelled).toHaveBeenCalledExactlyOnceWith(report);
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

  test('When small, medium and large files are uploaded together, then the small ones start first and the large ones last', async () => {
    const items = [
      getUploadFileItem('large-1', USE_MULTIPART_THRESHOLD_BYTES),
      getUploadFileItem('medium-1', TWENTY_MEGABYTES),
      getUploadFileItem('small-1'),
      getUploadFileItem('large-2', USE_MULTIPART_THRESHOLD_BYTES),
      getUploadFileItem('medium-2', TWENTY_MEGABYTES),
      getUploadFileItem('small-2'),
    ];

    await createManager().run(items);

    expect(startedUploadNames()).toEqual(['small-1', 'small-2', 'medium-1', 'medium-2', 'large-1', 'large-2']);
  });

  test('When several large files are uploaded, then only one uploads at a time', async () => {
    makeUploadsNeverFinish();
    const items = [
      getUploadFileItem('large-1', USE_MULTIPART_THRESHOLD_BYTES),
      getUploadFileItem('large-2', USE_MULTIPART_THRESHOLD_BYTES),
    ];

    void createManager().run(items);

    await vi.waitFor(() => expect(startedUploadNames()).toEqual(['large-1']));
  });

  test('When small files are uploaded after a large file in a browser without memory information, then they upload at the same time again', async () => {
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockImplementation((current) => current);
    const manager = createManager();
    await manager.run([getUploadFileItem('large', USE_MULTIPART_THRESHOLD_BYTES)]);
    makeUploadsNeverFinish();

    void manager.run(['report', 'invoice', 'photo'].map((name) => getUploadFileItem(name)));

    await vi.waitFor(() => expect(startedUploadNames()).toEqual(['large', 'report', 'invoice', 'photo']));
  });

  test('When the browser is running out of memory, then files are uploaded one at a time', async () => {
    uploadAtMostAtTheSameTime(1);
    makeUploadsNeverFinish();

    void createManager().run(['report', 'invoice', 'photo'].map((name) => getUploadFileItem(name)));

    await vi.waitFor(() => expect(startedUploadNames()).toEqual(['report']));
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
