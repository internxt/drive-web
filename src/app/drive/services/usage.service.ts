import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';

export async function fetchUsage(): Promise<UsageResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  return storageClient.spaceUsage();
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsagePercent,
};

export default usageService;
