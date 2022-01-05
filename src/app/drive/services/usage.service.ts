import { UsageResponse } from '@internxt/sdk/src/drive/users/types';
import { createUsersClient } from '../../../factory/modules';

export async function fetchUsage(): Promise<UsageResponse> {
  return createUsersClient().spaceUsage();
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsagePercent,
};

export default usageService;
