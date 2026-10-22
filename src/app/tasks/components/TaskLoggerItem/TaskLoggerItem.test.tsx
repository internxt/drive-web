import { render, fireEvent } from '@testing-library/react';
import { describe, test, vi, expect } from 'vitest';
import TaskLoggerItem from './TaskLoggerItem';
import { TaskNotification, TaskStatus, TaskType } from '../../types';
import { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';

vi.mock('react-redux', () => ({
  useSelector: vi.fn().mockReturnValue(null),
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
    params: {},
    status: RetryableTaskStatus.Failed,
  });

  const openRetryModal = (container: HTMLElement) => {
    const row = container.querySelector('[role="none"]') as HTMLElement;
    fireEvent.mouseEnter(row);
    fireEvent.click(container.querySelector('[data-testid="task-logger-button"]') as HTMLElement);
  };

  const lastTaskToRetryProps = () => mockTaskToRetry.mock.calls.at(-1)?.[0];

  test('when the retry modal is opened and there are files to retry, then TaskToRetry receives isOpen true', () => {
    const { container } = render(
      <TaskLoggerItem notification={createNotification()} filesToRetry={[createFileToRetry()]} />,
    );

    openRetryModal(container);

    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: true });
  });

  test('when filesToRetry becomes empty while the retry modal is open, then TaskToRetry receives isOpen false', () => {
    const { container, rerender } = render(
      <TaskLoggerItem notification={createNotification()} filesToRetry={[createFileToRetry()]} />,
    );

    openRetryModal(container);
    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: true });

    rerender(<TaskLoggerItem notification={createNotification()} filesToRetry={[]} />);

    expect(lastTaskToRetryProps()).toMatchObject({ isOpen: false });
  });
});
