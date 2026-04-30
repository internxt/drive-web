import { describe, expect, vi, beforeEach, afterEach, test } from 'vitest';

vi.mock('app/store', () => ({
  store: {
    getState: vi.fn(),
    dispatch: vi.fn(),
  },
}));

vi.mock('app/store/slices/plan', () => ({
  planThunks: {
    fetchLimitThunk: vi.fn(() => 'fetchLimitThunk-action'),
  },
}));

import { store } from 'app/store';
import { userStoragePolling } from './userStoragePolling.utils';

const mockStore = store as unknown as { getState: ReturnType<typeof vi.fn>; dispatch: ReturnType<typeof vi.fn> };

describe('User Storage Polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStore.dispatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('When an interval tick occurs, then the limit is fetched', async () => {
    mockStore.getState.mockReturnValue({ plan: { planLimit: 100 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(5000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
  });

  test('When limit changes, then stop polling', async () => {
    mockStore.getState
      .mockReturnValueOnce({ plan: { planLimit: 100 } })
      .mockReturnValueOnce({ plan: { planLimit: 100 } })
      .mockReturnValueOnce({ plan: { planLimit: 200 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(5000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(15000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
  });

  test('When there is no limit updates, then stops polling after 30 seconds', async () => {
    mockStore.getState.mockReturnValue({ plan: { planLimit: 100 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(30000);
    const callsAt30s = mockStore.dispatch.mock.calls.length;

    await vi.advanceTimersByTimeAsync(10000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(callsAt30s);
  });
});
