import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { useDispatch } from 'react-redux';
import { useReduxActions } from './useReduxActions';
import { uploadFolderThunk } from '../storage.thunks/uploadFolderThunk';
import { uploadItemsThunk, uploadSharedItemsThunk } from '../storage.thunks/uploadItemsThunk';
import { UploadFolderData } from '../../../../tasks/types';
import { renderHook } from '@testing-library/react';

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
}));

vi.mock('../storage.thunks/uploadFolderThunk', () => ({
  uploadFolderThunk: vi.fn(),
}));

vi.mock('../storage.thunks/uploadItemsThunk', () => ({
  uploadItemsThunk: vi.fn(),
  uploadSharedItemsThunk: vi.fn(),
}));

vi.mock('app/drive/services/folder.service', () => ({
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

describe('useReduxActions', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    (useDispatch as Mock).mockReturnValue(dispatch);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should dispatch uploadFolderThunk with correct arguments', () => {
    const { result } = renderHook(() => useReduxActions());
    const data: UploadFolderData & { taskId: string } = {
      folder: {
        name: 'folder1',
        folderId: null,
        childrenFiles: [],
        childrenFolders: [],
        fullPathEdited: '',
      },
      parentFolderId: 'parent1',
      taskId: 'task1',
    };

    result.current.uploadFolder(data);

    expect(dispatch).toHaveBeenCalledWith(
      uploadFolderThunk({
        root: data.folder,
        currentFolderId: data.parentFolderId,
        options: { taskId: data.taskId },
      }),
    );
  });

  it('should dispatch uploadItemsThunk with correct arguments for uploadItem', () => {
    const { result } = renderHook(() => useReduxActions());
    const data = {
      uploadFile: new File(['content'], 'file.txt'),
      parentFolderId: 'parent1',
      taskId: 'task1',
      fileType: 'text/plain',
    };

    result.current.uploadItem(data);

    expect(dispatch).toHaveBeenCalledWith(
      uploadItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
      }),
    );
  });

  it('should dispatch uploadSharedItemsThunk with correct arguments', () => {
    const { result } = renderHook(() => useReduxActions());
    const data = {
      uploadFile: new File(['content'], 'file.txt'),
      parentFolderId: 'parent1',
      taskId: 'task1',
      fileType: 'text/plain',
      sharedItemAuthenticationData: {
        currentFolderId: 'current1',
        ownerUserAuthenticationData: {
          token: 'token',
          bridgeUser: 'bridgeUser',
          bridgePass: 'bridgePass',
          encryptionKey: 'encryptionKey',
          bucketId: 'bucketId',
        },
        isDeepFolder: true,
      },
    };

    result.current.uploadSharedItem(data);

    expect(dispatch).toHaveBeenCalledWith(
      uploadSharedItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        currentFolderId: data.sharedItemAuthenticationData.currentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
        ownerUserAuthenticationData: data.sharedItemAuthenticationData.ownerUserAuthenticationData,
        isDeepFolder: data.sharedItemAuthenticationData.isDeepFolder,
      }),
    );
  });

  it('should dispatch uploadItemsThunk with correct arguments for uploadRetryItem', () => {
    const { result } = renderHook(() => useReduxActions());
    const data = {
      uploadFile: new File(['content'], 'file.txt'),
      parentFolderId: 'parent1',
      taskId: 'task1',
      fileType: 'text/plain',
    };

    result.current.uploadRetryItem(data);

    expect(dispatch).toHaveBeenCalledWith(
      uploadItemsThunk({
        files: [data.uploadFile],
        parentFolderId: data.parentFolderId,
        taskId: data.taskId,
        fileType: data.fileType,
        isRetry: true,
      }),
    );
  });
});
