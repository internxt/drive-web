import { render, fireEvent } from '@testing-library/react';
import { describe, test, vi, expect } from 'vitest';
import TaskLoggerItem from './TaskLoggerItem';
import { FailedUploadItem, TaskData, TaskNotification, TaskStatus, TaskType } from '../../types';
import { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';

vi.mock('react-redux', () => ({
  useSelector: vi.fn().mockReturnValue(null),
  useDispatch: vi.fn(),
}));

vi.mock('../../hooks/useOpen', () => ({
  useOpenItem: vi.fn().mockReturnValue({ openItem: vi.fn() }),
}));

vi.mock('../../hooks/useRetry', () => ({
  useRetryDownload: vi.fn().mockReturnValue({ retryDownload: vi.fn() }),
  useRetryUpload: vi.fn().mockReturnValue({ retryUpload: vi.fn() }),
}));

vi.mock('../../../store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: vi.fn().mockReturnValue({
    uploadFolder: vi.fn(),
    uploadItem: vi.fn(),
    uploadSharedItem: vi.fn(),
  }),
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
    id: `${name}-failure`,
    name,
    type: 'pdf',
    size: 1024,
    modifiedAt: 1677654000000,
    isFolder: false,
    isRetryable: true,
    isRetrying: false,
  });

  const createUploadTaskWithFailures = (failedItems: FailedUploadItem[]): TaskData =>
    ({
      id: 'task-1',
      action: TaskType.UploadFolder,
      status: TaskStatus.Success,
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
    expect(task.retry).toHaveBeenCalledExactlyOnceWith(invoice);
  });

  test('When the user retries all the failed items of an upload task, then the whole task is retried', () => {
    const task = createUploadTaskWithFailures([createFailedUploadItem('report'), createFailedUploadItem('invoice')]);
    const { container } = render(<TaskLoggerItem notification={createNotification()} task={task} filesToRetry={[]} />);
    openRetryModal(container);

    lastTaskToRetryProps().onRetryAll();

    expect(task.retry).toHaveBeenCalledExactlyOnceWith();
  });
});
