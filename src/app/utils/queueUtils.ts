export class QueueUtilsService {
  public static readonly instance: QueueUtilsService = new QueueUtilsService();

  public readonly getConcurrencyUsingPerfomance = (currentConcurrency: number, maxConcurrency: number): number => {
    let newConcurrency = currentConcurrency;
    try {
      const memory = window?.performance?.memory;
      if (memory?.jsHeapSizeLimit != null && memory?.usedJSHeapSize != null) {
        const memoryUsagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        const shouldIncreaseConcurrency = memoryUsagePercentage < 0.7;
        const shouldReduceConcurrency = memoryUsagePercentage >= 0.8 && currentConcurrency > 1;

        if (shouldIncreaseConcurrency) {
          newConcurrency = Math.min(currentConcurrency + 1, maxConcurrency);
          if (newConcurrency !== currentConcurrency) {
            console.warn(`Memory usage under 70%. Increasing queue concurrency to ${newConcurrency}`);
          }
        } else if (shouldReduceConcurrency) {
          newConcurrency = Math.max(currentConcurrency - 1, 1);
          if (newConcurrency !== currentConcurrency) {
            console.warn('Memory usage reached 80%. Reducing folder upload concurrency.');
          }
        }
      } else {
        console.warn('Memory usage control is not available');
      }
    } catch {
      /* noop */
    }
    return newConcurrency;
  };

  /**
   * This function is used to calculate the chunk size and concurrency based on the file size when downloading a file (multipart download)
   * @param fileSize - The file size in bytes
   * @returns An object containing the chunk size and concurrency
   */
  calculateChunkSizeAndConcurrency(fileSize: number) {
    const MAX_CHUNK_SIZE = 100 * 1024 * 1024;
    const OPTIMAL_CHUNK_SIZE = 25 * 1024 * 1024;

    let concurrency: number;
    let chunkSize: number;

    if (fileSize < 100 * 1024 * 1024) {
      concurrency = 1;
      chunkSize = fileSize;
    } else if (fileSize < 500 * 1024 * 1024) {
      concurrency = 6;
      chunkSize = Math.max(OPTIMAL_CHUNK_SIZE, Math.floor(fileSize / concurrency));
    } else if (fileSize <= 2 * 1024 * 1024 * 1024) {
      concurrency = 10;
      chunkSize = MAX_CHUNK_SIZE;
    } else {
      concurrency = 16;
      chunkSize = MAX_CHUNK_SIZE;
    }

    const numChunks = Math.ceil(fileSize / chunkSize);
    chunkSize = Math.ceil(fileSize / numChunks);

    console.log(
      `[CALC] FileSize: ${(fileSize / 1024 / 1024).toFixed(2)}MB, Chunks: ${numChunks}, ChunkSize: ${(chunkSize / 1024 / 1024).toFixed(2)}MB, Concurrency: ${concurrency}`,
    );

    return { chunkSize, concurrency };
  }
}
