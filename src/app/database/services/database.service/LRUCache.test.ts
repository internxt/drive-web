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

  it('breaks eviction loop when lruList is empty after reconciliation', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 50, { lruKeyList: ['stale-1', 'stale-2'], itemsListSize: 60 });

    // Try to add entry that would need eviction, but all entries are stale
    await lru.set('new-entry', { id: 'new-entry' }, 40);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState).toEqual({ lruKeyList: ['new-entry'], itemsListSize: 40 });
  });

  it('handles eviction when shift returns undefined and reconciles once', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 100, { lruKeyList: [], itemsListSize: 0 });

    await lru.set('entry-1', { id: 'entry-1' }, 40);
    await lru.set('entry-2', { id: 'entry-2' }, 40);

    // Manually corrupt the lru list to make shift return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lruListRef = (lru as any).lruList as string[];
    lruListRef.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lru as any).currentSize = 80;

    await lru.set('entry-3', { id: 'entry-3' }, 30);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState?.lruKeyList).toEqual(['entry-3']);
    expect(lastState?.itemsListSize).toBe(30);
  });

  it('properly evicts entries and updates size', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 100);

    await lru.set('entry-1', { id: 'entry-1' }, 30);
    await lru.set('entry-2', { id: 'entry-2' }, 30);
    await lru.set('entry-3', { id: 'entry-3' }, 30);

    // This should evict entry-1 and entry-2 (30 + 30 + 30 + 50 = 140 > 100)
    await lru.set('entry-4', { id: 'entry-4' }, 50);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState?.lruKeyList).toEqual(['entry-3', 'entry-4']);
    expect(lastState?.itemsListSize).toBe(80);
    expect(await cache.has('entry-1')).toBe(false);
    expect(await cache.has('entry-2')).toBe(false);
  });

  it('reconciles state with mix of valid and invalid keys', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    cache.set('valid-1', { id: 'valid-1' }, 20);
    cache.set('valid-2', { id: 'valid-2' }, 15);

    const lru = new LRUCache(cache, 100, {
      lruKeyList: ['valid-1', 'stale-1', 'valid-2', 'stale-2'],
      itemsListSize: 100,
    });

    // Trigger reconciliation by adding entry that needs eviction
    await lru.set('new-entry', { id: 'new-entry' }, 70);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    // After reconciliation, valid-1 gets evicted (20 + 15 + 70 = 105 > 100)
    expect(lastState?.lruKeyList).toContain('valid-2');
    expect(lastState?.lruKeyList).toContain('new-entry');
    expect(lastState?.lruKeyList).not.toContain('stale-1');
    expect(lastState?.lruKeyList).not.toContain('stale-2');
  });

  it('reconciles empty state', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 100, { lruKeyList: [], itemsListSize: 0 });

    await lru.set('entry-1', { id: 'entry-1' }, 30);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState).toEqual({ lruKeyList: ['entry-1'], itemsListSize: 30 });
  });

  it('handles reconcileState early return when lruList is empty and currentSize is 0', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 50, { lruKeyList: ['non-existent'], itemsListSize: 30 });

    await lru.set('entry-1', { id: 'entry-1' }, 40);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState).toEqual({ lruKeyList: ['entry-1'], itemsListSize: 40 });
  });

  it('covers evictedKey undefined path and breaks after reconciliation', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 100);

    await lru.set('entry-1', { id: 'entry-1' }, 40);
    await lru.set('entry-2', { id: 'entry-2' }, 40);

    // Corrupt state: empty lruList but high currentSize forces eviction loop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lru as any).lruList.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lru as any).currentSize = 90;

    await lru.set('entry-3', { id: 'entry-3' }, 20);

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState?.lruKeyList).toEqual(['entry-3']);
    expect(lastState?.itemsListSize).toBe(20);
  });

  it('covers reconcileState early return (lines 112-114)', async () => {
    const cache = new InMemoryCache<{ id: string }>();
    const lru = new LRUCache(cache, 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (lru as any).reconcileState();

    const lastState = cache.updateLRUState.mock.calls.at(-1)?.[0];
    expect(lastState).toEqual({ lruKeyList: [], itemsListSize: 0 });
  });
});
