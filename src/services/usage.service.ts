import httpService from './http.service';

import { bytesToString } from './size.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  return httpService.get('/api/usage');
}

export const getUserLimitString = (limit: number): string => {
  let result = '...';

  if (limit > 0) {
    limit < 108851651149824 ?
      result = bytesToString(limit) :
      result = '\u221E';
  }

  return result;
};

const usageService = {
  fetchUsage,
  getUserLimitString
};

export default usageService;