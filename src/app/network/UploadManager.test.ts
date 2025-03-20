import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { uploadFileWithManager } from './UploadManager';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'app/core/services/error.service';
import AppError from 'app/core/types';
import uploadFile from '../drive/services/file.service/uploadFile';
import DatabaseUploadRepository from 'app/repositories/DatabaseUploadRepository';
import { DriveFileData } from 'app/drive/types';
import RetryManager from './RetryManager';

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    uploadItemsThunk: vi.fn(),
    fetchPaginatedFolderContentThunk: vi.fn(),
    deleteItemsThunk: vi.fn(),
    uploadSharedItemsThunk: vi.fn(),
  },
  storageExtraReducers: vi.fn(),
}));

vi.mock('../drive/services/file.service/uploadFile', () => ({
  default: vi.fn(),
}));

const openMaxSpaceOccupiedDialogMock = vi.fn();

const mockFile1 = {
  id: 1,
  uuid: 'file-uuid1',
  name: 'File1',
  bucket: 'bucket',
  folderId: 0,
  userId: 0,
  isFile: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as DriveFileData;
const mockFile2 = {
  id: 2,
  uuid: 'file-uuid2',
  name: 'File2',
  bucket: 'bucket',
  folderId: 1,
  userId: 0,
  isFile: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as DriveFileData;
const taskId = 'task-id';

describe('checkUploadFiles', () => {
  beforeEach(() => {
    RetryManager.clearFiles();
    vi.clearAllMocks();
  });

  it('should upload file using an async queue', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledOnce();
  });

  it('should upload multiple files using an async queue', async () => {
    const uploadFileSpy = (uploadFile as Mock).mockResolvedValueOnce(mockFile1).mockResolvedValueOnce(mockFile2);

    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId1',
          filecontent: {
            content: 'file-content1' as unknown as File,
            type: 'text/plain1',
            name: 'file1.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
        {
          taskId: 'taskId2',
          filecontent: {
            content: 'file-content2' as unknown as File,
            type: 'text/plain2',
            name: 'file2.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(uploadFileSpy).toHaveBeenCalledTimes(2);
  });

  it('should abort the file upload if abortController is called', async () => {
    const abortController = new AbortController();

    uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      abortController,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    abortController.abort();
    expect(abortController.signal.aborted).toBe(true);
  });

  it('should not add files to RetryManager if upload is correct', async () => {
    (uploadFile as Mock).mockResolvedValueOnce(mockFile1);
    vi.spyOn(Promise, 'all').mockResolvedValue([mockFile1]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addFiles');
    const RetryGetFilesSpy = vi.spyOn(RetryManager, 'getFiles');

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(RetryAddFilesSpy).not.toHaveBeenCalled();
    expect(RetryGetFilesSpy).toHaveLength(0);
  });

  it('should add files to RetryManager if any upload fails', async () => {
    //needs to fail twice because MAX_UPLOAD_ATTEMPTS = 2
    (uploadFile as Mock)
      .mockResolvedValueOnce(mockFile1)
      .mockRejectedValueOnce(new AppError('Retryable file'))
      .mockRejectedValueOnce(new AppError('Retryable file'));
    vi.spyOn(Promise, 'all').mockResolvedValueOnce([mockFile1, undefined]);
    const RetryAddFilesSpy = vi.spyOn(RetryManager, 'addFiles');

    vi.spyOn(tasksService, 'create').mockReturnValue('taskId');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'addListener').mockReturnValue();
    vi.spyOn(tasksService, 'removeListener').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    await uploadFileWithManager(
      [
        {
          taskId: 'taskId',
          filecontent: {
            content: 'file-content' as unknown as File,
            type: 'text/plain',
            name: 'file.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
        {
          taskId: 'taskId2',
          filecontent: {
            content: 'file-content2' as unknown as File,
            type: 'text/plain2',
            name: 'file2.txt',
            size: 1024,
            parentFolderId: 'folder-1',
          },
          userEmail: '',
          parentFolderId: '',
        },
      ],
      openMaxSpaceOccupiedDialogMock,
      DatabaseUploadRepository.getInstance(),
      undefined,
      {
        ownerUserAuthenticationData: undefined,
        sharedItemData: {
          isDeepFolder: false,
          currentFolderId: 'parentFolderId',
        },
        isUploadedFromFolder: true,
      },
    );

    expect(RetryAddFilesSpy).toHaveBeenCalled();
    expect(RetryManager.getFiles().length).toBe(1);
  });
});
