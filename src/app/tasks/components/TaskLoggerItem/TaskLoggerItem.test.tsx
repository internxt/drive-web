import { render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, test, vi, expect } from 'vitest';
import TaskLoggerItem from './TaskLoggerItem';
import { FailedUploadItem, TaskData, TaskNotification, TaskStatus, TaskType, UploadFolderTask } from '../../types';
import tasksService from '../../services/tasks.service';
import { getFolderToUpload } from 'testUtils/fixtures/upload.fixtures';
import { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';

vi.mock('react-redux', () => ({
  useSelector: vi.fn().mockReturnValue(null),
  useDispatch: vi.fn(),
}));

vi.mock('../../hooks/useOpen', () => ({
  useOpenItem: vi.fn().mockReturnValue({ openItem: vi.fn() }),
}));

const mockRetryUpload = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useRetry', () => ({
  useRetryDownload: vi.fn().mockReturnValue({ retryDownload: vi.fn() }),
  useRetryUpload: vi.fn().mockReturnValue({ retryUpload: mockRetryUpload }),
}));

vi.mock('../../../store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: vi.fn().mockReturnValue({
    uploadFolder: vi.fn(),
    uploadItem: vi.fn(),
    uploadSharedItem: vi.fn(),
  }),
}));

const mockUploadRepository = vi.hoisted(() => ({
  setUploadState: vi.fn(() => Promise.resolve()),
  getUploadState: vi.fn(),
  removeUploadState: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../../repositories/DatabaseUploadRepository', () => ({
  default: { getInstance: () => mockUploadRepository },
}));

vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

const mockTaskToRetry = vi.hoisted(() => vi.fn());
vi.mock('../TaskToRetry/TaskToRetry', () => ({
  default: (props: { isOpen: boolean }) => {
    mockTaskToRetry(props);
    return null;
  },
}));

describe('TaskLoggerItem', () => {
  const createNotification = (): TaskNotification => ({
    taskId: 'task-1',
    action: TaskType.UploadFile,
    status: TaskStatus.Success,
    title: 'file.txt',
    subtitle: '',
    icon: () => <svg />,
    progress: 1,
    isTaskCancellable: false,
  });

  const createFileToRetry = (): RetryableTask => ({
    taskId: 'task-1',
    type: RetryableTaskType.Upload,
    params: {
      filecontent: {
        content: new File(['content'], 'file'),
        type: 'txt',
        name: 'file',
        size: 1024,
        parentFolderId: 'folder',
      },
      parentFolderId: 'folder',
      userEmail: 'user@example.com',
    },
    status: RetryableTaskStatus.Failed,
  });

  const openRetryModal = (container: HTMLElement) => {
    const row = container.querySelector('[role="none"]') as HTMLElement;
    fireEvent.mouseEnter(row);
    fireEvent.click(container.querySelector('[data-testid="task-logger-button"]') as HTMLElement);
  };

  const createFailedUploadItem = (name: string): FailedUploadItem => ({
    name,
    type: 'pdf',
    size: 1024,
    modifiedAt: 1677654000000,
    isFolder: false,
    isRetryable: true,
    isRetrying: false,
    retry: vi.fn(),
  });

  const createUploadTaskWithFailures = (
    failedItems: FailedUploadItem[],
    { action = TaskType.UploadFolder, status = TaskStatus.Success } = {},
  ): TaskData =>
    ({
      id: 'task-1',
      action,
      status,
      progress: 1,
      cancellable: true,
      showNotification: true,
      failedItems,
      retry: vi.fn(),
    }) as unknown as TaskData;

  const lastTaskToRetryProps = () => mockTaskToRetry.mock.calls.at(-1)?.[0];

  test('when the retry modal is opened and there are files to retry, then TaskToRetry receives isOpen true', () => {
    const { container } = render(
      <TaskLoggerItem notification={createNotification()} filesToRetry={[createFileToRetry()]} />,
    );

    openRetryModal(container);

    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: true });
  });

  test('when filesToRetry empties while the retry modal is open, then the modal closes and stays closed when new files arrive', () => {
    const { container, rerender } = render(
      <TaskLoggerItem notification={createNotification()} filesToRetry={[createFileToRetry()]} />,
    );
    openRetryModal(container);

    rerender(<TaskLoggerItem notification={createNotification()} filesToRetry={[]} />);
    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: false });

    rerender(<TaskLoggerItem notification={createNotification()} filesToRetry={[createFileToRetry()]} />);
    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: false });
  });

  test('When an upload task has failed items, then they are listed and retrying one retries only that one', () => {
    const [report, invoice] = [createFailedUploadItem('report'), createFailedUploadItem('invoice')];
    const task = createUploadTaskWithFailures([report, invoice]);
    const { container } = render(<TaskLoggerItem notification={createNotification()} task={task} filesToRetry={[]} />);
    openRetryModal(container);

    lastTaskToRetryProps().failedItems[1].retry();

    expect(lastTaskToRetryProps().failedItems.map(({ name }: { name: string }) => name)).toEqual(['report', 'invoice']);
    expect(invoice.retry).toHaveBeenCalledOnce();
    expect(report.retry).not.toHaveBeenCalled();
    expect(task.retry).not.toHaveBeenCalled();
  });

  test('When the user retries all the failed items of an upload task, then the whole task is retried', () => {
    const task = createUploadTaskWithFailures([createFailedUploadItem('report'), createFailedUploadItem('invoice')]);
    const { container } = render(<TaskLoggerItem notification={createNotification()} task={task} filesToRetry={[]} />);
    openRetryModal(container);

    lastTaskToRetryProps().onRetryAll();

    expect(task.retry).toHaveBeenCalledExactlyOnceWith();
  });

  test('When a file of an upload task fails, then the retry button of its row retries the task', () => {
    const notification = { ...createNotification(), status: TaskStatus.Error };
    const task = createUploadTaskWithFailures([], { action: TaskType.UploadFile, status: TaskStatus.Error });
    const { container } = render(<TaskLoggerItem notification={notification} task={task} filesToRetry={[]} />);
    fireEvent.mouseEnter(container.querySelector('[role="none"]') as HTMLElement);

    const [, retryButton] = container.querySelectorAll('[data-testid="task-logger-button"]');
    fireEvent.click(retryButton);

    expect(task.retry).toHaveBeenCalledExactlyOnceWith();
  });

  test('When an upload from the previous upload flow fails, then the retry button of its row retries it as before', () => {
    const notification = { ...createNotification(), status: TaskStatus.Error };
    const { container } = render(<TaskLoggerItem notification={notification} filesToRetry={[]} />);
    fireEvent.mouseEnter(container.querySelector('[role="none"]') as HTMLElement);

    const [, retryButton] = container.querySelectorAll('[data-testid="task-logger-button"]');
    fireEvent.click(retryButton);

    expect(mockRetryUpload).toHaveBeenCalledOnce();
  });
});

describe('Pausing an upload from the tasks list', () => {
  const buttonNextToCancel = 1;

  const createFolderUploadTask = (
    status: TaskStatus,
    callbacks: { pause?: () => Promise<void>; resume?: () => Promise<void> },
  ) => {
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: 'Photos',
      item: getFolderToUpload('Photos'),
      parentFolderId: 'destination-uuid',
      showNotification: true,
      cancellable: true,
      ...callbacks,
    });
    tasksService.updateTask({ taskId, merge: { status, progress: 0.2 } });
    return taskId;
  };

  const renderTaskRow = (taskId: string) =>
    render(
      <TaskLoggerItem
        notification={tasksService.findNotification(tasksService.findTask(taskId) as TaskData)}
        filesToRetry={[]}
      />,
    );

  const clickRowButton = (container: HTMLElement, position: number) => {
    fireEvent.mouseEnter(container.querySelector('[role="none"]') as HTMLElement);
    fireEvent.click(container.querySelectorAll('[data-testid="task-logger-button"]')[position] as HTMLElement);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
  });

  test('When the user pauses an upload that knows how to pause itself, then that upload is paused', () => {
    const pause = vi.fn(() => Promise.resolve());
    const taskId = createFolderUploadTask(TaskStatus.InProcess, { pause });
    const { container } = renderTaskRow(taskId);

    clickRowButton(container, buttonNextToCancel);

    expect(pause).toHaveBeenCalledOnce();
  });

  test('When the user resumes an upload that knows how to resume itself, then that upload continues', () => {
    const resume = vi.fn(() => Promise.resolve());
    const taskId = createFolderUploadTask(TaskStatus.Paused, { resume });
    const { container } = renderTaskRow(taskId);

    clickRowButton(container, buttonNextToCancel);

    expect(resume).toHaveBeenCalledOnce();
  });

  test('When the user pauses an upload from the previous upload flow, then its saved state and its task are marked as paused', async () => {
    const taskId = createFolderUploadTask(TaskStatus.InProcess, {});
    const { container } = renderTaskRow(taskId);

    clickRowButton(container, buttonNextToCancel);

    await vi.waitFor(() => expect(tasksService.findTask(taskId)?.status).toBe(TaskStatus.Paused));
    expect(mockUploadRepository.setUploadState).toHaveBeenCalledWith(taskId, TaskStatus.Paused);
  });
});
