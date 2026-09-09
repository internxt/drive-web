export type StallWatchdog = {
  signal: AbortSignal;
  hasStalled: () => boolean;
  restart: () => void;
  stop: () => void;
};

/**
 * Aborts `signal` when `restart` is not called within `idleTimeoutMs` (the watched activity stalled)
 * or when `userSignal` aborts (the user cancelled). `stop` releases the timer and listener.
 */
export const createStallWatchdog = (idleTimeoutMs: number, userSignal?: AbortSignal): StallWatchdog => {
  const abortController = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let hasStalled = false;

  const abortAsStalled = () => {
    hasStalled = true;
    abortController.abort();
  };
  const abortAsCancelled = () => abortController.abort();

  const restart = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(abortAsStalled, idleTimeoutMs);
  };
  const stop = () => {
    clearTimeout(idleTimer);
    userSignal?.removeEventListener('abort', abortAsCancelled);
  };

  if (userSignal?.aborted) abortAsCancelled();
  else userSignal?.addEventListener('abort', abortAsCancelled);
  restart();

  return { signal: abortController.signal, hasStalled: () => hasStalled, restart, stop };
};
