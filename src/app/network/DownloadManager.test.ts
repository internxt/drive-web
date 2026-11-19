import {
  areItemArraysEqual,
  DownloadItemType,
  DownloadManagerService,
  DownloadTask,
  isLostConnectionError,
} from 'app/drive/services/downloadManager.service';
import { ErrorMessages } from 'app/core/constants';
import { createFilesIterator, createFoldersIterator } from 'app/drive/services/folder.service';
import { DriveFileData, DriveFolderData } from 'app/drive/types';
import tasksService from 'app/tasks/services/tasks.service';
import { QueueUtilsService } from 'utils/queueUtils';
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { ConnectionLostError } from './requests';
import errorService from 'services/error.service';
import { TaskData, TaskStatus } from 'app/tasks/types';
import retryManager, { RetryableTask } from './RetryManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import {
  getDownloadItem,
  getDownloadTask,
  getDriveFileData,
  getDriveFolderData,
} from 'testUtils/fixtures/download.fixtures';
import { v7 as uuidV7 } from 'uuid';

const MOCK_TRANSLATION_MESSAGE = 'Test translation message';

vi.mock('app/drive/services/folder.service', () => ({
  default: {},
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

vi.mock('i18next', () => ({ t: () => MOCK_TRANSLATION_MESSAGE }));

vi.mock('app/drive/services/downloadManager.service', () => ({
  DownloadManagerService: {
    instance: {
      generateTasksForItem: vi.fn(),
      downloadFolder: vi.fn(),
      downloadFile: vi.fn(),
      downloadItems: vi.fn(),
    },
  },
  isLostConnectionError: vi.fn(),
  areItemArraysEqual: vi.fn(),
}));

describe('downloadManager', () => {
  type DownloadMethod = 'downloadFolder' | 'downloadFile' | 'downloadItems';
  type DownloadSpies = Record<DownloadMethod, MockInstance>;

  const getTaskData = (status: TaskStatus) => ({ id: 'any-taskId', status }) as TaskData;

  const mockDownloadFlow = (
    task: DownloadTask,
    { concurrency = 6, taskData }: { concurrency?: number; taskData?: TaskData } = {},
  ) => {
    vi.spyOn(DownloadManagerService.instance, 'generateTasksForItem').mockResolvedValue(task);
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(concurrency);
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'findTask').mockReturnValue(taskData);
  };

  const spyOnDownloadMethods = (expected: DownloadMethod, expectedError?: Error): DownloadSpies => {
    const unexpectedCall = new Error(`It should download using ${expected}`);
    const spies: DownloadSpies = {
      downloadFolder: vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockRejectedValue(unexpectedCall),
      downloadFile: vi.spyOn(DownloadManagerService.instance, 'downloadFile').mockRejectedValue(unexpectedCall),
      downloadItems: vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockRejectedValue(unexpectedCall),
    };
    spies[expected].mockResolvedValue(undefined);
    if (expectedError) spies[expected].mockRejectedValue(expectedError);
    return spies;
  };

  const expectOnlyCalled = (spies: DownloadSpies, expected?: DownloadMethod) => {
    const unexpected = (Object.keys(spies) as DownloadMethod[]).filter((method) => method !== expected);
    unexpected.forEach((method) => expect(spies[method]).not.toHaveBeenCalled());
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const downloadCases: Array<{
    name: string;
    items: Array<DriveFileData | DriveFolderData>;
    method: DownloadMethod;
    extraArgs: number;
  }> = [
    {
      name: 'should generate task for a folder and download it using the queue',
      items: [getDriveFolderData()],
      method: 'downloadFolder',
      extraArgs: 3,
    },
    {
      name: 'should generate task for a file and download it using the queue',
      items: [getDriveFileData()],
      method: 'downloadFile',
      extraArgs: 1,
    },
    {
      name: 'should generate task for items and download them together using the queue',
      items: [getDriveFileData(), getDriveFolderData()],
      method: 'downloadItems',
      extraArgs: 3,
    },
  ];

  it.each(downloadCases)('$name', async ({ items, method, extraArgs }) => {
    const task = getDownloadTask(items);
    mockDownloadFlow(task);
    const spies = spyOnDownloadMethods(method);

    await DownloadManager.downloadItem(getDownloadItem(items));

    expect(spies[method]).toHaveBeenCalledOnce();
    expect(spies[method]).toHaveBeenCalledWith(task, ...Array.from({ length: extraArgs }, () => expect.anything()));
    expectOnlyCalled(spies, method);
  });

  it('should modify queue concurrency if its needed', async () => {
    const items = [getDriveFileData()];
    const newConcurrency = DownloadManager.downloadQueue.concurrency + 1;
    mockDownloadFlow(getDownloadTask(items), { concurrency: newConcurrency });
    spyOnDownloadMethods('downloadFile');

    await DownloadManager.downloadItem(getDownloadItem(items));

    expect(DownloadManager.downloadQueue.concurrency).toEqual(newConcurrency);
  });

  it('should abort download task when abortcontroller abort is called', async () => {
    const abortController = new AbortController();
    const items = [getDriveFileData()];
    mockDownloadFlow(getDownloadTask(items, { abortController }), {
      concurrency: DownloadManager.downloadQueue.concurrency + 1,
    });
    const spies = spyOnDownloadMethods('downloadFile');

    const downloadPromise = DownloadManager.downloadItem(getDownloadItem(items));
    abortController.abort();

    await expect(downloadPromise).rejects.toThrow();
    expect(abortController.signal.aborted).toBe(true);
    expectOnlyCalled(spies);
  });

  it('should handle connection lost error during download', async () => {
    const items = [getDriveFileData()];
    const task = getDownloadTask(items);
    const connectionLostError = new ConnectionLostError();
    mockDownloadFlow(task);
    const spies = spyOnDownloadMethods('downloadFile', connectionLostError);

    await expect(DownloadManager.downloadItem(getDownloadItem(items))).rejects.toThrow(connectionLostError);

    expect(spies.downloadFile).toHaveBeenCalledWith(task, expect.anything());
    expectOnlyCalled(spies, 'downloadFile');
  });

  it('should handle file error during download', async () => {
    const items = [getDriveFileData()];
    const task = getDownloadTask(items);
    const testError = new Error(ErrorMessages.ServerUnavailable);
    mockDownloadFlow(task, { taskData: getTaskData(TaskStatus.Error) });
    const spies = spyOnDownloadMethods('downloadFile', testError);
    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    await expect(DownloadManager.downloadItem(getDownloadItem(items))).rejects.toThrow(testError);

    expect(errorServiceSpy).toHaveBeenCalledWith(testError);
    expect(spies.downloadFile).toHaveBeenCalledWith(task, expect.anything());
    expectOnlyCalled(spies, 'downloadFile');
  });

  it('should handle folder error during download', async () => {
    const items = [getDriveFolderData()];
    const task = getDownloadTask(items);
    const testError = new Error(ErrorMessages.ServerUnavailable);
    mockDownloadFlow(task, { taskData: getTaskData(TaskStatus.Error) });
    const spies = spyOnDownloadMethods('downloadFolder', testError);
    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    await expect(DownloadManager.downloadItem(getDownloadItem(items))).rejects.toThrow(testError);

    expect(errorServiceSpy).toHaveBeenCalledWith(testError);
    expect(spies.downloadFolder).toHaveBeenCalledWith(task, expect.anything(), expect.anything(), expect.anything());
    expectOnlyCalled(spies, 'downloadFolder');
  });

  it('should handle task cancellation during download', async () => {
    const items = [getDriveFileData()];
    mockDownloadFlow(getDownloadTask(items), { taskData: getTaskData(TaskStatus.Cancelled) });
    spyOnDownloadMethods('downloadFile');

    await expect(DownloadManager.downloadItem(getDownloadItem(items))).resolves.not.toThrow();
  });

  describe('downloadTask', () => {
    it('should update task status to Error when all items fail (failedItems > 0)', async () => {
      const mockTask = { id: 'task-1', status: TaskStatus.InProcess } as TaskData;
      vi.spyOn(tasksService, 'findTask').mockReturnValue(mockTask);

      const downloadTask = {
        items: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
        taskId: 'task-1',
        abortController: new AbortController(),
        options: {
          showErrors: true,
        },
        failedItems: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();
      vi.mocked(areItemArraysEqual).mockReturnValueOnce(true);

      await expect(DownloadManager['downloadTask'](downloadTask)).rejects.toThrow(ErrorMessages.ServerUnavailable);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: 'task-1',
        merge: { status: TaskStatus.Error },
      });
      expect(downloadItemsSpy).toHaveBeenCalled();
    });

    it('should not throw an error if only some items fail (failedItems > 0 but not all)', async () => {
      const mockTask = { id: 'task-2', status: TaskStatus.InProcess } as TaskData;
      vi.spyOn(tasksService, 'findTask').mockReturnValue(mockTask);

      const downloadTask = {
        items: [
          { id: 123, isFolder: false },
          { id: 234, isFolder: true },
        ] as DownloadItemType[],
        taskId: 'task-2',
        abortController: new AbortController(),
        options: {
          showErrors: true,
        },
        failedItems: [{ id: 123, isFolder: false }] as DownloadItemType[],
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadItemsSpy = vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockResolvedValue();

      await expect(DownloadManager['downloadTask'](downloadTask)).resolves.not.toThrow();

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: 'task-2',
        merge: { status: TaskStatus.Success },
      });
      expect(downloadItemsSpy).toHaveBeenCalled();
    });

    it('When downloading a folder, then the task should be updated with the downloaded progress', async () => {
      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: 'task-folder',
        status: TaskStatus.InProcess,
      } as TaskData);
      vi.spyOn(DownloadManagerService.instance, 'downloadFolder').mockImplementation(
        async (_task, _updateStatusProgress, updateDownloadedProgress) => {
          updateDownloadedProgress(100);
          updateDownloadedProgress(200);
          updateDownloadedProgress(150);
        },
      );
      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadTask = {
        items: [{ id: 1, isFolder: true }] as DownloadItemType[],
        taskId: 'task-folder',
        abortController: new AbortController(),
        options: { downloadName: 'test', areSharedItems: false, showErrors: true },
        credentials: { credentials: { user: 'test', pass: 'test' }, key: { mnemonic: 'test' } },
        createFilesIterator,
        createFoldersIterator,
        failedItems: [],
      } as DownloadTask;

      await DownloadManager['downloadTask'](downloadTask);

      expect(updateTaskSpy).toHaveBeenCalledWith({ taskId: 'task-folder', merge: { downloadedProgress: 100 } });
      expect(updateTaskSpy).toHaveBeenCalledWith({ taskId: 'task-folder', merge: { downloadedProgress: 300 } });
      expect(updateTaskSpy).toHaveBeenCalledWith({ taskId: 'task-folder', merge: { downloadedProgress: 450 } });
    });

    it('When downloading multiple items, then the task should be updated with the downloaded progress', async () => {
      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: 'task-items',
        status: TaskStatus.InProcess,
      } as TaskData);
      vi.spyOn(DownloadManagerService.instance, 'downloadItems').mockImplementation(
        async (_task, _updateStatusProgress, updateDownloadedProgress) => {
          updateDownloadedProgress(50);
          updateDownloadedProgress(75);
        },
      );
      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadTask = {
        items: [
          { id: 1, isFolder: false },
          { id: 2, isFolder: true },
        ] as DownloadItemType[],
        taskId: 'task-items',
        abortController: new AbortController(),
        options: { downloadName: 'test', areSharedItems: false, showErrors: true },
        credentials: { credentials: { user: 'test', pass: 'test' }, key: { mnemonic: 'test' } },
        createFilesIterator,
        createFoldersIterator,
        failedItems: [],
      } as DownloadTask;

      await DownloadManager['downloadTask'](downloadTask);

      expect(updateTaskSpy).toHaveBeenCalledWith({ taskId: 'task-items', merge: { downloadedProgress: 50 } });
      expect(updateTaskSpy).toHaveBeenCalledWith({ taskId: 'task-items', merge: { downloadedProgress: 125 } });
    });

    it('When the task is cancelled, then the task should not be updated with the downloaded progress', async () => {
      vi.spyOn(tasksService, 'findTask').mockReturnValue({ id: 'task-4', status: TaskStatus.Cancelled } as TaskData);
      const downloadFolderSpy = vi.spyOn(DownloadManagerService.instance, 'downloadFolder');
      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      const downloadTask = {
        items: [{ id: 1, isFolder: true }] as DownloadItemType[],
        taskId: 'task-4',
        abortController: new AbortController(),
        options: { downloadName: 'test', areSharedItems: false, showErrors: true },
        credentials: { credentials: { user: 'test', pass: 'test' }, key: { mnemonic: 'test' } },
        createFilesIterator,
        createFoldersIterator,
        failedItems: [],
      } as DownloadTask;

      await DownloadManager['downloadTask'](downloadTask);

      expect(downloadFolderSpy).not.toHaveBeenCalled();
      expect(updateTaskSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ merge: expect.objectContaining({ downloadedProgress: expect.anything() }) }),
      );
    });
  });

  describe('removeRetryItems', () => {
    const [uuid1, uuid2, uuid3] = [uuidV7(), uuidV7(), uuidV7()];

    it('should remove retry items that are not in the failed items list', () => {
      const items = [
        { uuid: uuid1, isFolder: false },
        { uuid: uuid2, isFolder: true },
        { uuid: uuid3, isFolder: false },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-1',
        failedItems: [{ uuid: uuid2, isFolder: true }],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams');

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).toHaveBeenCalledTimes(2);
      expect(removeTaskSpy).toHaveBeenCalledWith('task-1', { uuid: uuid1 });
      expect(removeTaskSpy).toHaveBeenCalledWith('task-1', { uuid: uuid3 });
    });

    it('should not remove any retry items if all items are in the failed items list', () => {
      const items = [
        { uuid: uuid1, isFolder: false },
        { uuid: uuid2, isFolder: true },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-2',
        failedItems: [
          { uuid: uuid1, isFolder: false },
          { uuid: uuid2, isFolder: true },
        ],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams');

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).not.toHaveBeenCalled();
    });

    it('should handle an empty failed items list', () => {
      const items = [
        { uuid: uuid1, isFolder: false },
        { uuid: uuid2, isFolder: true },
      ] as DownloadItemType[];

      const downloadTask = {
        taskId: 'task-3',
        failedItems: [] as DownloadItemType[],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams').mockReturnValue();

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).toHaveBeenCalledTimes(2);
      expect(removeTaskSpy).toHaveBeenCalledWith('task-3', { uuid: uuid1 });
      expect(removeTaskSpy).toHaveBeenCalledWith('task-3', { uuid: uuid2 });
    });

    it('should handle an empty items list', () => {
      const items: DownloadItemType[] = [];

      const downloadTask = {
        taskId: 'task-4',
        failedItems: [{ uuid: uuid1, isFolder: false }],
      } as DownloadTask;

      const removeTaskSpy = vi.spyOn(retryManager, 'removeTaskByIdAndParams').mockReturnValue();

      DownloadManager['removeRetryItems'](items, downloadTask);

      expect(removeTaskSpy).not.toHaveBeenCalled();
    });
  });

  describe('reportError', () => {
    it('should update task status to Error and throw connection lost error', () => {
      const mockTaskId = 'task-1';
      const mockError = new ConnectionLostError();
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: [] as DownloadItemType[],
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      vi.mocked(isLostConnectionError).mockReturnValueOnce(true);

      expect(() => {
        DownloadManager['reportError'](mockError, mockDownloadTask);
      }).toThrow(mockError);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error, subtitle: MOCK_TRANSLATION_MESSAGE },
      });
    });

    it('should handle server error and remove retry items', () => {
      const mockTaskId = 'task-2';
      const mockError = new Error(ErrorMessages.ServerUnavailable);
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.InProcess,
      } as TaskData);
      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const retryTaskSpy = vi.spyOn(retryManager, 'getTasksById').mockReturnValueOnce([]);

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(retryTaskSpy).toHaveBeenCalledWith(mockTaskId);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
    });

    it('should handle server error when retry task has elements', () => {
      const mockTaskId = 'task-2';
      const mockError = new Error(ErrorMessages.ServerUnavailable);
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.InProcess,
      } as TaskData);
      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const retryTaskSpy = vi.spyOn(retryManager, 'getTasksById').mockReturnValueOnce([
        {
          taskId: mockTaskId,
          type: 'download',
          params: { id: 1, isFolder: false },
        } as RetryableTask,
      ]);

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(retryTaskSpy).toHaveBeenCalledWith(mockTaskId);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Success },
      });
    });

    it('should report folder error with extra details', () => {
      const mockTaskId = 'task-3';
      const mockError = new Error('Folder error');
      const mockPartialFolder = { id: 1, isFolder: true, name: 'Folder1', bucket: 'bucket1', parentId: 0 };
      const mockItems = [mockPartialFolder];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const findTaskSpy = vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Success,
      } as TaskData);
      const errorServiceSpy = vi.spyOn(errorService, 'reportError');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(errorServiceSpy).toHaveBeenCalledWith(mockError);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
      expect(findTaskSpy).toHaveBeenCalledWith(mockTaskId);
    });

    it('should report file error with extra details', () => {
      const mockTaskId = 'task-4';
      const mockError = new Error('File error');
      const mockPartialFile = { id: 1, isFolder: false, name: 'File1', bucket: 'bucket1', size: 100, type: 'jpg' };
      const mockItems = [mockPartialFile];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');
      const findTaskSpy = vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Success,
      } as TaskData);
      const errorServiceSpy = vi.spyOn(errorService, 'reportError');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(errorServiceSpy).toHaveBeenCalledWith(mockError);
      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Error },
      });
      expect(findTaskSpy).toHaveBeenCalledWith(mockTaskId);
    });

    it('should show error notification if showErrors is true', () => {
      const mockTaskId = 'task-5';
      const mockError = new Error('Notification error');
      const mockItems = [{ id: 1, isFolder: false }];
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: mockItems,
        options: { showErrors: true },
      } as DownloadTask;

      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.InProcess,
      } as TaskData);
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(notificationsServiceSpy).toHaveBeenCalledWith({
        text: MOCK_TRANSLATION_MESSAGE,
        type: ToastType.Error,
      });
    });

    it('should update task status to Cancelled if task is cancelled', () => {
      const mockTaskId = 'task-6';
      const mockError = new Error('Cancelled error');
      const mockDownloadTask = {
        taskId: mockTaskId,
        items: [] as DownloadItemType[],
        options: { showErrors: true },
      } as DownloadTask;

      vi.spyOn(tasksService, 'findTask').mockReturnValue({
        id: mockTaskId,
        status: TaskStatus.Cancelled,
      } as TaskData);

      const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

      DownloadManager['reportError'](mockError, mockDownloadTask);

      expect(updateTaskSpy).toHaveBeenCalledWith({
        taskId: mockTaskId,
        merge: { status: TaskStatus.Cancelled },
      });
    });
  });
});
