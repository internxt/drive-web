export interface ICacheStorage<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, size: number): void;
  delete(key: string): void;
  has(key: string): Promise<boolean>;
  getSize(key: string): Promise<number>;
  updateLRUState(lruState: LRUCacheStruture): void;
}

export type LRUCacheStruture = { lruKeyList: string[]; itemsListSize: number };

export class LRUCache<T> {
  private readonly cache: ICacheStorage<T>;
  private readonly lruList: string[];
  private readonly size: number;
  private currentSize: number;

  constructor(cache: ICacheStorage<T>, size: number, lRUCacheStruture?: LRUCacheStruture) {
    this.cache = cache;
    this.lruList = lRUCacheStruture?.lruKeyList ?? [];
    this.size = size;
    this.currentSize = lRUCacheStruture?.itemsListSize ?? 0;
  }

  async get(key: string): Promise<T | undefined> {
    const existsInCache = await this.cache.has(key);
    if (!existsInCache) {
      return undefined;
    }

    this.updateLRU(key);
    return this.cache.get(key);
  }

  async set(key: string, value: T, size: number): Promise<void> {
    if (size < this.size) {
      const existsItem = await this.cache.has(key);

      if (existsItem) {
        this.updateLRU(key);
        return;
      }

      await this.evictEntriesIfNeeded(size);

      this.lruList.push(key);
      this.currentSize += size;
      this.cache.set(key, value, size);
      this.persistState();
    }
  }

  /**
   * Attempts to evict the next entry from the LRU list
   * @param hasReconciled - Whether state reconciliation has already occurred
   * @returns Object indicating if eviction succeeded and if reconciliation was performed
   */
  private async tryEvictNext(hasReconciled: boolean): Promise<{ evicted: boolean; reconciled: boolean }> {
    const evictedKey = this.lruList.shift();

    if (evictedKey === undefined) {
      if (!hasReconciled) {
        await this.reconcileState();
        return { evicted: false, reconciled: true };
      }
      return { evicted: false, reconciled: hasReconciled };
    }

    const isCached = await this.cache.has(evictedKey);

    if (!isCached) {
      if (hasReconciled) {
        return { evicted: false, reconciled: hasReconciled };
      }
      await this.reconcileState();
      return { evicted: false, reconciled: true };
    }

    const evictedSize = await this.cache.getSize(evictedKey);
    this.currentSize = Math.max(0, this.currentSize - evictedSize);
    this.cache.delete(evictedKey);

    return { evicted: true, reconciled: hasReconciled };
  }

  private async evictEntriesIfNeeded(requiredSize: number): Promise<void> {
    let hasReconciled = false;
    let hasEvicted = false;

    while (this.currentSize + requiredSize > this.size) {
      if (!this.lruList.length) {
        if (hasReconciled) {
          break;
        }
        await this.reconcileState();
        hasReconciled = true;
        if (!this.lruList.length) {
          break;
        }
      }

      const result = await this.tryEvictNext(hasReconciled);
      hasReconciled = result.reconciled;
      if (result.evicted) {
        hasEvicted = true;
      }
    }

    if (hasEvicted) {
      this.persistState();
    }
  }

  async delete(key: string, size: number): Promise<void> {
    const existsInCache = await this.cache.has(key);
    if (!existsInCache) {
      return;
    }

    const keyIndex = this.lruList.indexOf(key);
    if (keyIndex > -1) {
      this.lruList.splice(keyIndex, 1);
    }

    this.currentSize -= size;
    this.cache.delete(key);
    this.persistState();
  }

  private updateLRU(key: string) {
    const index = this.lruList.indexOf(key);
    if (index > -1) {
      this.lruList.splice(index, 1);
    }
    this.lruList.push(key);
    this.persistState();
  }

  private persistState(): void {
    this.cache.updateLRUState({
      lruKeyList: this.lruList.slice(),
      itemsListSize: this.currentSize,
    });
  }

  /**
   * Validates a cached key and returns its metadata if it exists
   * @param cachedKey - The key to validate
   * @returns Object with key and size if valid, null otherwise
   */
  private async validateCachedKey(cachedKey: string): Promise<{ key: string; size: number } | null> {
    const exists = await this.cache.has(cachedKey);
    if (!exists) {
      return null;
    }
    const cachedSize = await this.cache.getSize(cachedKey);
    return { key: cachedKey, size: cachedSize };
  }

  private async reconcileState(): Promise<void> {
    if (!this.lruList.length && this.currentSize === 0) {
      this.persistState();
      return;
    }

    const results = await Promise.all(this.lruList.map((cachedKey) => this.validateCachedKey(cachedKey)));

    const validKeys: string[] = [];
    let computedSize = 0;

    for (const result of results) {
      if (result) {
        validKeys.push(result.key);
        computedSize += result.size;
      }
    }

    this.lruList.length = 0;
    this.lruList.push(...validKeys);
    this.currentSize = computedSize;
    this.persistState();
  }
}
