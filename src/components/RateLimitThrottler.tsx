import { useState, useCallback, useRef } from 'react';
import { Lightning } from '@phosphor-icons/react';
import { SdkFactory } from 'app/core/factory/sdk';
import envService from 'services/env.service';

const BATCH_SIZE = 1000;

const RateLimitThrottler = () => {
  const [totalSent, setTotalSent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);

  const start = useCallback(async () => {
    stopRef.current = false;
    setIsRunning(true);
    setTotalSent(0);

    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    let count = 0;

    while (!stopRef.current) {
      const promises = Array.from({ length: BATCH_SIZE }, () => {
        const [promise] = storageClient.getFolderFoldersByUuid('root', 0, 1, 'name', 'ASC');
        return promise.catch(() => {});
      });
      await Promise.allSettled(promises);
      count += BATCH_SIZE;
      setTotalSent(count);
    }

    setIsRunning(false);
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  if (envService.isProduction()) return null;

  return (
    <button
      onClick={isRunning ? stop : start}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 mx-3 mb-2 text-xs font-medium transition-colors ${
        isRunning
          ? 'bg-red/10 text-red dark:bg-red/20 dark:text-red'
          : 'bg-gray-5 text-gray-60 hover:bg-gray-10 dark:bg-gray-80 dark:text-gray-30 dark:hover:bg-gray-70'
      }`}
      title="Flood requests to trigger 429 rate limiting"
    >
      <Lightning size={16} weight={isRunning ? 'fill' : 'regular'} />
      {isRunning ? `Stop (${totalSent} sent)` : totalSent > 0 ? `429 Test (${totalSent} sent)` : '429 Flood Test'}
    </button>
  );
};

export default RateLimitThrottler;
