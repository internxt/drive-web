import { describe, expect, test } from 'vitest';
import { createConcurrencyLimiter } from './concurrencyLimiter';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Concurrency limiter', () => {
  test('When more tasks are requested than the limit, then the rest wait and start in order as slots free up', async () => {
    const limiter = createConcurrencyLimiter(2);
    const tasks = [deferred(), deferred(), deferred(), deferred()];
    const started: number[] = [];

    const runs = tasks.map((task, index) =>
      limiter.execute(() => {
        started.push(index);
        return task.promise;
      }),
    );
    const failedRun = expect(runs[0]).rejects.toThrow('failed');
    await flushPromises();
    expect(started).toEqual([0, 1]);

    tasks[1].resolve();
    await flushPromises();
    expect(started).toEqual([0, 1, 2]);

    tasks[0].reject(new Error('failed'));
    await flushPromises();
    expect(started).toEqual([0, 1, 2, 3]);
    await failedRun;
  });

  test('When a task fails, then its error reaches the caller', async () => {
    const limiter = createConcurrencyLimiter(1);

    await expect(limiter.execute(() => Promise.reject(new Error('failed')))).rejects.toThrow('failed');
    await expect(limiter.execute(() => Promise.resolve('next'))).resolves.toBe('next');
  });
});
