export class QueueUtilsService {
  public static readonly instance: QueueUtilsService = new QueueUtilsService();

  public readonly getConcurrencyUsingPerformance = (currentConcurrency: number, maxConcurrency: number): number => {
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
}
