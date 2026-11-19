import { queue } from 'async';
import { MAX_CONCURRENT_UPLOADS } from 'app/network/networkConstants';
import errorService from 'services/error.service';
import { QueueUtilsService } from 'utils/queueUtils';

type RetryJob = () => Promise<void>;

export const retryQueue = queue<RetryJob>((job, next) => {
  QueueUtilsService.instance.adjustConcurrency(retryQueue, MAX_CONCURRENT_UPLOADS);

  job().then(() => next(), next);
}, MAX_CONCURRENT_UPLOADS);

/**
 * Runs the job through a single queue shared by every retry (Retry all and single-file retries,
 * across all modals), so no more than MAX_CONCURRENT_UPLOADS retries run at the same time.
 */
export const enqueueRetry = (job: RetryJob): void => {
  retryQueue.push(job).catch((error) => errorService.reportError(error));
};
