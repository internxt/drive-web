import { render, fireEvent } from '@testing-library/react';
import { describe, test, vi, expect, beforeEach, afterEach } from 'vitest';
import TaskToRetry from './TaskToRetry';
import { useRetryManagerFailedItems } from './useRetryManagerFailedItems';
import { FailedItemToRetry } from '../TaskToRetryItem/TaskToRetryItem';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from '../../../network/RetryManager';
import { QueueUtilsService } from 'utils/queueUtils';
import { MAX_CONCURRENT_UPLOADS } from 'app/network/networkConstants';
import { retryQueue } from '../../services/retryQueue';

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
  useTranslationContext: vi.fn().mockReturnValue({ translate: (value: string) => value }),
}));

const aFailedItem = (name: string, overrides: Partial<FailedItemToRetry> = {}): FailedItemToRetry => ({
  name,
  type: 'txt',
  size: 1024,
  modifiedAt: 1677654000000,
  isFolder: false,
  isRetryable: true,
  isRetrying: false,
  retry: vi.fn(),
  ...overrides,
});

const getRetryAllButton = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('[data-cy="retry-all-taskRetry-button"]');

describe('Failed items modal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When the modal is closed, then nothing is shown', () => {
    const { queryByTestId } = render(
      <TaskToRetry isOpen={false} failedItems={[aFailedItem('a')]} isUpload onClose={onClose} />,
    );

    expect(queryByTestId('title-taskRetry')).not.toBeInTheDocument();
  });

  test.each([
    { isUpload: true, title: 'tasks.messages.failedToUpload' },
    { isUpload: false, title: 'tasks.messages.failedToDownload' },
  ])('When the failed items come from an upload or a download, then the title says so', ({ isUpload, title }) => {
    const { getByTestId } = render(
      <TaskToRetry isOpen failedItems={[aFailedItem('a')]} isUpload={isUpload} onClose={onClose} />,
    );

    expect(getByTestId('title-taskRetry')).toHaveTextContent(title);
  });

  test('When there are failed items, then each one is listed and can be retried', () => {
    const failedItems = [aFailedItem('report'), aFailedItem('invoice')];
    const { getByText, getAllByTestId } = render(
      <TaskToRetry isOpen failedItems={failedItems} isUpload onClose={onClose} />,
    );

    fireEvent.click(getAllByTestId('task-logger-button')[1]);

    expect(getByText('report.txt')).toBeInTheDocument();
    expect(getByText('invoice.txt')).toBeInTheDocument();
    expect(failedItems[1].retry).toHaveBeenCalledOnce();
  });

  test('When there are no failed items left, then a finished message is shown', () => {
    const { getByTestId } = render(<TaskToRetry isOpen failedItems={[]} isUpload onClose={onClose} />);

    expect(getByTestId('finish-msg-taskRetry')).toBeInTheDocument();
  });

  test('When the user closes the modal, then it is closed', () => {
    const { getByTestId } = render(<TaskToRetry isOpen failedItems={[]} isUpload onClose={onClose} />);

    fireEvent.click(getByTestId('close-taskRetry-button'));

    expect(onClose).toHaveBeenCalled();
  });

  test('When there are failed items, then the title shows how many', () => {
    const { getByTestId } = render(
      <TaskToRetry isOpen failedItems={[aFailedItem('a'), aFailedItem('b')]} isUpload onClose={onClose} />,
    );

    expect(getByTestId('title-taskRetry')).toHaveTextContent('(2)');
  });

  test('When there are no failed items, then the title shows no count', () => {
    const { getByTestId } = render(<TaskToRetry isOpen failedItems={[]} isUpload onClose={onClose} />);

    expect(getByTestId('title-taskRetry')).not.toHaveTextContent('(0)');
  });

  test('When no failed item can be retried right now, then there is no option to retry them all', () => {
    const failedItems = [aFailedItem('a', { isRetrying: true }), aFailedItem('b', { isRetryable: false })];

    const { container } = render(<TaskToRetry isOpen failedItems={failedItems} isUpload onClose={onClose} />);

    expect(getRetryAllButton(container)).not.toBeInTheDocument();
  });

  test('When the user retries them all, then only the items that can be retried are retried', () => {
    const failedItems = [
      aFailedItem('a'),
      aFailedItem('b', { isRetrying: true }),
      aFailedItem('c', { isRetryable: false }),
    ];
    const { container } = render(<TaskToRetry isOpen failedItems={failedItems} isUpload onClose={onClose} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expect(failedItems[0].retry).toHaveBeenCalledOnce();
    expect(failedItems[1].retry).not.toHaveBeenCalled();
    expect(failedItems[2].retry).not.toHaveBeenCalled();
  });

  test('When the failed items have their own way to retry them all, then it is used instead of retrying one by one', () => {
    const onRetryAll = vi.fn();
    const failedItems = [aFailedItem('a'), aFailedItem('b')];
    const { container } = render(
      <TaskToRetry isOpen failedItems={failedItems} isUpload onClose={onClose} onRetryAll={onRetryAll} />,
    );

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expect(onRetryAll).toHaveBeenCalledOnce();
    expect(failedItems[0].retry).not.toHaveBeenCalled();
  });
});

describe('Retrying the failed items kept in the retry manager', () => {
  const mockOnClose = vi.fn();

  const RetryManagerDialog = ({ files }: { files: RetryableTask[] }) => {
    const failedItems = useRetryManagerFailedItems(files);
    return <TaskToRetry isOpen failedItems={failedItems} isUpload={false} onClose={mockOnClose} />;
  };

  const mockChangeStatus = vi.spyOn(RetryManager, 'changeStatus');

  const getRetryAllButton = (container: HTMLElement): HTMLElement | null =>
    container.querySelector('[data-cy="retry-all-taskRetry-button"]');

  const createDownloadTaskWithId = (taskId: string, overrides: Partial<RetryableTask> = {}): RetryableTask => ({
    taskId,
    type: RetryableTaskType.Download,
    params: { taskId, id: `${taskId}-file` },
    status: RetryableTaskStatus.Failed,
    ...overrides,
  });

  const expectRetrying = (taskId: string) =>
    expect(mockChangeStatus).toHaveBeenCalledWith(taskId, RetryableTaskStatus.Retrying, { id: `${taskId}-file` });

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockDownloadItem.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await vi.waitFor(() => expect(retryQueue.idle()).toBe(true));
    retryQueue.concurrency = MAX_CONCURRENT_UPLOADS;
  });

  test('when a failed download item is retried, then only that item changes status', async () => {
    const downloadTask = { ...createDownloadTaskWithId('download-1'), params: { taskId: 'download-1', id: 'file-a' } };
    mockDownloadItem.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<RetryManagerDialog files={[downloadTask]} />);

    fireEvent.click(getByTestId('task-logger-button'));

    expect(mockChangeStatus).toHaveBeenCalledWith('download-1', RetryableTaskStatus.Retrying, { id: 'file-a' });
    await vi.waitFor(() =>
      expect(mockChangeStatus).toHaveBeenCalledWith('download-1', RetryableTaskStatus.Failed, { id: 'file-a' }),
    );
  });

  test('when there are failed, retryable files, then the retry all button is rendered', () => {
    const retryableFiles = [createDownloadTaskWithId('a'), createDownloadTaskWithId('b')];

    const { container } = render(<RetryManagerDialog files={retryableFiles} />);

    expect(getRetryAllButton(container)).toBeInTheDocument();
  });

  test('when there are no eligible files, then the retry all button is not rendered', () => {
    const noEligibleFiles = [
      createDownloadTaskWithId('a', { status: RetryableTaskStatus.Retrying }),
      createDownloadTaskWithId('b', { retryable: false }),
    ];

    const { container } = render(<RetryManagerDialog files={noEligibleFiles} />);

    expect(getRetryAllButton(container)).not.toBeInTheDocument();
  });

  test('when retry all is clicked, then every failed and retryable file is retried', async () => {
    const retryableFiles = [createDownloadTaskWithId('a'), createDownloadTaskWithId('b')];

    const { container } = render(<RetryManagerDialog files={retryableFiles} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expectRetrying('a');
    expectRetrying('b');
    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(2));
  });

  test('when retry all is clicked, then files that are not failed or not retryable are skipped', async () => {
    const mixedFiles = [
      createDownloadTaskWithId('a'),
      createDownloadTaskWithId('b', { status: RetryableTaskStatus.Retrying }),
      createDownloadTaskWithId('c', { retryable: false }),
    ];

    const { container } = render(<RetryManagerDialog files={mixedFiles} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    expectRetrying('a');
    expect(mockChangeStatus).not.toHaveBeenCalledWith('b', RetryableTaskStatus.Retrying, { id: 'b-file' });
    expect(mockChangeStatus).not.toHaveBeenCalledWith('c', RetryableTaskStatus.Retrying, { id: 'c-file' });
    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(1));
  });

  test('when retry all is clicked, then every eligible file becomes Retrying immediately, regardless of the concurrency limit', () => {
    const totalFiles = MAX_CONCURRENT_UPLOADS + 2;
    const retryableFiles = Array.from({ length: totalFiles }, (_, index) =>
      createDownloadTaskWithId(`download-${index}`),
    );

    const { container } = render(<RetryManagerDialog files={retryableFiles} />);

    fireEvent.click(getRetryAllButton(container) as HTMLElement);

    retryableFiles.forEach(({ taskId }) => expectRetrying(taskId));
  });

  const clickRetryAllOnce = (downloadTasks: RetryableTask[]): void => {
    const { container } = render(<RetryManagerDialog files={downloadTasks} />);
    fireEvent.click(getRetryAllButton(container) as HTMLElement);
  };

  const expectThrottledRetryAll = async (
    effectiveConcurrency: number,
    startRetries: (downloadTasks: RetryableTask[]) => void = clickRetryAllOnce,
  ): Promise<void> => {
    const totalFiles = effectiveConcurrency + 2;
    const deferredByFile = wireSequentialDeferreds(mockDownloadItem, totalFiles);
    const downloadTasks = Array.from({ length: totalFiles }, (_, index) =>
      createDownloadTaskWithId(`download-${index}`),
    );

    startRetries(downloadTasks);

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(effectiveConcurrency));

    deferredByFile[0].resolve();

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(effectiveConcurrency + 1));

    deferredByFile.slice(1).forEach(({ resolve }) => resolve());

    await vi.waitFor(() => expect(mockDownloadItem).toHaveBeenCalledTimes(totalFiles));
  };

  test('when retry all is clicked with more files than the concurrency limit, then only 6 start retrying immediately and the rest start as earlier ones finish', async () => {
    await expectThrottledRetryAll(MAX_CONCURRENT_UPLOADS);
  });

  test('when retries are started again while the concurrency limit is full, then no more than 6 run at once and the extra ones start as slots free up', async () => {
    await expectThrottledRetryAll(MAX_CONCURRENT_UPLOADS, (downloadTasks) => {
      const [lateRetryAllTask, lateSingleRetryTask] = downloadTasks.slice(MAX_CONCURRENT_UPLOADS);
      const { container, getByTestId, rerender } = render(
        <RetryManagerDialog files={downloadTasks.slice(0, MAX_CONCURRENT_UPLOADS)} />,
      );
      fireEvent.click(getRetryAllButton(container) as HTMLElement);

      rerender(<RetryManagerDialog files={[lateRetryAllTask]} />);
      fireEvent.click(getRetryAllButton(container) as HTMLElement);

      rerender(<RetryManagerDialog files={[lateSingleRetryTask]} />);
      fireEvent.click(getByTestId('task-logger-button'));
    });
  });

  test('when memory usage is high, then retry all ramps concurrency down and runs fewer than 6 at a time', async () => {
    const getConcurrencySpy = vi.spyOn(QueueUtilsService.instance, 'getConcurrencyUsingPerformance').mockReturnValue(1);

    await expectThrottledRetryAll(1);
    getConcurrencySpy.mockRestore();
  });
});
