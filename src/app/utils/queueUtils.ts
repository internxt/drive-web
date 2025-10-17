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
  public readonly calculateChunkSizeAndConcurrency = (fileSize: number): { chunkSize: number; concurrency: number } => {
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);

    if (fileSizeGB <= 0.5) {
      return { chunkSize: 50 * 1024 * 1024, concurrency: 4 };
    } else if (fileSizeGB <= 2) {
      return { chunkSize: 25 * 1024 * 1024, concurrency: 4 };
    } else if (fileSizeGB <= 5) {
      return { chunkSize: 15 * 1024 * 1024, concurrency: 3 };
    } else if (fileSizeGB <= 10) {
      return { chunkSize: 10 * 1024 * 1024, concurrency: 3 };
    } else {
      return { chunkSize: 5 * 1024 * 1024, concurrency: 2 };
    }
  };
}
