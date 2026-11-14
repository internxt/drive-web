import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('app/tasks/hooks', () => ({
  useTaskManagerGetNotifications: vi.fn(),
}));

import { useStorageWarningBanner } from './useStorageWarningBanner';
import { useTaskManagerGetNotifications } from 'app/tasks/hooks';
import { TaskType } from 'app/tasks/types';
import { writeDismissal } from 'views/Home/utils/storageWarning';

const mockUseTaskManagerGetNotifications = useTaskManagerGetNotifications as ReturnType<typeof vi.fn>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type BannerParams = Parameters<typeof useStorageWarningBanner>[0];

const buildParams = (overrides: Partial<BannerParams> = {}): BannerParams => ({
  planLimit: 100,
  planUsage: 65,
  isLoadingPlanLimit: false,
  isLoadingPlanUsage: false,
  isFreeUser: true,
  ...overrides,
});

const setActiveNotifications = (notifications: { action: TaskType }[]) => {
  mockUseTaskManagerGetNotifications.mockReturnValue(notifications);
};

describe('useStorageWarningBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setActiveNotifications([]);
  });

  test('When a free user keeps usage below the first warning threshold, then no banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 50 })));

    expect(result.current).toBeNull();
  });

  test('When a free user crosses the low usage threshold, then the low warning banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 65 })));

    expect(result.current?.reachedStage.key).toBe('lowWarning');
    expect(result.current?.usedPercentage).toBe(65);
  });

  test('When a free user reaches a high usage level, then the mid warning banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 85 })));

    expect(result.current?.reachedStage.key).toBe('midWarning');
  });

  test('When a free user nearly fills their storage, then the most severe warning banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 96 })));

    expect(result.current?.reachedStage.key).toBe('highWarning');
  });

  test('When the user is on a paid plan, then no banner is shown regardless of usage', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 96, isFreeUser: false })));

    expect(result.current).toBeNull();
  });

  test('When plan usage and limit are still loading, then no banner is shown', () => {
    const { result } = renderHook(() =>
      useStorageWarningBanner(buildParams({ isLoadingPlanUsage: true, isLoadingPlanLimit: true })),
    );

    expect(result.current).toBeNull();
  });

  test('When plan data has not been fetched yet, then no banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 0, planLimit: 0 })));

    expect(result.current).toBeNull();
  });

  test('When plan values are invalid, then no banner is shown', () => {
    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: -10 })));

    expect(result.current).toBeNull();
  });

  test('When an upload is in progress, then no banner is shown', () => {
    setActiveNotifications([{ action: TaskType.UploadFile }]);

    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 96 })));

    expect(result.current).toBeNull();
  });

  test('When a non-upload task is in progress, then the banner is still shown', () => {
    setActiveNotifications([{ action: TaskType.DownloadFile }]);

    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 65 })));

    expect(result.current?.reachedStage.key).toBe('lowWarning');
  });

  test('When the user dismisses the banner, then it stays hidden for the rest of the session', () => {
    const { result, rerender } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 65 })));

    act(() => {
      result.current?.onCloseButtonClick();
    });
    rerender();

    expect(result.current).toBeNull();
  });

  test('When a stage was dismissed within its cooldown window, then the banner stays hidden', () => {
    writeDismissal('lowWarning', Date.now());

    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 65 })));

    expect(result.current).toBeNull();
  });

  test('When the cooldown window of a dismissed stage has elapsed, then the banner is shown again', () => {
    writeDismissal('lowWarning', Date.now() - 8 * DAY_IN_MS);

    const { result } = renderHook(() => useStorageWarningBanner(buildParams({ planUsage: 65 })));

    expect(result.current?.reachedStage.key).toBe('lowWarning');
  });
});
