import { store } from 'app/store';
import { planThunks } from 'app/store/slices/plan';

const POLLING_INTERVAL_MS = 5 * 1000;
const MAX_POLLING_DURATION_MS = 30 * 1000;

export const userStoragePolling = () => {
  const initialLimit = store.getState().plan.planLimit;

  let interval: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
    clearTimeout(timeout);
  };

  const timeout = setTimeout(stop, MAX_POLLING_DURATION_MS);

  interval = setInterval(async () => {
    await store.dispatch(planThunks.fetchLimitThunk());
    const newLimit = store.getState().plan.planLimit;
    if (newLimit !== initialLimit) {
      stop();
    }
  }, POLLING_INTERVAL_MS);

  return stop;
};
