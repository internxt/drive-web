import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';

export interface UsageDetailsProps {
  drive: number;
  photos: number;
  backups: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  const [driveUsage, { usage: photosUsage }] = await Promise.all([
    storageClient.spaceUsage(),
    photosClient.photos.getUsage(),
  ]);

  driveUsage.total += photosUsage;

  return driveUsage;
}

async function getUsageDetails(): Promise<UsageDetailsProps> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  const [{ drive, backups, total }, { usage: photosUsage }] = await Promise.all([
    storageClient.spaceUsage(),
    photosClient.photos.getUsage(),
  ]);

  return {
    drive,
    photos: photosUsage,
    backups,
  };
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsageDetails,
  getUsagePercent,
};

export default usageService;
