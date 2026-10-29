import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { MenuItemType } from '@internxt/ui';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import storageReducer from 'app/store/slices/storage';
import uiReducer from 'app/store/slices/ui';
import { moveItemsToTrash } from 'views/Trash/services';
import { FileViewerKeyboardShortcuts } from '../types';
import { useFileViewerActions } from './useFileViewerActions';

vi.mock('views/Trash/services', () => ({ moveItemsToTrash: vi.fn() }));
vi.mock('i18next', async (importOriginal) => ({ ...(await importOriginal<object>()), t: (key: string) => key }));

const createFile = (overrides: Partial<PreviewFileItem> = {}): PreviewFileItem =>
  ({
    id: 1,
    uuid: 'file-uuid',
    name: 'notes',
    type: 'txt',
    status: FileStatus.EXISTS,
    ...overrides,
  }) as PreviewFileItem;

const renderActions = (
  file: PreviewFileItem,
  view: { contextMenu?: Array<MenuItemType<DriveItemData>>; keyboardShortcuts?: FileViewerKeyboardShortcuts } = {},
) => {
  const store = configureStore({
    reducer: { storage: storageReducer, ui: uiReducer, workspaces: () => ({ selectedWorkspace: null }) },
  });
  const onClose = vi.fn();
  const { result } = renderHook(() => useFileViewerActions({ file, onClose, ...view }), {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  });

  return { result, store, onClose };
};

type MenuAction = { name: string; action: (item: DriveItemData) => void };

const menuActions = (menuItems: Array<MenuItemType<DriveItemData>>) =>
  menuItems.filter((menuItem) => !('separator' in menuItem)) as MenuAction[];

const menuActionNames = (menuItems: Array<MenuItemType<DriveItemData>>) =>
  menuActions(menuItems).map((menuItem) => menuItem.name);

const findMenuAction = (menuItems: Array<MenuItemType<DriveItemData>>, name: string) =>
  menuActions(menuItems).find((menuItem) => menuItem.name === name) as MenuAction;

describe('File viewer actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a file that is not shared is open, then the menu offers to share it and the usual file actions', () => {
    const { result } = renderActions(createFile());

    expect(menuActionNames(result.current.menuItems)).toStrictEqual([
      'drive.dropdown.shareLink',
      'drive.dropdown.copyLink',
      'drive.dropdown.details',
      'drive.dropdown.rename',
      'drive.dropdown.move',
      'drive.dropdown.download',
      'drive.dropdown.moveToTrash',
    ]);
  });

  test('When a shared file is open, then the menu offers to manage its link access instead of sharing it', () => {
    const { result } = renderActions(createFile({ sharings: [{ type: 'public', id: 'sharing' }] }));

    const actionNames = menuActionNames(result.current.menuItems);

    expect(actionNames).toContain('drive.dropdown.manageLinkAccess');
    expect(actionNames).not.toContain('drive.dropdown.shareLink');
  });

  test('When the file is moved to the trash from the menu or the keyboard, then it goes to the trash and the viewer closes', () => {
    const file = createFile();
    const { result, onClose } = renderActions(file);

    act(() => findMenuAction(result.current.menuItems, 'drive.dropdown.moveToTrash').action(file as DriveItemData));
    act(() => result.current.keyboardShortcuts.removeItemFromKeyboard?.(file as DriveItemData));

    expect(moveItemsToTrash).toHaveBeenCalledTimes(2);
    expect(moveItemsToTrash).toHaveBeenCalledWith([file]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('When the file is renamed from the keyboard, then the rename dialog opens for it', () => {
    const file = createFile();
    const { result, store } = renderActions(file);

    act(() => result.current.keyboardShortcuts.renameItemFromKeyboard?.(file as DriveItemData));

    expect(store.getState().ui.isEditFolderNameDialog).toBe(true);
    expect(store.getState().storage.itemToRename).toStrictEqual(file);
  });

  test('When a file in the trash is open, then the menu offers to restore it or delete it and the keyboard does nothing', () => {
    const { result } = renderActions(createFile({ status: FileStatus.TRASHED }));

    expect(menuActionNames(result.current.menuItems)).toStrictEqual([
      'drive.dropdown.restore',
      'drive.dropdown.details',
      'drive.dropdown.deletePermanently',
    ]);
    expect(result.current.keyboardShortcuts).toStrictEqual({});
  });

  test('When the view brings its own menu, such as backups, then only its menu and its own shortcuts are used', () => {
    const deleteBackupFile = vi.fn();
    const backupsMenu = [{ name: 'backups.delete', action: vi.fn() }] as unknown as Array<MenuItemType<DriveItemData>>;
    const file = createFile();
    const { result } = renderActions(file, {
      contextMenu: backupsMenu,
      keyboardShortcuts: { removeItemFromKeyboard: deleteBackupFile },
    });

    act(() => result.current.keyboardShortcuts.removeItemFromKeyboard?.(file as DriveItemData));

    expect(result.current.menuItems).toBe(backupsMenu);
    expect(result.current.keyboardShortcuts.renameItemFromKeyboard).toBeUndefined();
    expect(deleteBackupFile).toHaveBeenCalledWith(file);
    expect(moveItemsToTrash).not.toHaveBeenCalled();
  });

  test('When the view only brings its own menu, then the keyboard does nothing instead of using the Drive actions', () => {
    const backupsMenu = [{ name: 'backups.delete', action: vi.fn() }] as unknown as Array<MenuItemType<DriveItemData>>;

    const { result } = renderActions(createFile(), { contextMenu: backupsMenu });

    expect(result.current.keyboardShortcuts).toStrictEqual({});
  });
});
