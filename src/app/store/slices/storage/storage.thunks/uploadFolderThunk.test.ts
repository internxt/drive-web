import { describe, expect, vi, beforeEach, Mock, test } from 'vitest';
import { uploadFolderThunk } from './uploadFolderThunk';
import { RootState } from '../../..';
import { checkFolderDuplicated } from '../folderUtils/checkFolderDuplicated';
import { uploadItemsParallelThunk } from './uploadItemsThunk';
import tasksService from '../../../../tasks/services/tasks.service';
import { TaskStatus } from '../../../../tasks/types';
import { DriveFolderData } from 'app/drive/types';

vi.mock('../folderUtils/checkFolderDuplicated', () => ({
  checkFolderDuplicated: vi.fn(),
}));

vi.mock('../folderUtils/getUniqueFolderName', () => ({
  getUniqueFolderName: vi.fn(),
}));

vi.mock('.', () => ({
  default: {
    createFolderThunk: vi.fn(),
  },
}));

vi.mock('./uploadItemsThunk', () => ({
  uploadItemsParallelThunk: vi.fn(),
}));

vi.mock('./deleteItemsThunk', () => ({
  deleteItemsThunk: vi.fn(),
}));

vi.mock('app/drive/services/new-storage.service', () => ({
  default: {
    deleteFolderByUuid: vi.fn(),
  },
}));

vi.mock('../../workspaces/workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('../../plan', () => ({
  planThunks: {
    fetchUsageThunk: vi.fn(),
    fetchBusinessLimitUsageThunk: vi.fn(),
  },
}));

vi.mock('services/referral.service', () => ({
  default: {
    trackFolderUpload: vi.fn(),
  },
}));

vi.mock('app/network/networkInformation', () => ({
  logNetworkInfoForUpload: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key) => key),
}));

vi.mock('../../ui', () => ({
  uiActions: {
    setOpenFileSizeLimitReachedDialog: vi.fn().mockReturnValue({ type: 'ui/setOpenFileSizeLimitReachedDialog' }),
  },
}));

vi.mock('utils/timeUtils', () => ({
  wait: vi.fn().mockResolvedValue(undefined),
}));

const mockFolder: DriveFolderData = {
  id: 1,
  uuid: 'folder-uuid',
  name: 'TestFolder',
  bucket: 'bucket',
  parentId: 0,
  parent_id: 0,
  parentUuid: 'parent-uuid',
  userId: 0,
  user_id: 0,
  icon: null,
  iconId: null,
  icon_id: null,
  isFolder: true,
  color: null,
  encrypt_version: null,
  plain_name: 'TestFolder',
  deleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const buildGetState = (maxUploadFileSize?: number) => () =>
  ({
    user: { user: { email: 'test@test.com' } },
    fileVersions: { limits: maxUploadFileSize !== undefined ? { maxUploadFileSize } : null },
  }) as unknown as RootState;

describe('Upload Folder Thunk', () => {
  const taskId = 'task-1';

  beforeEach(() => {
    vi.clearAllMocks();

    (checkFolderDuplicated as Mock).mockResolvedValue({
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: [mockFolder],
    });
    vi.spyOn(tasksService, 'create').mockReturnValue(taskId);
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(tasksService, 'getTasks').mockReturnValue([]);
    vi.spyOn(tasksService, 'findTask').mockReturnValue(undefined);
  });

  test('When all files in a folder exceed the size limit and there are no subfolders, then the task is marked as error', async () => {
    const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
    const dispatch = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(mockFolder) });
    dispatch.mockImplementation((action) => {
      if (typeof action === 'function') return action(dispatch, buildGetState(100), {});
      return { unwrap: () => Promise.resolve(mockFolder) };
    });
    const updateTaskSpy = vi.spyOn(tasksService, 'updateTask');

    await uploadFolderThunk({
      root: {
        folderId: 'parent-uuid',
        childrenFiles: [bigFile],
        childrenFolders: [],
        name: 'TestFolder',
        fullPathEdited: 'path',
      },
      currentFolderId: 'parent-uuid',
      options: { taskId },
    })(dispatch, buildGetState(100), {});

    expect(updateTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        merge: expect.objectContaining({ status: TaskStatus.Error }),
      }),
    );
    expect(uploadItemsParallelThunk).not.toHaveBeenCalled();
  });

  test('When some files exceed the size limit and there are no subfolders, then only the allowed files are uploaded', async () => {
    const smallFile = new File(['x'], 'small.txt');
    const bigFile = new File([new ArrayBuffer(200)], 'big.mp4');
    const uploadThunkAction = { unwrap: () => Promise.resolve() };
    (uploadItemsParallelThunk as unknown as Mock).mockReturnValue(() => uploadThunkAction);
    const dispatch = vi.fn().mockImplementation((action) => {
      if (typeof action === 'function') return action(dispatch, buildGetState(100), {});
      return { unwrap: () => Promise.resolve(mockFolder) };
    });

    await uploadFolderThunk({
      root: {
        folderId: 'parent-uuid',
        childrenFiles: [smallFile, bigFile],
        childrenFolders: [],
        name: 'TestFolder',
        fullPathEdited: 'path',
      },
      currentFolderId: 'parent-uuid',
      options: { taskId },
    })(dispatch, buildGetState(100), {});

    expect(uploadItemsParallelThunk).toHaveBeenCalledWith(expect.objectContaining({ files: [smallFile, bigFile] }));
  });

  test('When no size limit is configured, then all files are uploaded regardless of size', async () => {
    const bigFile = new File([new ArrayBuffer(999_999)], 'huge.mp4');
    const uploadThunkAction = { unwrap: () => Promise.resolve() };
    (uploadItemsParallelThunk as unknown as Mock).mockReturnValue(() => uploadThunkAction);
    const dispatch = vi.fn().mockImplementation((action) => {
      if (typeof action === 'function') return action(dispatch, buildGetState(undefined), {});
      return { unwrap: () => Promise.resolve(mockFolder) };
    });

    await uploadFolderThunk({
      root: {
        folderId: 'parent-uuid',
        childrenFiles: [bigFile],
        childrenFolders: [],
        name: 'TestFolder',
        fullPathEdited: 'path',
      },
      currentFolderId: 'parent-uuid',
      options: { taskId },
    })(dispatch, buildGetState(undefined), {});

    expect(uploadItemsParallelThunk).toHaveBeenCalled();
  });
});
