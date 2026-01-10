import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { Trash, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { useVersionItemActions } from './useVersionItemActions';
import fileVersionService from '../services/fileVersion.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { FileVersion } from '@internxt/sdk/dist/drive/storage/types';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { RootState } from 'app/store';
import { MenuItemType } from '@internxt/ui';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn(),
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

vi.mock('views/Drive/services/fileVersion.service', () => ({
  default: {
    downloadVersion: vi.fn(),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'error',
  },
}));

const mockSetVersionToRestore = vi.hoisted(() => vi.fn((payload) => ({ type: 'setVersionToRestore', payload })));
const mockSetIsRestoreVersionDialogOpen = vi.hoisted(() =>
  vi.fn((payload) => ({ type: 'setIsRestoreVersionDialogOpen', payload })),
);
const mockSetVersionToDelete = vi.hoisted(() => vi.fn((payload) => ({ type: 'setVersionToDelete', payload })));
const mockSetIsDeleteVersionDialogOpen = vi.hoisted(() =>
  vi.fn((payload) => ({ type: 'setIsDeleteVersionDialogOpen', payload })),
);

vi.mock('app/store/slices/ui', () => ({
  uiActions: {
    setVersionToRestore: mockSetVersionToRestore,
    setIsRestoreVersionDialogOpen: mockSetIsRestoreVersionDialogOpen,
    setVersionToDelete: mockSetVersionToDelete,
    setIsDeleteVersionDialogOpen: mockSetIsDeleteVersionDialogOpen,
  },
}));

describe('Version item menu', () => {
  const translateMock = vi.fn((key: string) => key);
  const version = {
    id: 'version-id',
    fileId: 'file-uuid',
    networkFileId: 'network-file-id',
    size: '5',
    createdAt: '2026-01-10T14:30:00.000Z',
  } as FileVersion;
  const fileItem = {
    id: 'file-id',
    name: 'fallback-name',
    plainName: 'pretty-name',
    fileId: 'file-id',
  } as any;
  const selectedWorkspace = { workspace: { id: 'workspace-id' } } as WorkspaceData;
  const workspaceCredentials = { workspaceId: 'workspace-id', token: 'token' } as any;
  const baseState = {
    ui: { versionHistoryItem: fileItem },
    workspaces: { selectedWorkspace, workspaceCredentials },
  } as unknown as RootState;

  const mockDispatch = vi.fn();
  const mockUseAppDispatch = useAppDispatch as unknown as Mock;
  const mockUseAppSelector = useAppSelector as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    (useTranslationContext as Mock).mockReturnValue({ translate: translateMock });
    mockUseAppSelector.mockImplementation((selector: (state: RootState) => unknown) => selector(baseState));
  });

  const getMenuActionByIcon = (items: Array<MenuItemType<FileVersion>>, icon: any) => {
    const item = items.find((item) => 'icon' in item && item.icon === icon);
    return item && 'action' in item ? (item as any).action : undefined;
  };

  it('when restore is chosen, then the restore dialog opens', () => {
    const onDropdownClose = vi.fn();
    const { result } = renderHook(() => useVersionItemActions({ version, onDropdownClose }));
    const restoreAction = getMenuActionByIcon(result.current.menuItems, ClockCounterClockwise);

    act(() => {
      restoreAction();
    });

    expect(onDropdownClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setVersionToRestore', payload: version });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsRestoreVersionDialogOpen', payload: true });
  });

  it('when nothing is selected to download, then an error toast is shown', async () => {
    const onDropdownClose = vi.fn();
    mockUseAppSelector.mockImplementation((selector: (state: RootState) => unknown) =>
      selector({
        ui: { versionHistoryItem: null },
        workspaces: { selectedWorkspace: null, workspaceCredentials: null },
      } as unknown as RootState),
    );
    const showSpy = vi.spyOn(notificationsService, 'show');
    const { result } = renderHook(() => useVersionItemActions({ version, onDropdownClose }));
    const downloadAction = getMenuActionByIcon(result.current.menuItems, DownloadSimple);

    await act(async () => {
      await downloadAction();
    });

    expect(onDropdownClose).toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalledWith({
      text: 'modals.versionHistory.downloadError',
      type: ToastType.Error,
    });
    expect(fileVersionService.downloadVersion).not.toHaveBeenCalled();
  });

  it('when a previous version is downloaded, then it uses the readable name and workspace data', async () => {
    const onDropdownClose = vi.fn();
    const downloadVersionSpy = vi.spyOn(fileVersionService, 'downloadVersion').mockResolvedValue(undefined as any);
    const { result } = renderHook(() => useVersionItemActions({ version, onDropdownClose }));
    const downloadAction = getMenuActionByIcon(result.current.menuItems, DownloadSimple);

    await act(async () => {
      await downloadAction();
    });

    expect(onDropdownClose).toHaveBeenCalled();
    expect(downloadVersionSpy).toHaveBeenCalledWith(
      version,
      fileItem,
      '(10-01-2026 at 10:30) pretty-name',
      selectedWorkspace,
      workspaceCredentials,
    );
    expect(notificationsService.show).not.toHaveBeenCalled();
  });

  it('when delete is chosen, then the delete dialog opens', () => {
    const onDropdownClose = vi.fn();
    const { result } = renderHook(() => useVersionItemActions({ version, onDropdownClose }));
    const deleteAction = getMenuActionByIcon(result.current.menuItems, Trash);

    act(() => {
      deleteAction();
    });

    expect(onDropdownClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setVersionToDelete', payload: version });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsDeleteVersionDialogOpen', payload: true });
  });
});
