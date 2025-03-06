import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { useDispatch } from 'react-redux';
import { useReduxActions } from './useReduxActions';
import { downloadItemsAsZipThunk, downloadItemsThunk } from '../storage.thunks/downloadItemsThunk';
import { uploadFolderThunk } from '../storage.thunks/uploadFolderThunk';
import { uploadItemsThunk, uploadSharedItemsThunk } from '../storage.thunks/uploadItemsThunk';
import { createFilesIterator, createFoldersIterator } from '../../../../drive/services/folder.service';
import { DriveFileData, DriveItemData } from '../../../../drive/types';
import { SharedItemAuthenticationData, UploadFolderData } from '../../../../tasks/types';
import { renderHook } from '@testing-library/react';

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
}));

vi.mock('../storage.thunks/downloadItemsThunk', () => ({
  downloadItemsAsZipThunk: vi.fn(),
  downloadItemsThunk: vi.fn(),
}));

vi.mock('../storage.thunks/uploadFolderThunk', () => ({
  uploadFolderThunk: vi.fn(),
}));

vi.mock('../storage.thunks/uploadItemsThunk', () => ({
  uploadItemsThunk: vi.fn(),
  uploadSharedItemsThunk: vi.fn(),
}));

vi.mock('../../../../drive/services/folder.service', () => ({
  createFilesIterator: vi.fn(),
  createFoldersIterator: vi.fn(),
}));

const mockFile = {
  id: 1,
  uuid: 'file-uuid1',
  name: 'File1',
  bucket: 'bucket',
  folderId: 0,
  userId: 0,
  isFile: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as DriveItemData;

describe('useReduxActions', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    (useDispatch as Mock).mockReturnValue(dispatch);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch downloadItemsAsZipThunk with correct arguments', () => {
    const { result } = renderHook(() => useReduxActions());
    const items: DriveItemData[] = [mockFile];
    const existingTaskId = 'task1';

    result.current.downloadItemsAsZip(items, existingTaskId);

    expect(dispatch).toHaveBeenCalledWith(
      downloadItemsAsZipThunk({
        items,
        existingTaskId,
        fileIterator: createFilesIterator,
        folderIterator: createFoldersIterator,
      }),
    );
  });

  it('should dispatch downloadItemsThunk with correct arguments', () => {
    const { result } = renderHook(() => useReduxActions());
    const item: DriveItemData = mockFile;
    const existingTaskId = 'task1';

    result.current.downloadItems(item, existingTaskId);

    expect(dispatch).toHaveBeenCalledWith(downloadItemsThunk([{ ...item, taskId: existingTaskId }]));
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
