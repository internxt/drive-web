import { UsageResponseV2 } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';

export interface UsageDetailsProps {
  drive: number;
  photos: number;
  backups: number;
}

export async function fetchUsage(): Promise<UsageResponseV2> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const driveUsage = await storageClient.spaceUsageV2();

  return driveUsage;
}

async function getUsageDetails(): Promise<UsageDetailsProps> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  let drive = 0;
  let backups = 0;

  try {
    const { drive: storageDrive, backups: storageBackups } = await storageClient.spaceUsageV2();
    drive = storageDrive;
    backups = storageBackups;
  } catch (error) {
    errorService.reportError(error);
  }

  return {
    drive,
    photos: 0,
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
