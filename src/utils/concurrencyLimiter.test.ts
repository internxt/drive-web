import { describe, expect, test, vi } from 'vitest';
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

  test('When a waiting task is aborted, then it rejects right away, never runs and does not take a slot', async () => {
    const limiter = createConcurrencyLimiter(1);
    const running = deferred();
    const waiting = new AbortController();
    const waitingTask = vi.fn(() => Promise.resolve('waiting'));

    const runningTask = limiter.execute(() => running.promise);
    const waitingRun = limiter.execute(waitingTask, waiting.signal);
    const nextTask = limiter.execute(() => Promise.resolve('next'));

    waiting.abort(new Error('abort'));
    await expect(waitingRun).rejects.toThrow('abort');

    running.resolve();
    await runningTask;
    await expect(nextTask).resolves.toBe('next');
    expect(waitingTask).not.toHaveBeenCalled();
  });

  test('When a task is aborted before asking for a slot, then it rejects without running', async () => {
    const limiter = createConcurrencyLimiter(1);
    const signal = AbortSignal.abort(new Error('abort'));
    const task = vi.fn(() => Promise.resolve('done'));

    await expect(limiter.execute(task, signal)).rejects.toThrow('abort');
    expect(task).not.toHaveBeenCalled();
  });

  test('When a running task is aborted, then the limiter lets it finish', async () => {
    const limiter = createConcurrencyLimiter(1);
    const controller = new AbortController();
    const task = deferred();

    const run = limiter.execute(() => task.promise.then(() => 'done'), controller.signal);
    await flushPromises();
    controller.abort(new Error('abort'));
    task.resolve();

    await expect(run).resolves.toBe('done');
  });

  test('When a task fails, then its error reaches the caller', async () => {
    const limiter = createConcurrencyLimiter(1);

    await expect(limiter.execute(() => Promise.reject(new Error('failed')))).rejects.toThrow('failed');
    await expect(limiter.execute(() => Promise.resolve('next'))).resolves.toBe('next');
  });
});
