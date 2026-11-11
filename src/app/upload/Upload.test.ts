import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { IRoot } from 'app/store/slices/storage/types';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType } from 'app/tasks/types';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { AppError } from '@internxt/sdk';
import { HTTP_STATUS_CODES } from 'app/core/constants';
import { MAX_CONCURRENT_UPLOADS, MAX_UPLOAD_ATTEMPTS } from 'app/network/networkConstants';
import {
  getCreatedFolder,
  getFileToUpload,
  getFolderToUpload,
  getFolderWithFiles,
  getUploadRepository,
} from 'testUtils/fixtures/upload.fixtures';
import { QueueUtilsService } from 'utils/queueUtils';
import { Upload } from './Upload';
import { UploadManager } from './UploadManager';

vi.mock('app/drive/services/file.service/uploadFile', () => ({ default: vi.fn() }));
vi.mock('app/drive/services/folder.service', () => ({ default: { createFolderByUuid: vi.fn() } }));
vi.mock('services/workspace.service', () => ({ default: { createFolder: vi.fn() } }));
vi.mock('app/drive/services/new-storage.service', () => ({ default: { deleteFolderByUuid: vi.fn() } }));
vi.mock('services/referral.service', () => ({ default: { trackFileUpload: vi.fn(), trackFolderUpload: vi.fn() } }));
vi.mock('app/network/networkInformation', () => ({ logNetworkInfoForUpload: vi.fn() }));
vi.mock('i18next', () => ({ t: (key: string) => key }));

const DESTINATION_UUID = 'destination-uuid';

const uploadRepository = getUploadRepository();

const fakeFolderCreationTaking = (delayMs = 0) =>
  vi.mocked(folderService.createFolderByUuid).mockImplementation((_parentUuid, name) => {
    let abortCreation: () => void = () => undefined;
    const creation = new Promise((resolve, reject) => {
      setTimeout(() => resolve(getCreatedFolder(name)), delayMs);
      abortCreation = () => reject(new Error('aborted'));
    });
    return [creation, { cancel: () => abortCreation() }] as never;
  });

const fakeUploadsTaking = (delayMs: number) =>
  (uploadFile as Mock).mockImplementation(
    (file: { name: string }, _progress, options: { abortCallback?: (abort: () => void) => void }) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve({ uuid: `${file.name}-uuid` }), delayMs);
        options.abortCallback?.(() => {
          clearTimeout(timeout);
          reject(new Error('aborted'));
        });
      }),
  );

const createUpload = (
  roots: IRoot[],
  files: File[],
  callbacks: Partial<ConstructorParameters<typeof Upload>[0]> = {},
) =>
  new Upload({
    destinationFolderUuid: DESTINATION_UUID,
    roots,
    files,
    uploadRepository,
    uploadManager: new UploadManager(),
    ...callbacks,
  });

const uploadedNames = () => vi.mocked(uploadFile).mock.calls.map(([file]) => file.name);

const tasksOf = (action: TaskType) => tasksService.getTasks().filter((task) => task.action === action);

const failUploadsOf = (failingNames: string[], error: unknown = new Error('Server error')) =>
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
    if (failingNames.includes(file.name)) throw error;
    return { uuid: `${file.name}-uuid` };
  });

const uploadSucceeds = () =>
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));

const countUploadsAtTheSameTime = (failingNames: Set<string>) => {
  let uploading = 0;
  let mostAtTheSameTime = 0;
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
    uploading++;
    mostAtTheSameTime = Math.max(mostAtTheSameTime, uploading);
    await new Promise((resolve) => setTimeout(resolve, 100));
    uploading--;
    if (failingNames.has(file.name)) throw new Error('Server error');
    return { uuid: `${file.name}-uuid` };
  });
  return () => mostAtTheSameTime;
};

describe('Uploading what the user picked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    vi.mocked(newStorageService.deleteFolderByUuid).mockResolvedValue(undefined as never);
    uploadSucceeds();
    fakeFolderCreationTaking();
  });

  test('When a folder and a file are uploaded, then each one is tracked by its own task until it succeeds', async () => {
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png'), getFileToUpload('city.png')] })],
      [getFileToUpload('report.pdf')],
    );

    await upload.run();

    const [folderTask] = tasksOf(TaskType.UploadFolder);
    const [fileTask] = tasksOf(TaskType.UploadFile);
    expect(tasksService.getTasks()).toHaveLength(2);
    expect(folderTask).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, progress: 1, itemUUID: { rootFolderUUID: 'Photos-uuid' } }),
    );
    expect(fileTask).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, itemUUID: { fileUUID: 'report-uuid' } }),
    );
  });

  test('When the items are uploaded, then each one is reported with the folder it was uploaded into', async () => {
    const onItemUploaded = vi.fn();
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })],
      [getFileToUpload('report.pdf')],
      {
        onItemUploaded,
      },
    );

    await upload.run();

    expect(onItemUploaded).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'Photos-uuid' }),
      DESTINATION_UUID,
      true,
    );
    expect(onItemUploaded).toHaveBeenCalledWith(expect.objectContaining({ name: 'beach' }), 'Photos-uuid', false);
    expect(onItemUploaded).toHaveBeenCalledWith(expect.objectContaining({ name: 'report' }), DESTINATION_UUID, false);
  });

  test('When a folder is uploaded with everything in it, then it is counted as a folder upload', async () => {
    await createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], []).run();

    expect(referralService.trackFolderUpload).toHaveBeenCalledOnce();
  });

  test('When reporting an uploaded item fails, then the upload still finishes and each task succeeds', async () => {
    const onItemUploaded = vi.fn(() => {
      throw new Error('Listener error');
    });
    vi.mocked(referralService.trackFileUpload).mockImplementation(() => {
      throw new Error('Corrupt banner state');
    });
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })],
      [getFileToUpload('report.pdf')],
      { onItemUploaded },
    );

    await upload.run();

    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, progress: 1, itemUUID: { rootFolderUUID: 'Photos-uuid' } }),
    );
    expect(tasksOf(TaskType.UploadFile)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, itemUUID: { fileUUID: 'report-uuid' } }),
    );
  });

  test('When a file inside a folder fails, then the folder still succeeds with what could be uploaded', async () => {
    failUploadsOf(['broken']);
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png'), getFileToUpload('beach.png')] })],
      [],
    );

    await upload.run();

    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(
      expect.objectContaining({
        status: TaskStatus.Success,
        progress: 2 / 3,
        failedItems: [expect.objectContaining({ name: 'broken' })],
      }),
    );
  });

  test('When a folder cannot be created, then its task shows the error', async () => {
    vi.mocked(folderService.createFolderByUuid).mockImplementation(
      () => [Promise.reject(new Error('Server error')), { cancel: vi.fn() }] as never,
    );

    await createUpload([getFolderToUpload('Photos')], []).run();

    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Error, subtitle: 'tasks.subtitles.upload-failed' }),
    );
  });

  test('When a file fails, then its task shows the reason', async () => {
    (uploadFile as Mock).mockRejectedValue(new Error('Server error'));

    await createUpload([], [getFileToUpload('report.pdf')]).run();

    expect(tasksOf(TaskType.UploadFile)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Error, subtitle: 'tasks.subtitles.upload-failed' }),
    );
  });

  test('When the user cancels a file, then only that file stops', async () => {
    fakeUploadsTaking(500);
    const upload = createUpload([], [getFileToUpload('report.pdf'), getFileToUpload('invoice.pdf')]);

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
    const [reportTask, invoiceTask] = tasksOf(TaskType.UploadFile);
    await tasksService.cancelTask(reportTask.id);
    await running;

    expect(tasksService.findTask(reportTask.id)?.status).toBe(TaskStatus.Cancelled);
    expect(tasksService.findTask(invoiceTask.id)?.status).toBe(TaskStatus.Success);
  });

  test('When the user cancels a file, then its saved upload state is removed', async () => {
    fakeUploadsTaking(500);
    const upload = createUpload([], [getFileToUpload('report.pdf')]);

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    const [reportTask] = tasksOf(TaskType.UploadFile);
    await tasksService.cancelTask(reportTask.id);
    await running;

    expect(uploadRepository.removeUploadState).toHaveBeenCalledWith(reportTask.id);
  });

  test('When a file starts uploading, then its upload is saved as in process, but not the one of a folder', async () => {
    fakeUploadsTaking(500);
    const upload = createUpload([getFolderToUpload('Photos')], [getFileToUpload('report.pdf')]);

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    const [fileTask] = tasksOf(TaskType.UploadFile);
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    await running;

    expect(uploadRepository.setUploadState).toHaveBeenCalledWith(fileTask.id, TaskStatus.InProcess);
    expect(uploadRepository.setUploadState).not.toHaveBeenCalledWith(folderTask.id, expect.anything());
  });

  test('When the user cancels a folder, then its upload stops and the folder already created is removed', async () => {
    fakeUploadsTaking(500);
    const onItemRemoved = vi.fn();
    const upload = createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], [], {
      onItemRemoved,
    });

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    await tasksService.cancelTask(tasksOf(TaskType.UploadFolder)[0].id);
    await running;

    expect(newStorageService.deleteFolderByUuid).toHaveBeenCalledWith('Photos-uuid');
    expect(onItemRemoved).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'Photos-uuid' }), DESTINATION_UUID);
    expect(tasksOf(TaskType.UploadFolder)[0].status).toBe(TaskStatus.Cancelled);
  });

  test('When the user cancels a folder, then the upload finishes only once the folder is removed', async () => {
    fakeUploadsTaking(500);
    let finishRemoval: () => void = () => undefined;
    vi.mocked(newStorageService.deleteFolderByUuid).mockReturnValue(
      new Promise<void>((resolve) => (finishRemoval = resolve)) as never,
    );
    const upload = createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], []);
    const onFinished = vi.fn();

    const running = upload.run().then(onFinished);
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    await tasksService.cancelTask(tasksOf(TaskType.UploadFolder)[0].id);
    await vi.waitFor(() => expect(newStorageService.deleteFolderByUuid).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(onFinished).not.toHaveBeenCalled();
    finishRemoval();
    await running;
    expect(onFinished).toHaveBeenCalled();
  });

  test('When the cancelled folder cannot be removed, then its task shows the error', async () => {
    fakeUploadsTaking(500);
    vi.mocked(newStorageService.deleteFolderByUuid).mockRejectedValue(new Error('Server error'));
    const onItemRemoved = vi.fn();
    const upload = createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], [], {
      onItemRemoved,
    });

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    await tasksService.cancelTask(tasksOf(TaskType.UploadFolder)[0].id);
    await running;

    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Error, subtitle: 'tasks.subtitles.folder-removal-failed' }),
    );
    expect(onItemRemoved).not.toHaveBeenCalled();
  });

  test('When the cancelled folder is removed but reporting it fails, then its task does not show a removal error', async () => {
    fakeUploadsTaking(500);
    const onItemRemoved = vi.fn(() => {
      throw new Error('List not updated');
    });
    const upload = createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], [], {
      onItemRemoved,
    });

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    await tasksService.cancelTask(tasksOf(TaskType.UploadFolder)[0].id);
    await running;

    expect(newStorageService.deleteFolderByUuid).toHaveBeenCalledWith('Photos-uuid');
    expect(tasksOf(TaskType.UploadFolder)[0].status).toBe(TaskStatus.Cancelled);
    expect(errorService.reportError).toHaveBeenCalledWith(new Error('List not updated'));
  });

  test('When a file finishes uploading right after the user cancels it, then its task succeeds', async () => {
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { uuid: `${file.name}-uuid` };
    });
    const upload = createUpload([], [getFileToUpload('report.pdf')]);

    const running = upload.run();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    const [reportTask] = tasksOf(TaskType.UploadFile);
    await tasksService.cancelTask(reportTask.id);
    await running;

    expect(tasksService.findTask(reportTask.id)).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, itemUUID: { fileUUID: 'report-uuid' } }),
    );
  });

  test('When the user cancels a folder while it is being created, then it is removed once it exists', async () => {
    fakeFolderCreationTaking(300);
    const upload = createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], []);

    const running = upload.run();
    await vi.waitFor(() => expect(folderService.createFolderByUuid).toHaveBeenCalled());
    await tasksService.cancelTask(tasksOf(TaskType.UploadFolder)[0].id);
    await running;

    expect(newStorageService.deleteFolderByUuid).toHaveBeenCalledWith('Photos-uuid');
    expect(uploadFile).not.toHaveBeenCalled();
  });
});

describe('Retrying what failed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    vi.mocked(newStorageService.deleteFolderByUuid).mockResolvedValue(undefined as never);
    fakeFolderCreationTaking();
  });

  test('When files inside a folder fail, then they are listed on the folder task', async () => {
    failUploadsOf(['broken']);

    await createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png'), getFileToUpload('beach.png')] })],
      [],
    ).run();

    expect(tasksOf(TaskType.UploadFolder)[0].failedItems).toEqual([
      expect.objectContaining({ name: 'broken', type: 'png', isFolder: false, isRetryable: true, isRetrying: false }),
    ]);
  });

  test('When a folder and a file both fail, then each task lists only its own failed items', async () => {
    failUploadsOf(['broken', 'report']);

    await createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png')] })],
      [getFileToUpload('report.pdf')],
    ).run();

    expect(tasksOf(TaskType.UploadFolder)[0].failedItems).toEqual([expect.objectContaining({ name: 'broken' })]);
    expect(tasksOf(TaskType.UploadFile)[0].failedItems).toEqual([expect.objectContaining({ name: 'report' })]);
  });

  test('When the user retries a folder, then its failed files are uploaded again into it and the folder ends with nothing failed', async () => {
    failUploadsOf(['broken']);
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png'), getFileToUpload('beach.png')] })],
      [],
    );
    await upload.run();
    uploadSucceeds();

    await tasksOf(TaskType.UploadFolder)[0].retry?.();

    const [folderTask] = tasksOf(TaskType.UploadFolder);
    expect(uploadFile).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'broken', parentFolderId: 'Photos-uuid' }),
      expect.any(Function),
      expect.any(Object),
      expect.any(Object),
    );
    expect(folderTask).toEqual(expect.objectContaining({ status: TaskStatus.Success, progress: 1, failedItems: [] }));
  });

  test('When the user cancels the retry of a folder that was already uploaded, then the retry stops and the folder keeps what was uploaded', async () => {
    failUploadsOf(['broken']);
    const upload = createUpload(
      [
        getFolderToUpload('Photos', {
          childrenFiles: [getFileToUpload('holidays.png'), getFileToUpload('broken.png')],
        }),
      ],
      [],
    );
    await upload.run();
    vi.mocked(uploadFile).mockClear();
    fakeUploadsTaking(500);
    const [folderTask] = tasksOf(TaskType.UploadFolder);

    const retrying = folderTask.retry?.();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
    await tasksService.cancelTask(folderTask.id);
    await retrying;

    expect(newStorageService.deleteFolderByUuid).not.toHaveBeenCalled();
    expect(tasksService.findTask(folderTask.id)?.status).toBe(TaskStatus.Cancelled);
  });

  test('When the user retries one failed file, then only that file is uploaded again', async () => {
    failUploadsOf(['retried', 'still-failing']);
    await createUpload(
      [
        getFolderToUpload('Photos', {
          childrenFiles: [getFileToUpload('retried.png'), getFileToUpload('still-failing.png')],
        }),
      ],
      [],
    ).run();
    uploadSucceeds();
    vi.mocked(uploadFile).mockClear();
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    const retriedFailure = folderTask.failedItems?.find(({ name }) => name === 'retried');

    await retriedFailure?.retry();

    expect(uploadedNames()).toEqual(['retried']);
    expect(tasksService.findTask(folderTask.id)?.failedItems).toEqual([
      expect.objectContaining({ name: 'still-failing' }),
    ]);
  });

  test('When the user retries everything, then the files that retrying cannot fix are not uploaded again', async () => {
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      if (file.name === 'over-plan-limit') throw new AppError('Plan limit reached', HTTP_STATUS_CODES.PAYMENT_REQUIRED);
      if (file.name === 'broken') throw new Error('Server error');
      return { uuid: `${file.name}-uuid` };
    });
    await createUpload(
      [
        getFolderToUpload('Photos', {
          childrenFiles: [getFileToUpload('over-plan-limit.png'), getFileToUpload('broken.png')],
        }),
      ],
      [],
    ).run();
    uploadSucceeds();
    vi.mocked(uploadFile).mockClear();

    await tasksOf(TaskType.UploadFolder)[0].retry?.();

    expect(uploadedNames()).toEqual(['broken']);
    expect(tasksOf(TaskType.UploadFolder)[0].failedItems).toEqual([
      expect.objectContaining({ name: 'over-plan-limit', isRetrying: false }),
    ]);
  });

  test('When the user retries everything while one failed file is being retried, then the rest is queued too and nothing is uploaded twice', async () => {
    failUploadsOf(['retrying', 'waiting']);
    await createUpload(
      [
        getFolderToUpload('Photos', {
          childrenFiles: [getFileToUpload('retrying.png'), getFileToUpload('waiting.png')],
        }),
      ],
      [],
    ).run();
    fakeUploadsTaking(100);
    vi.mocked(uploadFile).mockClear();
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    const retryingFailure = folderTask.failedItems?.find(({ name }) => name === 'retrying');

    const retryingOne = retryingFailure?.retry();
    const retryingEverything = tasksService.findTask(folderTask.id)?.retry?.();
    await Promise.all([retryingOne, retryingEverything]);

    expect(uploadedNames().sort()).toEqual(['retrying', 'waiting']);
    expect(tasksService.findTask(folderTask.id)).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, failedItems: [] }),
    );
  });

  test('When a folder is only fully uploaded after a retry, then it is counted as a folder upload', async () => {
    failUploadsOf(['report']);
    await createUpload([getFolderToUpload('Docs', { childrenFiles: [getFileToUpload('report.pdf')] })], []).run();
    uploadSucceeds();

    await tasksOf(TaskType.UploadFolder)[0].retry?.();

    expect(tasksOf(TaskType.UploadFolder)[0].failedItems).toEqual([]);
    expect(referralService.trackFolderUpload).toHaveBeenCalledOnce();
  });

  test('When a folder that could not be created is retried, then it is created with all its content', async () => {
    vi.mocked(folderService.createFolderByUuid).mockImplementation(
      () => [Promise.reject(new Error('Server error')), { cancel: vi.fn() }] as never,
    );
    await createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })], []).run();
    fakeFolderCreationTaking();

    await tasksOf(TaskType.UploadFolder)[0].retry?.();

    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'beach', parentFolderId: 'Photos-uuid' }),
      expect.any(Function),
      expect.any(Object),
      expect.any(Object),
    );
    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(expect.objectContaining({ status: TaskStatus.Success }));
  });

  test('When a failed file is retried, then its own task succeeds', async () => {
    failUploadsOf(['report']);
    await createUpload([], [getFileToUpload('report.pdf')]).run();
    uploadSucceeds();

    await tasksOf(TaskType.UploadFile)[0].retry?.();

    expect(tasksOf(TaskType.UploadFile)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, subtitle: undefined, failedItems: [] }),
    );
  });

  test('When the storage was full and the user retries after freeing space, then the files upload', async () => {
    failUploadsOf(['report', 'invoice'], new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED));
    await createUpload(
      [getFolderToUpload('Docs', { childrenFiles: [getFileToUpload('report.pdf'), getFileToUpload('invoice.pdf')] })],
      [],
    ).run();
    uploadSucceeds();

    await tasksOf(TaskType.UploadFolder)[0].retry?.();

    expect(tasksOf(TaskType.UploadFolder)[0].failedItems).toEqual([]);
  });

  test('When the storage fills up while uploading, then the user is told once, however many items fail', async () => {
    const onStorageFull = vi.fn();
    failUploadsOf(['report', 'invoice'], new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED));

    await createUpload([], [getFileToUpload('report.pdf'), getFileToUpload('invoice.pdf')], { onStorageFull }).run();

    expect(onStorageFull).toHaveBeenCalledOnce();
  });

  test('When a retry also finds the storage full, then the user is told again', async () => {
    const onStorageFull = vi.fn();
    failUploadsOf(['report'], new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED));
    await createUpload([], [getFileToUpload('report.pdf')], { onStorageFull }).run();

    await tasksOf(TaskType.UploadFile)[0].retry?.();

    expect(onStorageFull).toHaveBeenCalledTimes(2);
  });

  test('When a cancelled folder is retried, then nothing is uploaded again', async () => {
    failUploadsOf(['broken']);
    await createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png')] })], []).run();
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    await tasksService.cancelTask(folderTask.id);
    vi.mocked(uploadFile).mockClear();

    await folderTask.retry?.();

    expect(uploadFile).not.toHaveBeenCalled();
    expect(tasksService.findTask(folderTask.id)).toEqual(
      expect.objectContaining({
        status: TaskStatus.Cancelled,
        failedItems: [expect.objectContaining({ name: 'broken', isRetrying: false })],
      }),
    );
  });

  test('When the user frees space and retries while another file is still uploading, then the retried file uploads', async () => {
    let isStorageFull = true;
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      if (file.name === 'video') await new Promise((resolve) => setTimeout(resolve, 500));
      else if (isStorageFull) throw new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED);
      return { uuid: `${file.name}-uuid` };
    });
    const upload = createUpload([], [getFileToUpload('report.pdf'), getFileToUpload('video.mp4')]);
    const running = upload.run();
    const [reportTask, videoTask] = tasksOf(TaskType.UploadFile);
    await vi.waitFor(() => expect(tasksService.findTask(reportTask.id)?.status).toBe(TaskStatus.Error));
    isStorageFull = false;

    await reportTask.retry?.();

    expect(tasksService.findTask(reportTask.id)?.status).toBe(TaskStatus.Success);
    expect(tasksService.findTask(videoTask.id)?.status).toBe(TaskStatus.InProcess);
    await running;
  });

  test('When the failed files of two folders are retried, then each folder finishes when its own files do', async () => {
    failUploadsOf(['broken', 'movie']);
    await createUpload(
      [
        getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png')] }),
        getFolderToUpload('Videos', { childrenFiles: [getFileToUpload('movie.mp4')] }),
      ],
      [],
    ).run();
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      if (file.name === 'movie') await new Promise((resolve) => setTimeout(resolve, 500));
      return { uuid: `${file.name}-uuid` };
    });
    const [photosTask, videosTask] = tasksOf(TaskType.UploadFolder);

    const retryingVideos = videosTask.retry?.();
    await photosTask.retry?.();

    expect(tasksService.findTask(photosTask.id)?.status).toBe(TaskStatus.Success);
    expect(tasksService.findTask(videosTask.id)?.status).toBe(TaskStatus.InProcess);
    await retryingVideos;
    expect(tasksService.findTask(videosTask.id)?.status).toBe(TaskStatus.Success);
  });

  test('When a folder is retried while the rest of the upload is still running, then it only finishes once its retry does', async () => {
    let failedPhotosCreations = 0;
    vi.mocked(folderService.createFolderByUuid).mockImplementation((_parentUuid, name) => {
      const shouldFail = name === 'Photos' && failedPhotosCreations < MAX_UPLOAD_ATTEMPTS;
      if (shouldFail) failedPhotosCreations++;
      const creation = shouldFail ? Promise.reject(new Error('Server error')) : Promise.resolve(getCreatedFolder(name));
      return [creation, { cancel: vi.fn() }] as never;
    });
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      const uploadTimeMs = file.name === 'movie' ? 300 : 600;
      await new Promise((resolve) => setTimeout(resolve, uploadTimeMs));
      return { uuid: `${file.name}-uuid` };
    });
    const upload = createUpload(
      [
        getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] }),
        getFolderToUpload('Videos', { childrenFiles: [getFileToUpload('movie.mp4')] }),
      ],
      [],
    );
    const running = upload.run();
    const [photosTask, videosTask] = tasksOf(TaskType.UploadFolder);
    await vi.waitFor(() => expect(tasksService.findTask(photosTask.id)?.status).toBe(TaskStatus.Error));

    const retryingPhotos = photosTask.retry?.();
    await running;

    expect(tasksService.findTask(videosTask.id)?.status).toBe(TaskStatus.Success);
    expect(tasksService.findTask(photosTask.id)?.status).toBe(TaskStatus.InProcess);
    expect(referralService.trackFolderUpload).toHaveBeenCalledOnce();
    await retryingPhotos;
    expect(tasksService.findTask(photosTask.id)?.status).toBe(TaskStatus.Success);
  });

  test('When the user cancels a folder while its failed files are retried, then they are no longer shown as retrying', async () => {
    failUploadsOf(['broken']);
    await createUpload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png')] })], []).run();
    fakeUploadsTaking(500);
    const [folderTask] = tasksOf(TaskType.UploadFolder);

    const retrying = folderTask.retry?.();
    await vi.waitFor(() =>
      expect(tasksService.findTask(folderTask.id)?.failedItems).toEqual([
        expect.objectContaining({ name: 'broken', isRetrying: true }),
      ]),
    );
    await tasksService.cancelTask(folderTask.id);
    await retrying;

    expect(tasksService.findTask(folderTask.id)?.failedItems).toEqual([]);
  });

  test('When a folder is retried while another folder is still uploading, then no more than the usual uploads run at the same time', async () => {
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(MAX_CONCURRENT_UPLOADS);
    const failingNames = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    const bigFolderNames = Array.from({ length: 30 }, (_, index) => `b${index}`);
    const stillFailing = new Set(failingNames);
    const mostAtTheSameTime = countUploadsAtTheSameTime(stillFailing);
    const upload = createUpload(
      [getFolderWithFiles('Small', failingNames), getFolderWithFiles('Big', bigFolderNames)],
      [],
    );
    const running = upload.run();
    const [smallTask, bigTask] = tasksOf(TaskType.UploadFolder);
    await vi.waitFor(() => expect(tasksService.findTask(smallTask.id)?.failedItems).toHaveLength(failingNames.length), {
      timeout: 3000,
    });
    stillFailing.clear();

    const retrying = smallTask.retry?.();
    await Promise.all([retrying, running]);

    expect(tasksService.findTask(bigTask.id)?.status).toBe(TaskStatus.Success);
    expect(tasksService.findTask(smallTask.id)?.failedItems).toEqual([]);
    expect(mostAtTheSameTime()).toBeLessThanOrEqual(MAX_CONCURRENT_UPLOADS);
  });

  test('When a failed file is retried while the rest of its folder is still uploading, then it is uploaded and the folder ends with nothing failed', async () => {
    let isBrokenFixed = false;
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      if (file.name === 'video') await new Promise((resolve) => setTimeout(resolve, 500));
      if (file.name === 'broken' && !isBrokenFixed) throw new Error('Server error');
      return { uuid: `${file.name}-uuid` };
    });
    const upload = createUpload([getFolderWithFiles('Photos', ['broken.png', 'video.mp4'])], []);
    const running = upload.run();
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    await vi.waitFor(() => expect(tasksService.findTask(folderTask.id)?.failedItems).toHaveLength(1));
    isBrokenFixed = true;

    await tasksService.findTask(folderTask.id)?.failedItems?.[0].retry();
    await running;

    expect(uploadedNames().filter((name) => name === 'broken')).toHaveLength(MAX_UPLOAD_ATTEMPTS + 1);
    expect(tasksService.findTask(folderTask.id)).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, progress: 1, failedItems: [] }),
    );
  });

  test('When the user cancels a failed file while it is retried, then it is no longer shown as retrying', async () => {
    failUploadsOf(['report']);
    await createUpload([], [getFileToUpload('report.pdf')]).run();
    fakeUploadsTaking(500);
    const [fileTask] = tasksOf(TaskType.UploadFile);

    const retrying = fileTask.retry?.();
    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
    await tasksService.cancelTask(fileTask.id);
    await retrying;

    expect(tasksService.findTask(fileTask.id)).toEqual(
      expect.objectContaining({ status: TaskStatus.Cancelled, failedItems: [] }),
    );
  });
});

describe('Several uploads at the same time', () => {
  const noSpaceLeftError = new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED);
  const sharedFolderOwner = {
    token: 'owner-token',
    bridgeUser: 'owner@internxt.com',
    bridgePass: 'owner-pass',
    encryptionKey: 'owner-key',
    bucketId: 'owner-bucket',
  };
  const fileNames = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index}`);

  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(MAX_CONCURRENT_UPLOADS);
    fakeFolderCreationTaking();
  });

  test('When two uploads run at the same time, then together they never go over the usual number of uploads at once', async () => {
    const mostAtTheSameTime = countUploadsAtTheSameTime(new Set());
    const uploadManager = new UploadManager();
    const photos = createUpload([getFolderWithFiles('Photos', fileNames('photo', 15))], [], { uploadManager });
    const videos = createUpload([getFolderWithFiles('Videos', fileNames('video', 15))], [], { uploadManager });

    await Promise.all([photos.run(), videos.run()]);

    expect(tasksOf(TaskType.UploadFolder).map(({ status }) => status)).toEqual([
      TaskStatus.Success,
      TaskStatus.Success,
    ]);
    expect(mostAtTheSameTime()).toBeLessThanOrEqual(MAX_CONCURRENT_UPLOADS);
  });

  test('When one upload is retried while another one is still running, then together they never go over the usual number of uploads at once', async () => {
    const stillFailing = new Set(fileNames('broken', 6));
    const mostAtTheSameTime = countUploadsAtTheSameTime(stillFailing);
    const uploadManager = new UploadManager();
    const photos = createUpload([getFolderWithFiles('Photos', [...stillFailing])], [], { uploadManager });
    const videos = createUpload([getFolderWithFiles('Videos', fileNames('video', 30))], [], { uploadManager });
    const runningPhotos = photos.run();
    const runningVideos = videos.run();
    const [photosTask] = tasksOf(TaskType.UploadFolder);
    await vi.waitFor(() => expect(tasksService.findTask(photosTask.id)?.failedItems).toHaveLength(6), {
      timeout: 3000,
    });
    stillFailing.clear();

    await Promise.all([photosTask.retry?.(), runningPhotos, runningVideos]);

    expect(tasksOf(TaskType.UploadFolder).map(({ status }) => status)).toEqual([
      TaskStatus.Success,
      TaskStatus.Success,
    ]);
    expect(tasksService.findTask(photosTask.id)?.failedItems).toEqual([]);
    expect(mostAtTheSameTime()).toBeLessThanOrEqual(MAX_CONCURRENT_UPLOADS);
  });

  test('When two uploads run at the same time, then each one only hears about its own items', async () => {
    uploadSucceeds();
    const uploadManager = new UploadManager();
    const onPhotoUploaded = vi.fn();
    const onVideoUploaded = vi.fn();
    const photos = createUpload([getFolderWithFiles('Photos', ['beach.png'])], [], {
      uploadManager,
      onItemUploaded: onPhotoUploaded,
    });
    const videos = createUpload([getFolderWithFiles('Videos', ['movie.mp4'])], [], {
      uploadManager,
      onItemUploaded: onVideoUploaded,
    });

    await Promise.all([photos.run(), videos.run()]);

    const uploadedUuids = (onItemUploaded: Mock) => onItemUploaded.mock.calls.map(([uploaded]) => uploaded.uuid).sort();
    expect(uploadedUuids(onPhotoUploaded)).toEqual(['Photos-uuid', 'beach-uuid']);
    expect(uploadedUuids(onVideoUploaded)).toEqual(['Videos-uuid', 'movie-uuid']);
    expect(tasksOf(TaskType.UploadFolder).map(({ progress }) => progress)).toEqual([1, 1]);
  });

  test('When the storage of a shared folder is full, then an upload to your own Drive still uploads', async () => {
    (uploadFile as Mock).mockImplementation(
      async (file: { name: string }, _progress, options: { ownerUserAuthenticationData?: { bucketId: string } }) => {
        if (file.name === 'slow') await new Promise((resolve) => setTimeout(resolve, 500));
        else if (options.ownerUserAuthenticationData?.bucketId === 'owner-bucket') throw noSpaceLeftError;
        return { uuid: `${file.name}-uuid` };
      },
    );
    const uploadManager = new UploadManager();
    const onStorageFull = vi.fn();
    const toSharedFolder = createUpload([], [getFileToUpload('full.pdf'), getFileToUpload('slow.pdf')], {
      uploadManager,
      ownerUserAuthenticationData: sharedFolderOwner,
      onStorageFull,
    });
    const runningToSharedFolder = toSharedFolder.run();
    await vi.waitFor(() => expect(onStorageFull).toHaveBeenCalled());

    const toOwnDrive = createUpload([], [getFileToUpload('mine.pdf')], { uploadManager });
    await Promise.all([toOwnDrive.run(), runningToSharedFolder]);

    const [fullTask, slowTask, mineTask] = tasksOf(TaskType.UploadFile);
    expect(fullTask.status).toBe(TaskStatus.Error);
    expect(slowTask.status).toBe(TaskStatus.Success);
    expect(mineTask.status).toBe(TaskStatus.Success);
    expect(uploadedNames()).toContain('mine');
  });
});
