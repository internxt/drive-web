import axios, { AxiosResponse } from 'axios';

import { bytesToString } from './size.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  const response: AxiosResponse<UsageResponse> = await axios.get('/api/usage');

  return response.data;
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