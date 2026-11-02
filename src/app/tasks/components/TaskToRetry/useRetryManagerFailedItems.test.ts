import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from 'app/network/RetryManager';
import { useRetryManagerFailedItems } from './useRetryManagerFailedItems';

vi.mock('app/store/hooks', () => ({ useAppSelector: vi.fn() }));
vi.mock('app/network/DownloadManager', () => ({ DownloadManager: { downloadItem: vi.fn() } }));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn(), getWorkspaceCredentials: vi.fn() },
}));

const mockUploadRetryItem = vi.hoisted(() => vi.fn());
vi.mock('app/store/slices/storage/hooks/useReduxActions', () => ({
  useReduxActions: () => ({ uploadRetryItem: mockUploadRetryItem }),
}));

const aFailedUpload = (name: string, type: string): RetryableTask => ({
  taskId: 'task-1',
  type: RetryableTaskType.Upload,
  params: {
    filecontent: { content: new File(['content'], name), type, name, size: 1024, parentFolderId: 'folder-1' },
    parentFolderId: 'folder-1',
    taskId: 'task-1',
    userEmail: 'user@example.com',
  },
  status: RetryableTaskStatus.Failed,
});

const retryFirstFailedItem = (task: RetryableTask) => {
  const { result } = renderHook(() => useRetryManagerFailedItems([task]));
  result.current[0].retry();
};

describe('Failed items kept by the retry manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(RetryManager, 'changeStatus');
    mockUploadRetryItem.mockReturnValue({ unwrap: async () => undefined });
  });

  test('When a failed upload is retried, then it is uploaded again into its folder and shown as retrying', async () => {
    retryFirstFailedItem(aFailedUpload('file', 'txt'));

    expect(RetryManager.changeStatus).toHaveBeenCalledWith('task-1', RetryableTaskStatus.Retrying);
    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalled());
    expect(mockUploadRetryItem).toHaveBeenCalledWith({
      uploadFile: expect.any(File),
      parentFolderId: 'folder-1',
      taskId: 'task-1',
      fileType: 'txt',
    });
  });

  test.each([
    { name: 'Screenshot 2026-10-12 at 11.48.02 PM', type: 'png', expected: 'Screenshot 2026-10-12 at 11.48.02 PM.png' },
    { name: 'Makefile', type: '', expected: 'Makefile' },
  ])('When a file named "$name" is retried, then it is uploaded with its full original name', async (scenario) => {
    retryFirstFailedItem(aFailedUpload(scenario.name, scenario.type));

    await vi.waitFor(() => expect(mockUploadRetryItem).toHaveBeenCalled());
    expect(mockUploadRetryItem.mock.calls[0][0].uploadFile.name).toBe(scenario.expected);
  });

  test('When retrying an upload fails, then it is shown as failed again', async () => {
    mockUploadRetryItem.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('Upload failed')) });

    retryFirstFailedItem(aFailedUpload('file', 'txt'));

    await vi.waitFor(() =>
      expect(RetryManager.changeStatus).toHaveBeenLastCalledWith('task-1', RetryableTaskStatus.Failed),
    );
  });

  test('When a download failed, then it is shown with its decrypted name', () => {
    const failedDownload: RetryableTask = {
      taskId: 'task-2',
      type: RetryableTaskType.Download,
      params: {
        plainName: 'Report',
        name: 'encrypted',
        type: 'pdf',
        size: 10,
        updatedAt: '2025-01-09',
        isFolder: false,
      },
      status: RetryableTaskStatus.Failed,
    };

    const { result } = renderHook(() => useRetryManagerFailedItems([failedDownload]));

    expect(result.current[0]).toEqual(expect.objectContaining({ name: 'Report', type: 'pdf', isRetrying: false }));
  });
});
