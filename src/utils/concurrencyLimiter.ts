export interface ConcurrencyLimiter {
  /**
   * Runs the task once fewer than `limit` tasks are running, in the order they were requested.
   * Aborting the signal while the task is still waiting removes it from the queue and rejects with the
   * signal's reason; once the task has started, the signal is ignored.
   */
  execute<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T>;
}

export const createConcurrencyLimiter = (limit: number): ConcurrencyLimiter => {
  let runningTasks = 0;
  const waitingTasks: (() => void)[] = [];

  const waitForFreeSlot = (signal?: AbortSignal): Promise<void> => {
    if (signal?.aborted) return Promise.reject(signal.reason);

    if (runningTasks < limit) {
      runningTasks++;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const start = () => {
        signal?.removeEventListener('abort', cancel);
        runningTasks++;
        resolve();
      };
      const cancel = () => {
        waitingTasks.splice(waitingTasks.indexOf(start), 1);
        reject(signal?.reason);
      };

      waitingTasks.push(start);
      signal?.addEventListener('abort', cancel, { once: true });
    });
  };

  const freeSlot = () => {
    runningTasks--;
    waitingTasks.shift()?.();
  };

  return {
    async execute(task, signal) {
      await waitForFreeSlot(signal);
      try {
        return await task();
      } finally {
        freeSlot();
      }
    },
  };
};
