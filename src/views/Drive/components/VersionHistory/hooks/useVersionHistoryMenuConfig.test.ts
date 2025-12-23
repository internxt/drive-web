import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { useSelector } from 'react-redux';
import { useAppDispatch } from 'app/store/hooks';
import navigationService from 'services/navigation.service';
import { useVersionHistoryMenuConfig } from './useVersionHistoryMenuConfig';
import { FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: vi.fn(),
}));

const mockSetIsPreferencesDialogOpen = vi.hoisted(() =>
  vi.fn((payload: boolean) => ({ type: 'setIsPreferencesDialogOpen', payload })),
);

vi.mock('app/store/slices/ui', () => ({
  uiActions: {
    setIsPreferencesDialogOpen: mockSetIsPreferencesDialogOpen,
  },
}));

vi.mock('services/navigation.service', () => ({
  default: {
    openPreferencesDialog: vi.fn(),
  },
}));

const workspaceMock = {
  workspaceUser: { workspaceId: 'workspace-1' },
  workspace: { id: 'workspace-1' },
} as unknown as WorkspaceData;

const enabledLimits: FileLimitsResponse = {
  versioning: { enabled: true, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
};

const disabledLimits: FileLimitsResponse = {
  versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
};

describe('Version history menu', () => {
  const mockUseSelector = useSelector as unknown as Mock;
  const mockUseAppDispatch = useAppDispatch as unknown as Mock;
  const dispatch = vi.fn();

  const mockState = (limits: FileLimitsResponse | null) =>
    ({
      workspaces: { selectedWorkspace: workspaceMock },
      fileVersions: { limits },
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(dispatch);
  });

  it('when versioning is locked, then the upgrade flow opens', () => {
    mockUseSelector.mockImplementation((selector: (state: any) => unknown) => selector(mockState(disabledLimits)));

    const { result } = renderHook(() => useVersionHistoryMenuConfig({ type: 'pdf' } as any));

    expect(result.current.isLocked).toBe(true);
    expect(result.current.isExtensionAllowed).toBe(true);

    act(() => {
      result.current.onUpgradeClick?.();
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'setIsPreferencesDialogOpen', payload: true });
    expect(navigationService.openPreferencesDialog).toHaveBeenCalledWith({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: 'workspace-1',
    });
  });

  it('when versioning is enabled and the file is supported, then the menu is unlocked', () => {
    mockUseSelector.mockImplementation((selector: (state: any) => unknown) => selector(mockState(enabledLimits)));

    const { result } = renderHook(() => useVersionHistoryMenuConfig({ type: 'pdf' } as any));

    expect(result.current.isLocked).toBe(false);
    expect(result.current.isExtensionAllowed).toBe(true);
  });

  it('when the file type is unsupported, then it is marked as not allowed', () => {
    mockUseSelector.mockImplementation((selector: (state: any) => unknown) => selector(mockState(enabledLimits)));

    const { result } = renderHook(() => useVersionHistoryMenuConfig({ type: 'exe' } as any));

    expect(result.current.isExtensionAllowed).toBe(false);
  });
});
