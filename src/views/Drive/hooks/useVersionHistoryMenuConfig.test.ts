import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { useSelector } from 'react-redux';
import { useVersionHistoryMenuConfig } from './useVersionHistoryMenuConfig';
import { FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

const enabledLimits: FileLimitsResponse = {
  versioning: { enabled: true, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
};

const disabledLimits: FileLimitsResponse = {
  versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
};

describe('Version history menu', () => {
  const mockUseSelector = useSelector as unknown as Mock;

  const mockState = (limits: FileLimitsResponse | null) =>
    ({
      fileVersions: { limits },
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('when versioning is locked, then the menu is marked as locked', () => {
    mockUseSelector.mockImplementation((selector: (state: any) => unknown) => selector(mockState(disabledLimits)));

    const { result } = renderHook(() => useVersionHistoryMenuConfig({ type: 'pdf' } as any));

    expect(result.current.isLocked).toBe(true);
    expect(result.current.isExtensionAllowed).toBe(true);
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
