import httpService from '../../core/services/http.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  return httpService.get('/api/usage');
}

function getUsagePercent(usage: number, limit: number): number {
  return Math.ceil((usage / limit) * 100);
}

const usageService = {
  fetchUsage,
  getUsagePercent,
};

export default usageService;
