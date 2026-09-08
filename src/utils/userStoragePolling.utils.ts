import { store } from 'app/store';
import { planThunks } from 'app/store/slices/plan';

const INITIAL_INTERVAL_MS = 2 * 1000;
const MAX_INTERVAL_MS = 15 * 1000;
const BACKOFF_FACTOR = 1.5;
const MAX_POLLING_DURATION_MS = 2 * 60 * 1000;

export const userStoragePolling = () => {
  let baseline = store.getState().plan.planLimit || null;

  let nextDelay = INITIAL_INTERVAL_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    clearTimeout(maxDurationTimeout);
  };

  const scheduleNext = () => {
    if (stopped) {
      return;
    }
    timer = setTimeout(runCheck, nextDelay);
    nextDelay = Math.min(nextDelay * BACKOFF_FACTOR, MAX_INTERVAL_MS);
  };

  const runCheck = async () => {
    await store.dispatch(planThunks.fetchLimitThunk());
    const currentLimit = store.getState().plan.planLimit;

    if (currentLimit) {
      if (baseline === null) {
        baseline = currentLimit;
      } else if (currentLimit !== baseline) {
        stop();
        return;
      }
    }

    scheduleNext();
  };

  const maxDurationTimeout = setTimeout(stop, MAX_POLLING_DURATION_MS);
  void runCheck();

  return stop;
};
