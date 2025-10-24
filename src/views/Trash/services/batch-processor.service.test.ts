import { describe, it, expect, vi } from 'vitest';
import { processBatchConcurrently } from './batch-processor.service';

describe('processBatchConcurrently', () => {
  it('should process items in batches with concurrent limit', async () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processBatchConcurrently({
      items,
      batchSize: 10,
      maxConcurrentBatches: 2,
      processor,
    });

    expect(processor).toHaveBeenCalledTimes(3);
    expect(processor).toHaveBeenNthCalledWith(1, items.slice(0, 10));
    expect(processor).toHaveBeenNthCalledWith(2, items.slice(10, 20));
    expect(processor).toHaveBeenNthCalledWith(3, items.slice(20, 25));
  });
});
