import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';
import { DownloadManager } from 'app/network/DownloadManager';
import { useRetryManagerFailedItems } from './useRetryManagerFailedItems';

vi.mock('app/store/hooks', () => ({ useAppSelector: vi.fn() }));
vi.mock('app/network/DownloadManager', () => ({ DownloadManager: { downloadItem: vi.fn() } }));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn(), getWorkspaceCredentials: vi.fn() },
}));

const aFailedDownload = (): RetryableTask => ({
  taskId: 'task-2',
  type: RetryableTaskType.Download,
  params: {
    id: 'file-id',
    plainName: 'Report',
    name: 'encrypted',
    type: 'pdf',
    size: 10,
    updatedAt: '2025-01-09',
    isFolder: false,
  },
  status: RetryableTaskStatus.Failed,
});

describe('Failed downloads kept by the retry manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(RetryManager, 'changeStatus');
    vi.mocked(DownloadManager.downloadItem).mockResolvedValue(undefined as never);
  });

  test('When a download failed, then it is shown with its decrypted name', () => {
    const { result } = renderHook(() => useRetryManagerFailedItems([aFailedDownload()]));

    expect(result.current[0]).toEqual(expect.objectContaining({ name: 'Report', type: 'pdf', isRetrying: false }));
  });

  test('When a failed download is retried, then only that item is shown as retrying and it is downloaded again', async () => {
    const failedDownload = aFailedDownload();
    const { result } = renderHook(() => useRetryManagerFailedItems([failedDownload]));

    result.current[0].retry();

    expect(RetryManager.changeStatus).toHaveBeenCalledWith('task-2', RetryableTaskStatus.Retrying, { id: 'file-id' });
    await vi.waitFor(() =>
      expect(DownloadManager.downloadItem).toHaveBeenCalledWith(
        expect.objectContaining({ payload: [failedDownload.params], taskId: 'task-2' }),
      ),
    );
  });
});
