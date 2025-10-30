export async function processBatchConcurrently<T>({
  items,
  batchSize,
  maxConcurrentBatches,
  processor,
}: {
  items: T[];
  batchSize: number;
  maxConcurrentBatches: number;
  processor: (batch: T[]) => Promise<unknown>;
}): Promise<void> {
  const promises: Promise<unknown>[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const promise = processor(batch);
    promises.push(promise);

    if (promises.length === maxConcurrentBatches) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
