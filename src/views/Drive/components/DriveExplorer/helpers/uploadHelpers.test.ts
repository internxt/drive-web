import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AnyAction } from '@reduxjs/toolkit';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { UPLOAD_ITEMS_LIMIT, UploadDestination, uploadItemsToFolder } from './uploadHelpers';

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: { uploadItemsThunk: vi.fn((payload) => ({ type: 'uploadItems', payload })) },
}));
vi.mock('app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: vi.fn((folderId) => ({ type: 'fetchSortedFolderContent', payload: folderId })),
}));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn(),
  handleRepeatedUploadingFolders: vi.fn(),
}));
vi.mock('app/drive/services/folder.service/uploadFoldersWithTracking', () => ({
  uploadFoldersWithTracking: vi.fn(() => Promise.resolve()),
}));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: vi.fn() },
  ToastType: { Warning: 'warning', Error: 'error' },
}));

const CURRENT_FOLDER_ID = 'current-folder-uuid';

const aFile = (name: string) => new File(['content'], name);
const aRoot = (name: string) =>
  ({ name, folderId: CURRENT_FOLDER_ID, fullPathEdited: `/${name}`, childrenFiles: [], childrenFolders: [] }) as IRoot;
const anExistingItem = (name: string) => ({ name, uuid: `${name}-uuid` }) as unknown as DriveItemData;

const createDestination = (): UploadDestination => ({
  dispatch: vi.fn(() => Promise.resolve()) as unknown as UploadDestination['dispatch'],
  currentFolderId: CURRENT_FOLDER_ID,
  selectedWorkspace: null,
  maxUploadFileSize: 1024,
});

const dispatchedActions = (destination: UploadDestination) =>
  vi.mocked(destination.dispatch).mock.calls.map(([action]) => action as AnyAction);

const withoutConflicts = <T>(items: T[]) => ({ repeatedItems: [], existingItems: [], unrepeatedItems: items });

describe('Uploading items to the current folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleRepeatedUploadingFiles).mockImplementation(async (files) => withoutConflicts(files));
    vi.mocked(handleRepeatedUploadingFolders).mockImplementation(async (folders) => withoutConflicts(folders));
  });

  test('When the files have no name conflicts, then they are uploaded to the current folder and the folder is refreshed', async () => {
    const destination = createDestination();
    const files = [aFile('report.pdf'), aFile('photo.png')];

    await uploadItemsToFolder(destination, [], files);

    expect(storageThunks.uploadItemsThunk).toHaveBeenCalledWith({ files, parentFolderId: CURRENT_FOLDER_ID });
    await vi.waitFor(() =>
      expect(dispatchedActions(destination)).toContainEqual(fetchSortedFolderContentThunk(CURRENT_FOLDER_ID)),
    );
  });

  test('When some files already exist in the folder, then the user is asked how to resolve them and only the rest are uploaded', async () => {
    const destination = createDestination();
    const conflictingFile = aFile('report.pdf');
    const newFile = aFile('photo.png');
    const existingReport = anExistingItem('report.pdf');
    vi.mocked(handleRepeatedUploadingFiles).mockResolvedValue({
      repeatedItems: [conflictingFile],
      existingItems: [existingReport],
      unrepeatedItems: [newFile],
    });

    await uploadItemsToFolder(destination, [], [conflictingFile, newFile]);

    expect(dispatchedActions(destination)).toContainEqual(
      uiActions.setIsNameCollisionDialogOpen({
        open: true,
        info: {
          groups: [
            {
              destinationUuid: CURRENT_FOLDER_ID,
              duplicatedItems: [conflictingFile],
              existingItems: [existingReport],
              unrepeatedItems: [newFile] as unknown as DriveItemData[],
            },
          ],
          operation: 'upload',
        },
      }),
    );
    expect(storageThunks.uploadItemsThunk).toHaveBeenCalledWith({
      files: [newFile],
      parentFolderId: CURRENT_FOLDER_ID,
    });
  });

  test('When both files and folders have name conflicts, then a single dialog shows a group for each', async () => {
    const destination = createDestination();
    const conflictingFile = aFile('report.pdf');
    const conflictingFolder = aRoot('Photos');
    vi.mocked(handleRepeatedUploadingFiles).mockResolvedValue({
      repeatedItems: [conflictingFile],
      existingItems: [anExistingItem('report.pdf')],
      unrepeatedItems: [],
    });
    vi.mocked(handleRepeatedUploadingFolders).mockResolvedValue({
      repeatedItems: [conflictingFolder],
      existingItems: [anExistingItem('Photos')],
      unrepeatedItems: [],
    });

    await uploadItemsToFolder(destination, [conflictingFolder], [conflictingFile]);

    const collisionDialogs = dispatchedActions(destination).filter(
      (action) => action.type === uiActions.setIsNameCollisionDialogOpen.type,
    );
    expect(collisionDialogs).toHaveLength(1);
    expect(collisionDialogs[0].payload.info.groups.map((group) => group.duplicatedItems)).toStrictEqual([
      [conflictingFile],
      [conflictingFolder],
    ]);
    expect(storageThunks.uploadItemsThunk).not.toHaveBeenCalled();
    expect(uploadFoldersWithTracking).not.toHaveBeenCalled();
  });

  test('When the folders have no name conflicts, then they are uploaded to the current folder and the folder is refreshed', async () => {
    const destination = createDestination();
    const folder = aRoot('Photos');

    await uploadItemsToFolder(destination, [folder], []);

    expect(uploadFoldersWithTracking).toHaveBeenCalledWith({
      payload: [{ root: folder, currentFolderId: CURRENT_FOLDER_ID }],
      selectedWorkspace: null,
      dispatch: destination.dispatch,
      maxUploadFileSize: 1024,
    });
    expect(dispatchedActions(destination)).toContainEqual(fetchSortedFolderContentThunk(CURRENT_FOLDER_ID));
  });

  test('When there are more items than the upload limit, then the user is warned and nothing is uploaded', async () => {
    const destination = createDestination();
    const files = Array.from({ length: UPLOAD_ITEMS_LIMIT + 1 }, (_, index) => aFile(`file-${index}.txt`));

    await uploadItemsToFolder(destination, [], files);

    expect(dispatchedActions(destination)).toContainEqual(uiActions.setIsUploadItemsFailsDialogOpen(true));
    expect(notificationsService.show).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Warning }));
    expect(handleRepeatedUploadingFiles).not.toHaveBeenCalled();
    expect(storageThunks.uploadItemsThunk).not.toHaveBeenCalled();
  });

  test('When the number of items is exactly the upload limit, then they are uploaded', async () => {
    const destination = createDestination();
    const files = Array.from({ length: UPLOAD_ITEMS_LIMIT }, (_, index) => aFile(`file-${index}.txt`));

    await uploadItemsToFolder(destination, [], files);

    expect(storageThunks.uploadItemsThunk).toHaveBeenCalledWith({ files, parentFolderId: CURRENT_FOLDER_ID });
    expect(notificationsService.show).not.toHaveBeenCalled();
  });

  test('When checking for name conflicts fails, then the user is told the upload failed and nothing is uploaded', async () => {
    const destination = createDestination();
    vi.mocked(handleRepeatedUploadingFiles).mockRejectedValue(new Error('Network error'));

    await uploadItemsToFolder(destination, [], [aFile('report.pdf')]);

    expect(notificationsService.show).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Network error', type: ToastType.Error }),
    );
    expect(storageThunks.uploadItemsThunk).not.toHaveBeenCalled();
  });

  test('When uploading the folders fails, then the user is told the upload failed', async () => {
    const destination = createDestination();
    vi.mocked(uploadFoldersWithTracking).mockRejectedValueOnce(new Error('Upload failed'));

    await uploadItemsToFolder(destination, [aRoot('Photos')], []);

    expect(notificationsService.show).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Upload failed', type: ToastType.Error }),
    );
  });
});
