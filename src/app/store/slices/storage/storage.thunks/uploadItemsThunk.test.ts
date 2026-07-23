import { describe, it, expect, vi, beforeEach, Mock, test } from 'vitest';
import {
  uploadItemsParallelThunk,
  uploadItemsThunk,
  uploadItemsThunkExtraReducers,
  uploadSharedItemsThunk,
} from './uploadItemsThunk';
import { RootState } from '../../..';
import { prepareFilesToUpload } from '../fileUtils/prepareFilesToUpload';
import { uploadFilesWithTasks } from 'app/tasks/upload/uploadFilesWithTasks';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import RetryManager from 'app/network/RetryManager';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from '../storage.model';
import errorService from 'services/error.service';
import { AppError } from '@internxt/sdk';
import shareService from '../../../../share/services/share.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';
import { planSelectors } from '../../plan';

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
  planSelectors: {
    planLimitToShow: vi.fn(),
    planUsageToShow: vi.fn(),
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

vi.mock('app/tasks/upload/uploadFilesWithTasks', () => ({
  uploadFilesWithTasks: vi.fn(),
}));

vi.mock('../../workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

vi.mock('../../fileVersions', () => ({
  fileVersionsSelectors: {
    getMaxFileSizeLimit: vi.fn((state) => state.fileVersions.limits?.maxUploadFileSize ?? MAX_ALLOWED_UPLOAD_SIZE),
  },
}));

const getState = () => {
  return {
    user: { user: { email: 'test@test.com' } },
    fileVersions: { limits: { maxUploadFileSize: MAX_ALLOWED_UPLOAD_SIZE } },
  };
};

describe('uploadItemsThunk', () => {
  const dispatch = vi.fn();

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
    expect(uploadFilesWithTasks).toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');
    (uploadFilesWithTasks as Mock).mockRejectedValue(new Error('Upload failed'));

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
    (uploadFilesWithTasks as Mock).mockRejectedValueOnce(new Error('Upload failed'));
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
    (uploadFilesWithTasks as Mock).mockRejectedValue(randomError);

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

  test('when the upload manager reports a 420 but the account still has storage available, then the storage full dialog is not opened', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    (uploadFilesWithTasks as Mock).mockResolvedValue(undefined);
    (planSelectors.planLimitToShow as Mock).mockReturnValue(20);
    (planSelectors.planUsageToShow as Mock).mockReturnValue(12.1);

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    const { maxSpaceOccupiedCallback } = (uploadFilesWithTasks as Mock).mock.calls[0][0];
    maxSpaceOccupiedCallback();

    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ui/setOpenReachedPlanLimitDialog' }));
  });

  test('when the upload manager reports a 420 and the account has actually run out of storage, then the storage full dialog is shown', async () => {
    (prepareFilesToUpload as Mock).mockResolvedValue({
      filesToUpload: [mockFile],
    });
    (uploadFilesWithTasks as Mock).mockResolvedValue(undefined);
    (planSelectors.planLimitToShow as Mock).mockReturnValue(20);
    (planSelectors.planUsageToShow as Mock).mockReturnValue(12.1);

    await uploadItemsThunk({
      files: [mockFile],
      parentFolderId: 'parent1',
    })(dispatch, getState as () => RootState, {});

    (planSelectors.planUsageToShow as Mock).mockReturnValue(20);
    const { maxSpaceOccupiedCallback } = (uploadFilesWithTasks as Mock).mock.calls[0][0];
    maxSpaceOccupiedCallback();

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ui/setOpenReachedPlanLimitDialog' }));
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
    (uploadFilesWithTasks as Mock).mockRejectedValue(randomError);

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
    (uploadFilesWithTasks as Mock).mockRejectedValue(randomError);

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

  test('When all files exceed the size limit, then the thunk throws without attempting the upload', async () => {
    const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
    const getStateWithLimit = () => ({
      user: { user: { email: 'test@test.com' } },
      fileVersions: { limits: { maxUploadFileSize: 100 } },
    });

    await uploadItemsParallelThunk({
      files: [bigFile],
      parentFolderId: 'parent1',
    })(dispatch, getStateWithLimit as () => RootState, {});

    expect(prepareFilesToUpload).not.toHaveBeenCalled();
    expect(uploadFilesWithTasks).not.toHaveBeenCalled();
  });

  test('When some files exceed the size limit and some do not, then only the allowed files are uploaded', async () => {
    const smallFile = new File(['x'], 'small.txt');
    const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
    const getStateWithLimit = () => ({
      user: { user: { email: 'test@test.com' } },
      fileVersions: { limits: { maxUploadFileSize: 100 } },
    });
    (prepareFilesToUpload as Mock).mockResolvedValue({ filesToUpload: [smallFile] });

    await uploadItemsParallelThunk({
      files: [smallFile, bigFile],
      parentFolderId: 'parent1',
    })(dispatch, getStateWithLimit as () => RootState, {});

    expect(prepareFilesToUpload).toHaveBeenCalledWith(expect.objectContaining({ files: [smallFile] }));
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
