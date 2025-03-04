import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { uploadItemsParallelThunk, uploadItemsThunk, uploadItemsThunkExtraReducers } from './uploadItemsThunk';
import { RootState } from '../../..';
import { useDispatch } from 'react-redux';
import { prepareFilesToUpload } from '../fileUtils/prepareFilesToUpload';
import { uploadFileWithManager, UploadManagerFileParams } from '../../../../network/UploadManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import RetryManager from 'app/network/RetryManager';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from '../storage.model';

vi.mock('i18next', () => ({
  t: vi.fn((key, params) => `${key} ${params?.reason || ''}`),
}));

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

vi.mock('app/drive/services/download.service/downloadFolder', () => ({
  default: {
    fetchFileBlob: vi.fn(),
    downloadFileFromBlob: vi.fn(),
    downloadFile: vi.fn(),
    downloadFolder: vi.fn(),
    downloadBackup: vi.fn(),
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

describe('uploadItemsThunkExtraReducers', () => {
  const sampleFile: UploadManagerFileParams = { taskId: 'task1' } as UploadManagerFileParams;

  beforeEach(() => {
    RetryManager.clearFiles();

    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should handle rejected case and call RetryManager and notificationsService', () => {
    const cases = new Map();
    const builder = {
      addCase: (action, reducer) => {
        cases.set(action, reducer);
        return builder;
      },
    };

    uploadItemsThunkExtraReducers(builder as unknown as ActionReducerMapBuilder<StorageState>);

    expect(cases.has(uploadItemsParallelThunk.pending)).toBe(true);
    expect(cases.has(uploadItemsParallelThunk.fulfilled)).toBe(true);
    expect(cases.has(uploadItemsParallelThunk.rejected)).toBe(true);

    const rejectedHandler = cases.get(uploadItemsParallelThunk.rejected);
    const RetryIsRetryingFileSpy = vi.spyOn(RetryManager, 'isRetryingFile');
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    RetryManager.addFile(sampleFile);

    const state = {};
    const action = {
      meta: {
        arg: {
          taskId: 'task1',
          options: { showErrors: true },
        },
      },
      error: { message: 'Upload failed' },
    };

    rejectedHandler(state, action);

    expect(RetryIsRetryingFileSpy).toHaveBeenCalledWith('task1');
    expect(RetryChangeStatusSpy).toHaveBeenCalledWith('task1', 'failed');
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: expect.stringContaining('Upload failed'),
      type: ToastType.Error,
    });
  });

  it('should handle rejected case and not call RetryManager if file is not retrying', () => {
    const cases = new Map();
    const builder = {
      addCase: (action, reducer) => {
        cases.set(action, reducer);
        return builder;
      },
    };

    uploadItemsThunkExtraReducers(builder as unknown as ActionReducerMapBuilder<StorageState>);

    expect(cases.has(uploadItemsParallelThunk.pending)).toBe(true);
    expect(cases.has(uploadItemsParallelThunk.fulfilled)).toBe(true);
    expect(cases.has(uploadItemsParallelThunk.rejected)).toBe(true);

    const rejectedHandler = cases.get(uploadItemsParallelThunk.rejected);
    const RetryIsRetryingFileSpy = vi.spyOn(RetryManager, 'isRetryingFile');
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    const state = {};
    const action = {
      meta: {
        arg: {
          taskId: 'task1',
          options: { showErrors: true },
        },
      },
      error: { message: 'Test Error' },
    };

    rejectedHandler(state, action);

    expect(RetryIsRetryingFileSpy).toHaveBeenCalledWith('task1');
    expect(RetryChangeStatusSpy).not.toBeCalled();
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: expect.stringContaining('Test Error'),
      type: ToastType.Error,
    });
  });
});
