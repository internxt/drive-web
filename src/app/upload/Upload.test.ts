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
import {
  getCreatedFolder,
  getFileToUpload,
  getFolderToUpload,
  getUploadRepository,
} from 'testUtils/fixtures/upload.fixtures';
import { Upload } from './Upload';

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
) => new Upload({ destinationFolderUuid: DESTINATION_UUID, roots, files, uploadRepository, ...callbacks });

const uploadedNames = () => vi.mocked(uploadFile).mock.calls.map(([file]) => file.name);

const tasksOf = (action: TaskType) => tasksService.getTasks().filter((task) => task.action === action);

describe('Uploading what the user picked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    vi.mocked(newStorageService.deleteFolderByUuid).mockResolvedValue(undefined as never);
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
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
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
      if (file.name === 'broken') throw new Error('Server error');
      return { uuid: `${file.name}-uuid` };
    });
    const upload = createUpload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('broken.png'), getFileToUpload('beach.png')] })],
      [],
    );

    const { failed } = await upload.run();

    expect(failed).toHaveLength(1);
    expect(tasksOf(TaskType.UploadFolder)[0]).toEqual(
      expect.objectContaining({ status: TaskStatus.Success, progress: 2 / 3 }),
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

const failUploadsOf = (failingNames: string[], error: unknown = new Error('Server error')) =>
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => {
    if (failingNames.includes(file.name)) throw error;
    return { uuid: `${file.name}-uuid` };
  });

const uploadSucceeds = () =>
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));

describe('Retrying what failed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
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

    await folderTask.retry?.(retriedFailure);

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

  test('When the user retries everything while a file is already being retried, then that file is uploaded only once', async () => {
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

    const retryingOne = folderTask.retry?.(retryingFailure);
    const retryingEverything = tasksService.findTask(folderTask.id)?.retry?.();
    await Promise.all([retryingOne, retryingEverything]);

    expect(uploadedNames()).toEqual(['retrying', 'waiting']);
  });

  test('When the failed files of a folder are retried one by one at the same time, then the folder upload is counted once', async () => {
    failUploadsOf(['report', 'invoice']);
    await createUpload(
      [getFolderToUpload('Docs', { childrenFiles: [getFileToUpload('report.pdf'), getFileToUpload('invoice.pdf')] })],
      [],
    ).run();
    fakeUploadsTaking(100);
    const [folderTask] = tasksOf(TaskType.UploadFolder);
    const [reportFailure, invoiceFailure] = folderTask.failedItems ?? [];

    await Promise.all([folderTask.retry?.(reportFailure), folderTask.retry?.(invoiceFailure)]);

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
});
