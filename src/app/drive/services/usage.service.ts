import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { createStorageClient } from '../../core/factory/sdk';

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
