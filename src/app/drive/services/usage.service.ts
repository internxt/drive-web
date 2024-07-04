import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';

export interface UsageDetailsProps {
  drive: number;
  photos: number;
  backups: number;
}

export async function fetchUsage(workspaceUserId?: string): Promise<UsageResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  let photosUsage = 0;
  const driveUsage = await storageClient.spaceUsage(workspaceUserId);

  try {
    const { usage } = await photosClient.photos.getUsage(workspaceUserId);
    photosUsage = usage;
  } catch (error) {
    errorService.reportError(error);
  }

  driveUsage.total += photosUsage;

  return driveUsage;
}

async function getUsageDetails(workspaceUserId?: string): Promise<UsageDetailsProps> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const photosClient = await SdkFactory.getInstance().createPhotosClient();

  let drive = 0;
  let backups = 0;
  let photos = 0;

  try {
    const { drive: storageDrive, backups: storageBackups } = await storageClient.spaceUsage(workspaceUserId);
    drive = storageDrive;
    backups = storageBackups;
  } catch (error) {
    errorService.reportError(error);
  }

  try {
    const { usage } = await photosClient.photos.getUsage(workspaceUserId);
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
