import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';

export async function fetchUsage(): Promise<UsageResponse & { photos: number }> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  const [driveUsage, { usage: photosUsage }] = await Promise.all([
    storageClient.spaceUsage(),
    photosClient.photos.getUsage(),
  ]);

  return { ...driveUsage, photos: photosUsage };
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsagePercent,
};

export default usageService;
