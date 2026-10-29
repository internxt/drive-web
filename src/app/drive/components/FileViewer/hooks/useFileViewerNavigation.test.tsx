import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppView } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import storageReducer, { storageActions } from 'app/store/slices/storage';
import navigationService from 'services/navigation.service';
import { useFileViewerNavigation } from './useFileViewerNavigation';

const FOLDER_UUID = 'folder-uuid';

const item = (id: number, name: string, overrides: Partial<DriveItemData> = {}): DriveItemData =>
  ({
    id,
    uuid: `uuid-${id}`,
    name,
    type: 'txt',
    isFolder: false,
    folderUuid: FOLDER_UUID,
    ...overrides,
  }) as DriveItemData;

const folder = (id: number, name: string) => item(id, name, { isFolder: true, type: null as unknown as string });

const asPreviewFile = (driveItem: DriveItemData) => driveItem as unknown as PreviewFileItem;

type ListedItems = { folderContent?: DriveItemData[]; recents?: DriveItemData[]; folderItems?: DriveItemData[] };

const renderNavigation = (
  openedFile: DriveItemData,
  { folderContent, recents = [], folderItems }: ListedItems = {},
) => {
  const store = configureStore({ reducer: { storage: storageReducer } });
  if (folderContent) store.dispatch(storageActions.setItems({ folderId: FOLDER_UUID, items: folderContent }));
  store.dispatch(storageActions.setRecents(recents));

  return renderHook(() => useFileViewerNavigation({ initialFile: asPreviewFile(openedFile), folderItems }), {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  });
};

const openedFileName = (result: { current: ReturnType<typeof useFileViewerNavigation> }) =>
  result.current.currentFile.name;

describe('Moving between files in the file viewer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(navigationService, 'isCurrentPath').mockReturnValue(false);
  });

  test('When the user moves forward and back, then the files are visited in the same order as the list', () => {
    const files = [item(1, 'b'), item(2, 'A'), item(3, 'c')];
    const { result } = renderNavigation(files[0], { folderContent: files });

    act(() => result.current.navigation.goToNext());
    expect(openedFileName(result)).toBe('A');

    act(() => result.current.navigation.goToNext());
    expect(openedFileName(result)).toBe('c');

    act(() => result.current.navigation.goToPrevious());
    expect(openedFileName(result)).toBe('A');
  });

  test('When the first file is open, then there is no previous file, and when the last one is open, there is no next file', () => {
    const files = [item(1, 'first'), item(2, 'last')];
    const { result } = renderNavigation(files[0], { folderContent: files });
    expect(result.current.navigation).toMatchObject({ hasPrevious: false, hasNext: true });

    act(() => result.current.navigation.goToNext());

    expect(result.current.navigation).toMatchObject({ hasPrevious: true, hasNext: false });
    act(() => result.current.navigation.goToNext());
    expect(openedFileName(result)).toBe('last');
  });

  test.each([
    { case: 'a folder', listKey: 'folderContent' },
    { case: 'a list given by the view, such as backups', listKey: 'folderItems' },
  ])('When moving through $case with folders in it, then folders are skipped', ({ listKey }) => {
    const files = [item(1, 'notes'), folder(2, 'Photos'), item(3, 'report')];
    const { result } = renderNavigation(files[0], { [listKey]: files });

    act(() => result.current.navigation.goToNext());

    expect(openedFileName(result)).toBe('report');
    expect(result.current.navigation.hasNext).toBe(false);
  });

  test.each([
    { case: 'its folder is not loaded', folderContent: undefined },
    { case: 'it is not in the list', folderContent: [item(2, 'other'), item(3, 'another')] },
  ])(
    'When the open file is not listed because $case, then there is no navigation and nothing breaks',
    ({ folderContent }) => {
      const openedFile = item(1, 'shared');
      const { result } = renderNavigation(openedFile, { folderContent });

      act(() => result.current.navigation.goToPrevious());
      act(() => result.current.navigation.goToNext());

      expect(result.current.navigation).toMatchObject({ hasPrevious: false, hasNext: false });
      expect(openedFileName(result)).toBe('shared');
    },
  );

  test('When a file is opened from Recents, then the user moves through the Recents list instead of its folder', () => {
    vi.spyOn(navigationService, 'isCurrentPath').mockImplementation((path) => path === AppView.Recents);
    const openedFile = item(1, 'recent');
    const { result } = renderNavigation(openedFile, {
      folderContent: [openedFile, item(2, 'same folder')],
      recents: [openedFile, item(3, 'other recent', { folderUuid: 'other-folder' })],
    });

    act(() => result.current.navigation.goToNext());

    expect(openedFileName(result)).toBe('other recent');
  });

  test('When the open file is renamed, then it keeps its place in the navigation', () => {
    const files = [item(1, 'first'), item(2, 'middle'), item(3, 'last')];
    const { result } = renderNavigation(files[1], { folderContent: files });

    act(() => result.current.setCurrentFile({ ...result.current.currentFile, name: 'renamed' }));

    expect(result.current.navigation).toMatchObject({ hasPrevious: true, hasNext: true });
    act(() => result.current.navigation.goToNext());
    expect(openedFileName(result)).toBe('last');
  });
});
