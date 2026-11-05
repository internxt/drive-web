export interface ConcurrencyLimiter {
  execute<T>(task: () => Promise<T>): Promise<T>;
}

export const createConcurrencyLimiter = (limit: number): ConcurrencyLimiter => {
  let runningTasks = 0;
  const waitingTasks: (() => void)[] = [];

  const waitForFreeSlot = (): Promise<void> => {
    if (runningTasks < limit) {
      runningTasks++;
      return Promise.resolve();
    }

    return new Promise((resolve) =>
      waitingTasks.push(() => {
        runningTasks++;
        resolve();
      }),
    );
  };

  const freeSlot = () => {
    runningTasks--;
    waitingTasks.shift()?.();
  };

  return {
    async execute(task) {
      await waitForFreeSlot();
      try {
        return await task();
      } finally {
        freeSlot();
      }
    },
  };
};
