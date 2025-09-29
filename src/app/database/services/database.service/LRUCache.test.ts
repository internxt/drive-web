import { describe, expect, it, vi } from 'vitest';
import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';

type CacheEntry<T> = { value: T; size: number };

class InMemoryCache<T> implements ICacheStorage<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  readonly updateLRUState = vi.fn<(state: LRUCacheStruture) => void>();

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key)?.value;
  }

  set(key: string, value: T, size: number): void {
    this.store.set(key, { value, size });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async getSize(key: string): Promise<number> {
    return this.store.get(key)?.size ?? 0;
  }
}

describe('LRUCache', () => {
  it('recovers from stale LRU metadata when underlying entries are missing', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 50, { lruKeyList: ['stale-entry'], itemsListSize: 25 });

    // Add entry that triggers eviction (25 + 30 > 50), forcing reconciliation
    await lru.set('fresh-entry', { id: 'fresh-entry' }, 30);

    expect(cache.updateLRUState).toHaveBeenCalled();

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState).toEqual({ lruKeyList: ['fresh-entry'], itemsListSize: 30 });
  });
});
