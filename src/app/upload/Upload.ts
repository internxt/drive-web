import { OwnerUserAuthenticationData } from 'app/network/types';
import { UploadedItem, UploadItem, UploadManagerEvents } from 'app/upload/types';
import { UploadManager, uploadManager, UploadRunOptions } from './UploadManager';
import { createFileItem, createFolderItem, getParentFolderUuid, getTopLevelItem, isFolderItem } from './uploadItemTree';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import { FileUploadTracker } from './tracker/FileUploadTracker';
import { FolderUploadTracker } from './tracker/FolderUploadTracker';
import { UploadTracker, UploadTrackerProps } from './tracker/UploadTracker';

interface UploadProps {
  destinationFolderUuid: string;
  roots: IRoot[];
  files: File[];
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  uploadRepository: PersistUploadRepository;
  onItemUploaded?: (uploadedItem: UploadedItem, parentFolderUuid: string, isFolder: boolean) => void;
  onItemRemoved?: (removedItem: UploadedItem, parentFolderUuid: string) => void;
  onStorageFull?: () => void;
  uploadManager?: UploadManager;
}

const createItemsToUpload = ({ roots, files, destinationFolderUuid }: UploadProps): UploadItem[] => [
  ...roots.map((root) => createFolderItem(root, destinationFolderUuid)),
  ...files.map((file) => createFileItem(file, destinationFolderUuid)),
];

export class Upload {
  private readonly props: UploadProps;
  private readonly trackers = new Map<UploadItem, UploadTracker>();
  private readonly manager: UploadManager;
  private readonly runOptions: UploadRunOptions;

  constructor(props: UploadProps) {
    this.props = props;
    this.manager = props.uploadManager ?? uploadManager;
    this.runOptions = {
      ownerUserAuthenticationData: props.ownerUserAuthenticationData,
      uploadRepository: props.uploadRepository,
      getPauseKey: (item) => this.getTrackerOf(item).taskId,
      events: this.createManagerEvents(),
    };

    for (const item of createItemsToUpload(props)) this.trackers.set(item, this.createTracker(item));
  }

  async run(): Promise<void> {
    const items = [...this.trackers.keys()];
    void this.manager.run(items, this.runOptions);
    await Promise.all([...this.trackers.values()].map((tracker) => tracker.whenFinished()));
  }

  private createTracker(item: UploadItem): UploadTracker {
    const trackerProps: UploadTrackerProps = {
      uploadRepository: this.props.uploadRepository,
      stop: () => this.cancel(item),
      retry: (pickedItem) => this.retry(item, pickedItem),
      onItemRemoved: this.props.onItemRemoved,
    };
    return isFolderItem(item) ? new FolderUploadTracker(item, trackerProps) : new FileUploadTracker(item, trackerProps);
  }

  private getTrackerOf(item: UploadItem): UploadTracker {
    return this.trackers.get(getTopLevelItem(item)) as UploadTracker;
  }

  private createManagerEvents(): UploadManagerEvents {
    return {
      onItemQueued: (item) => this.getTrackerOf(item).onQueued(),
      onItemStarted: (item) => this.getTrackerOf(item).onStarted(item),
      onItemProgress: (item, progress) => this.getTrackerOf(item).onProgress(item, progress),
      onItemSucceeded: (item, uploadedItem) => {
        this.getTrackerOf(item).onSucceeded(item, uploadedItem);
        this.props.onItemUploaded?.(uploadedItem, getParentFolderUuid(item), isFolderItem(item));
      },
      onItemFailed: (item, failure) => this.getTrackerOf(item).onFailed(item, failure),
      onItemCancelled: (item) => this.getTrackerOf(item).onCancelled(item),
      onStorageFull: () => this.props.onStorageFull?.(),
    };
  }

  private cancel(topLevelItem: UploadItem): void {
    this.getTrackerOf(topLevelItem).cancel();
    this.manager.cancelItem(topLevelItem);
  }

  private async retry(topLevelItem: UploadItem, pickedItem?: UploadItem): Promise<void> {
    const tracker = this.getTrackerOf(topLevelItem);
    const itemsToRetry = tracker.takeRetryable(pickedItem);
    const hasNothingToRetry = itemsToRetry.length === 0;
    if (hasNothingToRetry) return;

    this.manager.clearStorageFull(this.props.ownerUserAuthenticationData);
    void this.manager.run(itemsToRetry, this.runOptions);
    await tracker.whenFinished();
  }
}
