import { describe, it, expect, vi, beforeEach, Mock, test } from 'vitest';
import {
  uploadItemsParallelThunk,
  uploadItemsThunk,
  uploadItemsThunkExtraReducers,
  uploadSharedItemsThunk,
} from './uploadItemsThunk';
import { RootState } from '../../..';
import { prepareFilesToUpload } from '../fileUtils/prepareFilesToUpload';
import { uploadFileWithManager } from '../../../../network/UploadManager';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import RetryManager from 'app/network/RetryManager';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from '../storage.model';
import errorService from 'services/error.service';
import { AppError } from '@internxt/sdk';
import shareService from '../../../../share/services/share.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';

vi.mock('../../../../share/services/share.service', () => ({
  default: {
    getSharedFolderContent: vi.fn(),
  },
}));

vi.mock('services/workspace.service', () => ({
  default: {
    getWorkspaceCredentials: vi.fn(),
  },
}));

vi.mock('../../plan', () => ({
  planThunks: {
    fetchUsageThunk: vi.fn(),
  },
}));
vi.mock('..', () => ({
  default: {
    pushItems: vi.fn(),
  },
  storageActions: vi.fn(),
  storageSelectors: vi.fn(),
}));
vi.mock('i18next', () => ({
  t: vi.fn((key, params) => `${key} ${params?.reason ?? ''}`),
}));

vi.mock('../../../../repositories/DatabaseUploadRepository', () => ({
  default: {
    getInstance: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

vi.mock('../fileUtils/prepareFilesToUpload', () => ({
  prepareFilesToUpload: vi.fn(),
}));

vi.mock('../../../../network/UploadManager', () => ({
  uploadFileWithManager: vi.fn(),
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
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should upload files successfully', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(prepareFilesToUpload).toHaveBeenCalled();
    expect(uploadFileWithManager).toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');
    (uploadFileWithManager as Mock).mockRejectedValue(new Error('Upload failed'));

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(notificationsServiceSpy).toHaveBeenCalledWith({
      text: 'Upload failed',
      type: ToastType.Error,
    });
  });

  it('should handle retry upload', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
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

  test('when there is an error while uploading items, then a notification is shown', async () => {
    const randomError = new AppError('Test Error', undefined, undefined, {
      'x-request-id': 'test-request-id',
    });
    const castErrorSpy = vi.spyOn(errorService, 'castError');
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    (uploadFileWithManager as Mock).mockRejectedValue(randomError);

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(castErrorSpy).toHaveBeenCalledWith(randomError);
    expect(showNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id',
      }),
    );
  });
});

describe('upload shared items thunk', () => {
  const dispatch = vi.fn();
  const getState = () => {
    return { user: { user: { email: 'test@test.com' } } };
  };
  const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('when there is an error while uploading shared items, then a notification is shown', async () => {
    const randomError = new AppError('Test Error', undefined, undefined, {
      'x-request-id': 'test-request-id',
    });
    const castErrorSpy = vi.spyOn(errorService, 'castError');
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');
    (workspacesSelectors.getSelectedWorkspace as Mock).mockReturnValue(null);
    (shareService.getSharedFolderContent as Mock).mockResolvedValue({ items: [] });
    (uploadFileWithManager as Mock).mockRejectedValue(randomError);

    await uploadSharedItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
      currentFolderId: 'folder1',
      isDeepFolder: false,
    })(dispatch, getState as () => RootState, {});

    expect(castErrorSpy).toHaveBeenCalledWith(randomError);
    expect(showNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id',
      }),
    );
  });
});

describe('Upload items in parallel thunk', () => {
  const dispatch = vi.fn();
  const getState = () => {
    return { user: { user: { email: 'test@test.com' } } };
  };
  const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('when there is an error while uploading items in parallel, then a notification is shown', async () => {
    const randomError = new AppError('Test Error', undefined, undefined, {
      'x-request-id': 'test-request-id',
    });
    const castErrorSpy = vi.spyOn(errorService, 'castError');
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    (uploadFileWithManager as Mock).mockRejectedValue(randomError);

    await uploadItemsParallelThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    expect(castErrorSpy).toHaveBeenCalledWith(randomError);
    expect(showNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id',
      }),
    );
  });
});

describe('uploadItemsThunkExtraReducers', () => {
  const sampleFile = { taskId: 'task1' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should handle rejected case and call RetryManager and notificationsService', () => {
    const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');
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
    const RetryIsRetryingFileSpy = vi.spyOn(RetryManager, 'isRetryingTask');
    const RetryChangeStatusSpy = vi.spyOn(RetryManager, 'changeStatus');

    RetryManager.addTask({
      type: 'upload',
      taskId: sampleFile.taskId ?? 'task1',
      params: sampleFile,
    });

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
    expect(notificationsServiceSpy).toHaveBeenCalledWith({
      text: expect.stringContaining('Upload failed'),
      type: ToastType.Error,
    });
  });

  it('should handle rejected case and not call RetryManager if file is not retrying', () => {
    const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');
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
    const RetryIsRetryingFileSpy = vi.spyOn(RetryManager, 'isRetryingTask');
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
    expect(RetryChangeStatusSpy).toHaveBeenCalledWith('task1', 'failed');
    expect(notificationsServiceSpy).toHaveBeenCalledWith({
      text: expect.stringContaining('Test Error'),
      type: ToastType.Error,
    });
  });
});
