import { vi, describe, beforeEach, it, expect, Mock } from 'vitest';
import workspacesService from 'app/core/services/workspace.service';
import { renderHook, waitFor } from '@testing-library/react';
import { ACCESS_LOGS_DEFAULT_LIMIT, useAccessLogs } from './useAccessLogs';
import errorService from 'app/core/services/error.service';
import { act } from 'react-dom/test-utils';

const mockWorkspaceId = 'workspace-id';

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn(() => ({
    workspace: { id: mockWorkspaceId },
  })),
}));

vi.mock('app/core/services/workspace.service', () => ({
  default: {
    getWorkspaceLogs: vi.fn(async () => []),
  },
}));

vi.mock('app/core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('useAccessLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches logs on mount', async () => {
    const mockLogs = [
      { id: 'log1', type: 'login', platform: 'WEB', updatedAt: new Date() },
      { id: 'log2', type: 'logout', platform: 'MOBILE', updatedAt: new Date() },
    ];

    vi.spyOn(workspacesService, 'getWorkspaceLogs').mockResolvedValueOnce(mockLogs as any);

    const { result } = renderHook(() => useAccessLogs({}));

    await waitFor(() => {
      expect(result.current.accessLogs).toEqual(mockLogs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMoreItems).toBe(false);
    });
  });

  it('applies filters correctly', async () => {
    const mockFilters = {
      activity: ['login' as any],
      lastDays: 7,
      member: 'test@example.com',
      orderBy: 'updatedAt:ASC',
    };
    const mockFilteredLogs = [
      { id: 'log1', type: 'login', platform: 'WEB', updatedAt: new Date() },
      { id: 'log2', type: 'login', platform: 'MOBILE', updatedAt: new Date() },
    ];

    vi.spyOn(workspacesService, 'getWorkspaceLogs').mockResolvedValue(Promise.resolve(mockFilteredLogs) as any);

    const { result } = renderHook(() => useAccessLogs(mockFilters));

    await waitFor(() => {
      expect(workspacesService.getWorkspaceLogs).toHaveBeenCalledWith({
        workspaceId: mockWorkspaceId,
        limit: ACCESS_LOGS_DEFAULT_LIMIT,
        offset: 0,
        activity: ['login'],
        lastDays: 7,
        member: 'test@example.com',
        orderBy: 'updatedAt:ASC',
      });

      expect(result.current.accessLogs).toEqual(mockFilteredLogs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMoreItems).toBe(false);
    });
  });

  it('loads more logs correctly', async () => {
    const generateMockLogs = (count: number, offset: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `log${index + offset + 1}`,
        type: index % 2 === 0 ? 'login' : 'logout',
        platform: index % 3 === 0 ? 'WEB' : 'MOBILE',
        updatedAt: new Date(Date.now() - index * 1000 * 60),
      }));

    const initialLogs = generateMockLogs(ACCESS_LOGS_DEFAULT_LIMIT, 0);
    const additionalLogs = generateMockLogs(5, ACCESS_LOGS_DEFAULT_LIMIT);

    (workspacesService.getWorkspaceLogs as Mock).mockReturnValueOnce(Promise.resolve(initialLogs));

    const { result } = renderHook(() => useAccessLogs({}));

    await waitFor(() => {
      expect(result.current.accessLogs).toEqual(initialLogs);
      expect(result.current.hasMoreItems).toBeTruthy();
    });

    (workspacesService.getWorkspaceLogs as Mock).mockReturnValueOnce(Promise.resolve(additionalLogs));

    await act(async () => {
      result.current.loadMoreItems();
    });

    await waitFor(() => {
      expect(result.current.accessLogs).toEqual([...initialLogs, ...additionalLogs]);
    });
  });

  it('handles errors during fetching', async () => {
    const mockError = new Error('Error fetching logs');
    vi.spyOn(workspacesService, 'getWorkspaceLogs').mockRejectedValue(mockError);

    const { result } = renderHook(() => useAccessLogs({}));

    await waitFor(() => {
      expect(errorService.reportError).toHaveBeenCalledWith(mockError);
      expect(result.current.accessLogs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
