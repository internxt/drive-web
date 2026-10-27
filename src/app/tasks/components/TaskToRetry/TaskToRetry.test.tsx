import { render, fireEvent } from '@testing-library/react';
import { describe, test, vi, expect, beforeEach } from 'vitest';
import TaskToRetry from './TaskToRetry';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from '../../../network/RetryManager';
import { QueueUtilsService } from 'utils/queueUtils';

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

const mockDownloadItem = vi.hoisted(() => vi.fn());
vi.mock('../../../network/DownloadManager', () => ({
  DownloadManager: { downloadItem: mockDownloadItem },
}));

vi.mock('../../workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((value: string) => {
      return value;
    }),
  }),
}));

const mockUnwrapRetryUpload = vi.hoisted(() => vi.fn());
const mockUploadRetryItem = vi.hoisted(() => vi.fn());
vi.mock('app/store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: vi.fn().mockReturnValue({ uploadRetryItem: mockUploadRetryItem }),
}));

describe('TaskToRetry', () => {
  const mockOnClose = vi.fn();

  const mockChangeStatus = vi.spyOn(RetryManager, 'changeStatus');

  const createUploadTask = (name: string, type: string): RetryableTask => ({
    taskId: 'task-1',
    type: RetryableTaskType.Upload,
    params: {
      filecontent: {
        content: new File(['file-content'], name),
        type,
        name,
        size: 1024,
        parentFolderId: 'folder-1',
      },
      parentFolderId: 'folder-1',
      taskId: 'task-1',
      userEmail: 'user@example.com',
    },
    status: RetryableTaskStatus.Failed,
  });

  const retryUpload = (task: RetryableTask): File => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={[task]} onClose={mockOnClose} />);
    fireEvent.click(getByTestId('task-logger-button'));
    return mockUploadRetryItem.mock.calls[0][0].uploadFile;
  };

  const getRetryAllButton = (container: HTMLElement): HTMLElement | null =>
    container.querySelector('[data-cy="retry-all-taskRetry-button"]');

  const createUploadTaskWithId = (taskId: string, overrides: Partial<RetryableTask> = {}): RetryableTask => {
    const task = createUploadTask(`file-${taskId}`, 'txt');
    return { ...task, taskId, params: { ...task.params, taskId }, ...overrides };
  };

  const createDownloadTaskWithId = (taskId: string): RetryableTask => ({
    taskId,
    type: RetryableTaskType.Download,
    params: { taskId },
    status: RetryableTaskStatus.Failed,
  });

  const RETRY_ALL_CONCURRENCY = 6;

  const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  };

  const wireSequentialDeferreds = (
    mockFn: ReturnType<typeof vi.fn>,
    count: number,
  ): ReturnType<typeof createDeferred>[] => {
    const deferredByFile = Array.from({ length: count }, () => createDeferred());
    let nextIndex = 0;
    mockFn.mockImplementation(() => deferredByFile[nextIndex++].promise);
    return deferredByFile;
  };

  const files: RetryableTask[] = [createUploadTask('file', 'txt')];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnwrapRetryUpload.mockResolvedValue(undefined);
    mockUploadRetryItem.mockReturnValue({ unwrap: mockUnwrapRetryUpload });
  });

  test('when isOpen is true, then the modal renders', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    expect(getByTestId('title-taskRetry')).toBeInTheDocument();
  });

  test('when isOpen is false, then the modal does not render', () => {
    const { queryByTestId } = render(<TaskToRetry isOpen={false} files={files} onClose={mockOnClose} />);
    expect(queryByTestId('title-taskRetry')).not.toBeInTheDocument();
  });

  test('when the close button is clicked, then onClose is called', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    const closeButton = getByTestId('close-taskRetry-button');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('when there are files, then the "all processes have finished" message is not shown', () => {
    const { queryByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);
    expect(queryByTestId('finish-msg-taskRetry')).not.toBeInTheDocument();
  });

  test('when there are failed files, then the title shows the count', () => {
    const retryableFiles = [createUploadTaskWithId('a'), createUploadTaskWithId('b')];

    const { getByTestId } = render(<TaskToRetry isOpen={true} files={retryableFiles} onClose={mockOnClose} />);

    expect(getByTestId('title-taskRetry')).toHaveTextContent('(2)');
  });

  test('when there are no files, then the title does not show a count', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={[]} onClose={mockOnClose} />);

    expect(getByTestId('title-taskRetry')).not.toHaveTextContent('(0)');
  });

  test('when a failed upload is retried, then uploadRetryItem is called and status updates to Retrying', () => {
    const { getByTestId } = render(<TaskToRetry isOpen={true} files={files} onClose={mockOnClose} />);

    const downloadItem = getByTestId('task-logger-button');

    if (downloadItem) fireEvent.click(downloadItem);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', RetryableTaskStatus.Retrying);
    expect(mockUploadRetryItem).toHaveBeenCalledWith({
      uploadFile: expect.any(File),
      parentFolderId: 'folder-1',
      taskId: 'task-1',
      fileType: 'txt',
    });
  });

  test('when a file whose name has dots is retried, then it is uploaded with its full original name', () => {
    const uploadFile = retryUpload(createUploadTask('Screenshot 2026-10-12 at 11.48.02 PM', 'png'));

    expect(uploadFile.name).toBe('Screenshot 2026-10-12 at 11.48.02 PM.png');
  });

  test('when a file without extension is retried, then it is uploaded with its name unchanged', () => {
    const uploadFile = retryUpload(createUploadTask('Makefile', ''));

    expect(uploadFile.name).toBe('Makefile');
  });

  test('when the retried upload is rejected, then status goes back to Failed', async () => {
    mockUnwrapRetryUpload.mockRejectedValueOnce(new Error('Upload failed'));

    retryUpload(files[0]);

    expect(mockChangeStatus).toHaveBeenCalledWith('task-1', RetryableTaskStatus.Retrying);
    await vi.waitFor(() => expect(mockChangeStatus).toHaveBeenCalledWith('task-1', RetryableTaskStatus.Failed));
  });

  test('when there are failed, retryable files, then the retry all button is rendered', () => {
    const retryableFiles = [createUploadTaskWithId('a'), createUploadTaskWithId('b')];

    const { container } = render(<TaskToRetry isOpen={true} files={retryableFiles} onClose={mockOnClose} />);

    expect(getRetryAllButton(container)).toBeInTheDocument();
  });

  test('when there are no eligible files, then the retry all button is not rendered', () => {
    const noEligibleFiles = [
      createUploadTaskWithId('a', { status: RetryableTaskStatus.Retrying }),
      createUploadTaskWithId('b', { retryable: false }),
    ];

    const { container } = render(<TaskToRetry isOpen={true} files={noEligibleFiles} onClose={mockOnClose} />);

    expect(getRetryAllButton(container)).not.toBeInTheDocument();
  });

  test('when retry all is clicked, then every failed and retryable file is retried', async () => {
    const retryableFiles = [createUploadTaskWithId('a'), createUploadTaskWithId('b')];

    const { container } = render(<TaskToRetry isOpen={true} files={retryableFiles} onClose={mockOnClose} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expect(mockChangeStatus).toHaveBeenCalledWith('a', RetryableTaskStatus.Retrying);
    expect(mockChangeStatus).toHaveBeenCalledWith('b', RetryableTaskStatus.Retrying);
    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalledTimes(2));
  });

  test('when retry all is clicked, then files that are not failed or not retryable are skipped', async () => {
    const mixedFiles = [
      createUploadTaskWithId('a'),
      createUploadTaskWithId('b', { status: RetryableTaskStatus.Retrying }),
      createUploadTaskWithId('c', { retryable: false }),
    ];

    const { container } = render(<TaskToRetry isOpen={true} files={mixedFiles} onClose={mockOnClose} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expect(mockChangeStatus).toHaveBeenCalledWith('a', RetryableTaskStatus.Retrying);
    expect(mockChangeStatus).not.toHaveBeenCalledWith('b', RetryableTaskStatus.Retrying);
    expect(mockChangeStatus).not.toHaveBeenCalledWith('c', RetryableTaskStatus.Retrying);
    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalledTimes(1));
  });

  test('when retry all is clicked, then every eligible file becomes Retrying immediately, regardless of the concurrency limit', () => {
    const totalFiles = RETRY_ALL_CONCURRENCY + 2;
    const retryableFiles = Array.from({ length: totalFiles }, (_, index) => createUploadTaskWithId(`upload-${index}`));

    const { container } = render(<TaskToRetry isOpen={true} files={retryableFiles} onClose={mockOnClose} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    retryableFiles.forEach(({ taskId }) => {
      expect(mockChangeStatus).toHaveBeenCalledWith(taskId, RetryableTaskStatus.Retrying);
    });
  });

  const expectThrottledRetryAll = async (effectiveConcurrency: number): Promise<void> => {
    const totalFiles = effectiveConcurrency + 2;
    const deferredByFile = wireSequentialDeferreds(mockDownloadItem, totalFiles);
    const downloadTasks = Array.from({ length: totalFiles }, (_, index) =>
      createDownloadTaskWithId(`download-${index}`),
    );

    const { container } = render(<TaskToRetry isOpen={true} files={downloadTasks} onClose={mockOnClose} />);
    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(effectiveConcurrency));

    deferredByFile[0].resolve();

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(effectiveConcurrency + 1));

    deferredByFile.slice(1).forEach(({ resolve }) => resolve());

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(totalFiles));
  };

  test('when retry all is clicked with more files than the concurrency limit, then only 6 start retrying immediately and the rest start as earlier ones finish', async () => {
    await expectThrottledRetryAll(RETRY_ALL_CONCURRENCY);
  });

  test('when retry all retries uploads, then the concurrency cap waits for each upload to finish before starting the next', async () => {
    const totalFiles = RETRY_ALL_CONCURRENCY + 1;
    const deferredByFile = wireSequentialDeferreds(mockUnwrapRetryUpload, totalFiles);

    const uploadTasks = Array.from({ length: totalFiles }, (_, index) => createUploadTaskWithId(`upload-${index}`));

    const { container } = render(<TaskToRetry isOpen={true} files={uploadTasks} onClose={mockOnClose} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalledTimes(RETRY_ALL_CONCURRENCY));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockUploadRetryItem).toHaveBeenCalledTimes(RETRY_ALL_CONCURRENCY);

    deferredByFile[0].resolve();

    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalledTimes(totalFiles));
  });

  test('when memory usage is high, then retry all ramps concurrency down and runs fewer than 6 at a time', async () => {
    vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(1);

    await expectThrottledRetryAll(1);
  });
});
