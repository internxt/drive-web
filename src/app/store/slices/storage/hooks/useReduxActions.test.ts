import { describe, it, test, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { useDispatch, useSelector } from 'react-redux';
import { useReduxActions } from './useReduxActions';
import { uploadFolderThunk } from '../storage.thunks/uploadFolderThunk';
import { uploadItemsThunk, uploadSharedItemsThunk } from '../storage.thunks/uploadItemsThunk';
import { UploadFolderData } from '../../../../tasks/types';
import { renderHook } from '@testing-library/react';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import errorService from 'services/error.service';
import { findOrCreateFolderPath } from 'app/store/slices/storage/folderUtils/findOrCreateFolderPath';

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}));

vi.mock('app/drive/services/folder.service/uploadFoldersWithTracking', () => ({
  uploadFoldersWithTracking: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: { reportError: vi.fn() },
}));

vi.mock('../storage.thunks/uploadFolderThunk', () => ({
  uploadFolderThunk: vi.fn(),
}));

vi.mock('../storage.thunks/uploadItemsThunk', () => ({
  uploadItemsThunk: vi.fn(),
  uploadSharedItemsThunk: vi.fn(),
}));

vi.mock('app/store/slices/storage/folderUtils/findOrCreateFolderPath', () => ({ findOrCreateFolderPath: vi.fn() }));

vi.mock('app/drive/services/folder.service', () => ({
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

describe('useReduxActions', () => {
  const dispatch = vi.fn();
  const selectedWorkspace = { workspaceUser: { memberId: 'member1' } };
  const maxUploadFileSize = 1024;
  const currentFolderId = 'current-folder';
  const state = {
    workspaces: { selectedWorkspace },
    fileVersions: { limits: { maxUploadFileSize } },
    storage: { namePath: [{ uuid: currentFolderId }] },
  };

  const folderData: UploadFolderData & { taskId: string } = {
    folder: {
      name: 'folder1',
      folderId: null,
      childrenFiles: [],
      childrenFolders: [],
      isFolder: true,
    },
    parentFolderId: 'parent1',
    taskId: 'task1',
  };

  beforeEach(() => {
    (uploadFoldersWithTracking as Mock).mockResolvedValue(undefined);
    (useDispatch as Mock).mockReturnValue(dispatch);
    (useSelector as Mock).mockImplementation((selector: (s: typeof state) => unknown) => selector(state));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('when a failed folder upload is retried, then it resumes the same task through the folder upload pipeline', () => {
    const { result } = renderHook(() => useReduxActions());
    const data = folderData;

    result.current.uploadFolder(data);

    expect(uploadFoldersWithTracking).toHaveBeenCalledWith({
      payload: [{ root: data.folder, currentFolderId: data.parentFolderId, options: { taskId: data.taskId } }],
      selectedWorkspace,
      dispatch,
      maxUploadFileSize,
    });
    expect(uploadFolderThunk).not.toHaveBeenCalled();
  });

  test('when the folder retry upload fails, then the error is reported', async () => {
    const error = new Error('upload failed');
    (uploadFoldersWithTracking as Mock).mockRejectedValue(error);
    const { result } = renderHook(() => useReduxActions());

    result.current.uploadFolder(folderData);

    await vi.waitFor(() => expect(errorService.reportError).toHaveBeenCalledWith(error));
  });

  test('when a retried file has no missing folders, then it goes into its stored folder without creating any', async () => {
    const { result } = renderHook(() => useReduxActions());

    const parentFolder = result.current.findOrCreateRetryParentFolder({ parentFolderId: 'parent1' });

    await expect(parentFolder).resolves.toEqual({ folderId: 'parent1', isNewFolder: false });
    expect(findOrCreateFolderPath).not.toHaveBeenCalled();
  });

  test('when a retried file has missing folders, then they are recreated under its nearest folder in the selected workspace', async () => {
    const recreatedFolder = { folderId: 'recreated-uuid', isNewFolder: true };
    (findOrCreateFolderPath as Mock).mockResolvedValue(recreatedFolder);
    const { result } = renderHook(() => useReduxActions());

    const parentFolder = result.current.findOrCreateRetryParentFolder({
      parentFolderId: 'parent1',
      missingFolderPath: ['Broken', 'Deep'],
      relatedTaskId: 'folder-task',
    });

    await expect(parentFolder).resolves.toBe(recreatedFolder);
    expect(findOrCreateFolderPath).toHaveBeenCalledWith({
      parentFolderId: 'parent1',
      folderPath: ['Broken', 'Deep'],
      relatedTaskId: 'folder-task',
      currentFolderId,
      selectedWorkspace,
      dispatch,
    });
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

  test('when a retried file goes into a folder the retry just created, then it is uploaded without checking that folder for duplicates', () => {
    const { result } = renderHook(() => useReduxActions());

    result.current.uploadRetryItem({
      uploadFile: new File(['content'], 'file.txt'),
      parentFolderId: 'recreated-uuid',
      taskId: 'task1',
      fileType: 'text/plain',
      disableExistenceCheck: true,
    });

    expect(uploadItemsThunk).toHaveBeenCalledWith(
      expect.objectContaining({ parentFolderId: 'recreated-uuid', options: { disableExistenceCheck: true } }),
    );
  });
});
