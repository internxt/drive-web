import { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import storageReducer, { storageActions } from 'app/store/slices/storage';
import uiReducer, { uiActions } from 'app/store/slices/ui';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import { DriveItemData } from 'app/drive/types';
import { useEditItemName } from './useEditItemName';

vi.mock('app/store/slices/fileVersions', () => ({
  fileVersionsSelectors: { getMaxFileSizeLimit: vi.fn() },
}));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn(() => null) },
}));
vi.mock('app/store/slices/storage/storage.thunks/goToFolderThunk', () => ({
  getAncestorsAndSetNamePath: vi.fn(),
  goToFolderThunk: vi.fn(),
  goToFolderThunkExtraReducers: vi.fn(),
}));

const aFolder = { uuid: 'work-uuid', name: 'Work', plainName: 'Work', isFolder: true } as DriveItemData;
const aFile = { uuid: 'report-uuid', name: 'report', plainName: 'report', isFolder: false } as DriveItemData;

const renderEditItemName = () => {
  const store = configureStore({ reducer: { storage: storageReducer, ui: uiReducer } });
  const rendered = renderHook(() => useEditItemName(), {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  });
  return { store, ...rendered };
};

describe('Renaming items from the Drive explorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a rename is requested from elsewhere in the app, then the rename dialog opens for that item', () => {
    const { store, result } = renderEditItemName();

    act(() => {
      store.dispatch(storageActions.setItemToRename(aFolder));
    });

    expect(result.current.editNameItem).toStrictEqual(aFolder);
  });

  test('When the user renames the file open in the viewer, then the viewer shows the new name', () => {
    const { store, result } = renderEditItemName();
    act(() => {
      store.dispatch(uiActions.setIsFileViewerOpen(true));
      result.current.setEditNameItem(aFile);
    });

    act(() => result.current.onEditNameClose({ ...aFile, plainName: 'final report' }));

    expect(store.getState().ui.currentEditingNameDirty).toBe('final report');
    expect(result.current.editNameItem).toBeNull();
  });

  test('When the user renames a folder from its path, then the path is updated with the new name', () => {
    const { store, result } = renderEditItemName();
    act(() => {
      store.dispatch(storageActions.setItemToRename(aFolder));
    });

    act(() => result.current.onEditNameClose({ ...aFolder, plainName: 'Projects' }));

    expect(getAncestorsAndSetNamePath).toHaveBeenCalledWith(aFolder.uuid, expect.any(Function), null);
    expect(store.getState().storage.itemToRename).toBeNull();
  });

  test('When the user closes the dialog without renaming, then nothing else changes and the dialog closes', () => {
    const { store, result } = renderEditItemName();
    act(() => {
      store.dispatch(storageActions.setItemToRename(aFolder));
    });

    act(() => result.current.onEditNameClose());

    expect(getAncestorsAndSetNamePath).not.toHaveBeenCalled();
    expect(store.getState().storage.itemToRename).toBeNull();
    expect(result.current.editNameItem).toBeNull();
  });
});
