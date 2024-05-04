import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';

export interface UsageDetailsProps {
  drive: number;
  photos: number;
  backups: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  let photosUsage = 0;
  const driveUsage = await storageClient.spaceUsage();

  try {
    const { usage } = await photosClient.photos.getUsage();
    photosUsage = usage;
  } catch (error) {
    errorService.reportError(error);
  }

  driveUsage.total += photosUsage;

  return driveUsage;
}

async function getUsageDetails(): Promise<UsageDetailsProps> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  let drive = 0;
  let backups = 0;
  let photos = 0;

  try {
    const { drive: storageDrive, backups: storageBackups } = await storageClient.spaceUsage();
    drive = storageDrive;
    backups = storageBackups;
  } catch (error) {
    errorService.reportError(error);
  }

  try {
    const { usage } = await photosClient.photos.getUsage();
    photos = usage;
  } catch (error) {
    errorService.reportError(error);
  }

  return {
    drive,
    photos,
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
