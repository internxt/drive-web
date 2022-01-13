import { UsageResponse } from '@internxt/sdk/src/drive/storage/types';
import { createStorageClient } from '../../../factory/modules';

export async function fetchUsage(): Promise<UsageResponse> {
  return createStorageClient().spaceUsage();
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsagePercent,
};

export default usageService;
