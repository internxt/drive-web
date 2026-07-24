/**
 * @jest-environment jsdom
 */

import { ListSharedItemsResponse } from '@internxt/sdk/dist/drive/share/types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import usePublicSharedFolderContent from './usePublicSharedFolderContent';

vi.mock('app/share/services/share.service', () => ({
  default: {
    getPublicSharedFolderContent: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
    castError: vi.fn().mockImplementation((e) => ({ message: e.message ?? 'Default error message' })),
  },
}));

import shareService from 'app/share/services/share.service';

const mockedGetPublicSharedFolderContent = vi.mocked(shareService.getPublicSharedFolderContent);

const ROOT_UUID = 'root-folder-uuid';
const CODE = 'plain-code';
const CREDENTIALS = { networkUser: 'network-user', networkPass: 'network-pass' };

const createFolder = (uuid: string, plainName: string) => ({ id: 1, uuid, plainName, name: 'encrypted-name' });
const createFile = (uuid: string, plainName: string, size = 100) => ({
  id: 2,
  uuid,
  plainName,
  name: 'encrypted-name',
  size,
  type: 'png',
});

const buildResponse = (items: unknown[], token: string): ListSharedItemsResponse =>
  ({
    items,
    token,
    credentials: CREDENTIALS,
    role: 'reader',
  }) as ListSharedItemsResponse;

const renderContentHook = () =>
  renderHook(() =>
    usePublicSharedFolderContent({ rootFolderUuid: ROOT_UUID, rootFolderName: 'Root folder', code: CODE }),
  );

describe('usePublicSharedFolderContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When the hook mounts, then it fetches the root folders and then the files of the public shared folder', async () => {
    mockedGetPublicSharedFolderContent.mockImplementation((_, type) =>
      type === 'folders'
        ? Promise.resolve(buildResponse([createFolder('folder-uuid', 'Documents')], 'folders-token'))
        : Promise.resolve(buildResponse([createFile('file-uuid', 'photo')], 'files-token')),
    );

    const { result } = renderContentHook();

    await waitFor(() => expect(result.current.shareItems).toHaveLength(2));

    expect(mockedGetPublicSharedFolderContent).toHaveBeenCalledWith(ROOT_UUID, 'folders', '', 0, 30);
    expect(mockedGetPublicSharedFolderContent).toHaveBeenCalledWith(ROOT_UUID, 'files', '', 0, 30, CODE);

    const [folder, file] = result.current.shareItems;
    expect(folder.isFolder).toBe(true);
    expect(folder.name).toBe('Documents');
    expect(file.isFolder).toBe(false);
    expect(file.name).toBe('photo');
    expect(file.credentials).toEqual(CREDENTIALS);
    expect(result.current.hasMoreItems).toBe(false);
    expect(result.current.folderPath).toEqual([{ uuid: ROOT_UUID, name: 'Root folder', token: '' }]);
  });

  test('When navigating into a subfolder, then it uses the parent level resources token and can navigate back through the path', async () => {
    mockedGetPublicSharedFolderContent.mockImplementation((folderUuid, type) => {
      if (folderUuid === ROOT_UUID) {
        return type === 'folders'
          ? Promise.resolve(buildResponse([createFolder('subfolder-uuid', 'Documents')], 'root-folders-token'))
          : Promise.resolve(buildResponse([], 'root-files-token'));
      }
      return type === 'folders'
        ? Promise.resolve(buildResponse([], 'sub-folders-token'))
        : Promise.resolve(buildResponse([createFile('deep-file-uuid', 'notes')], 'sub-files-token'));
    });

    const { result } = renderContentHook();
    await waitFor(() => expect(result.current.hasMoreItems).toBe(false));

    act(() => {
      result.current.navigateToFolder(result.current.shareItems[0]);
    });

    await waitFor(() => expect(result.current.shareItems).toHaveLength(1));
    // the token returned while listing the parent level is used to list the subfolder
    expect(mockedGetPublicSharedFolderContent).toHaveBeenCalledWith(
      'subfolder-uuid',
      'folders',
      'root-files-token',
      0,
      30,
    );
    expect(result.current.folderPath).toEqual([
      { uuid: ROOT_UUID, name: 'Root folder', token: '' },
      { uuid: 'subfolder-uuid', name: 'Documents', token: 'root-files-token' },
    ]);
    expect(result.current.shareItems[0].name).toBe('notes');

    act(() => {
      result.current.navigateToFolderAtIndex(0);
    });

    await waitFor(() => expect(result.current.folderPath).toHaveLength(1));
    await waitFor(() => expect(result.current.shareItems[0]?.name).toBe('Documents'));
  });

  test('When clicking a file or the current breadcrumb level, then it does not navigate', async () => {
    mockedGetPublicSharedFolderContent.mockImplementation((_, type) =>
      type === 'folders'
        ? Promise.resolve(buildResponse([], 'folders-token'))
        : Promise.resolve(buildResponse([createFile('file-uuid', 'photo')], 'files-token')),
    );

    const { result } = renderContentHook();
    await waitFor(() => expect(result.current.shareItems).toHaveLength(1));
    mockedGetPublicSharedFolderContent.mockClear();

    act(() => {
      result.current.navigateToFolder(result.current.shareItems[0]);
      result.current.navigateToFolderAtIndex(0);
    });

    expect(result.current.folderPath).toHaveLength(1);
    expect(mockedGetPublicSharedFolderContent).not.toHaveBeenCalled();
  });

  test('When there are more items and the next page is requested, then it fetches the next page of folders', async () => {
    const fullFoldersPage = Array.from({ length: 30 }, (_, index) =>
      createFolder(`folder-uuid-${index}`, `Folder ${index}`),
    );
    mockedGetPublicSharedFolderContent.mockImplementation((_, type, __, page) => {
      if (type === 'folders' && page === 0) {
        return Promise.resolve(buildResponse(fullFoldersPage, 'folders-token'));
      }
      return type === 'folders'
        ? Promise.resolve(buildResponse([createFolder('last-folder-uuid', 'Last folder')], 'folders-token-2'))
        : Promise.resolve(buildResponse([], 'files-token'));
    });

    const { result } = renderContentHook();

    await waitFor(() => expect(result.current.shareItems).toHaveLength(30));
    expect(result.current.hasMoreItems).toBe(true);

    act(() => {
      result.current.onNextPage();
    });

    await waitFor(() => expect(result.current.shareItems).toHaveLength(31));
    expect(mockedGetPublicSharedFolderContent).toHaveBeenCalledWith(ROOT_UUID, 'folders', '', 1, 30);
    await waitFor(() => expect(result.current.hasMoreItems).toBe(false));
  });
});
