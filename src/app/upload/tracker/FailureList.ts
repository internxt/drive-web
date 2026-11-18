import { FailedUploadItem } from 'app/tasks/types';
import { UploadItem } from '../types';
import { UploadFailure } from '../uploadFailure';
import { toFailedUploadItem } from '../failedUploadItem';

export class FailureList {
  private readonly failedItems = new Map<UploadItem, FailedUploadItem>();

  add(item: UploadItem, failure: UploadFailure, retry: () => Promise<void>): void {
    this.failedItems.set(item, toFailedUploadItem(item, failure, retry));
  }

  remove(item: UploadItem): boolean {
    return this.failedItems.delete(item);
  }

  isEmpty(): boolean {
    return this.failedItems.size === 0;
  }

  takeRetryable(pickedItem?: UploadItem): UploadItem[] {
    const retryableItems = [...this.failedItems]
      .filter(([, failedItem]) => failedItem.isRetryable && !failedItem.isRetrying)
      .filter(([item]) => !pickedItem || item === pickedItem)
      .map(([item]) => item);

    for (const item of retryableItems) {
      this.failedItems.set(item, { ...(this.failedItems.get(item) as FailedUploadItem), isRetrying: true });
    }
    return retryableItems;
  }

  toFailedItems(): FailedUploadItem[] {
    return [...this.failedItems.values()];
  }
}
