import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { uploadItemsThunk } from './uploadItemsThunk';
import { RootState } from '../../..';
import { useDispatch } from 'react-redux';
import { prepareFilesToUpload } from '../fileUtils/prepareFilesToUpload';
import { uploadFileWithManager } from '../../../../network/UploadManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import RetryManager from 'app/network/RetryManager';

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    uploadItemsThunk: vi.fn(),
    fetchPaginatedFolderContentThunk: vi.fn(),
    deleteItemsThunk: vi.fn(),
    uploadSharedItemsThunk: vi.fn(),
  },
  storageExtraReducers: vi.fn(),
}));

vi.mock('../fileUtils/prepareFilesToUpload', () => ({
  prepareFilesToUpload: vi.fn(),
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Warning: 'warning',
    Error: 'error',
  },
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: vi.fn(() => vi.fn()),
}));

vi.mock('../../../../network/UploadManager', () => ({
  uploadFileWithManager: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/createFolder', () => ({
  createFolder: vi.fn(),
}));

vi.mock('../../workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

describe('uploadItemsThunk', () => {
  const dispatch = vi.fn();
  const getState = () => {
    return { user: { user: { email: 'test@test.com' } } };
  };
  const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });

  beforeEach(() => {
    (useDispatch as Mock).mockReturnValue(dispatch);

    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should upload files successfully', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
      zeroLengthFilesNumber: 0,
    });

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(prepareFilesToUpload).toHaveBeenCalled();
    expect(uploadFileWithManager).toHaveBeenCalled();
  });

  it('should show notification for empty files', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [],
      zeroLengthFilesNumber: 1,
    });

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'Empty files are not supported.\n1 empty file not uploaded.',
      type: ToastType.Warning,
    });
  });

  it('should handle upload errors', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
      zeroLengthFilesNumber: 0,
    });
    (uploadFileWithManager as Mock).mockRejectedValue(new Error('Upload failed'));

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'Upload failed',
      type: ToastType.Error,
    });
  });

  it('should handle retry upload', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
      zeroLengthFilesNumber: 0,
    });
    (uploadFileWithManager as Mock).mockRejectedValueOnce(new Error('Upload failed'));
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
      taskId: 'task1',
      isRetry: true,
    })(dispatch, getState as () => RootState, {});

    expect(RetryChangeStatusSpy).toHaveBeenCalledWith('task1', 'failed');
  });
});
