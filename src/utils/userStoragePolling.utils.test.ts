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

  test('When polling starts, then the limit is fetched immediately and then with a backing-off interval', async () => {
    mockStore.getState.mockReturnValue({ plan: { planLimit: 100 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4500);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(4);
  });

  test('When polling, then the interval backs off (grows) between checks', async () => {
    mockStore.getState.mockReturnValue({ plan: { planLimit: 100 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1999);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2999);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
  });

  test('When the limit changes from the pre-purchase value, then stop polling', async () => {
    mockStore.getState
      .mockReturnValueOnce({ plan: { planLimit: 100 } })
      .mockReturnValueOnce({ plan: { planLimit: 100 } })
      .mockReturnValue({ plan: { planLimit: 200 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(120000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
  });

  test('When the store starts with an unknown limit, then it does not stop on the stale value', async () => {
    mockStore.getState
      .mockReturnValueOnce({ plan: { planLimit: 0 } }) // baseline read: unknown
      .mockReturnValueOnce({ plan: { planLimit: 100 } }) // immediate check: establishes baseline
      .mockReturnValueOnce({ plan: { planLimit: 100 } }) // next check: still old value
      .mockReturnValue({ plan: { planLimit: 200 } }); // next check: new limit -> stop

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

    // Still polling: the first real reading only established the baseline, it did not stop.
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

    // New limit detected here -> stop.
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(120000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
  });

  test('When there is no limit update, then stops polling after the max duration', async () => {
    mockStore.getState.mockReturnValue({ plan: { planLimit: 100 } });

    userStoragePolling();

    await vi.advanceTimersByTimeAsync(120000);
    const callsAtMaxDuration = mockStore.dispatch.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60000);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(callsAtMaxDuration);
  });
});
