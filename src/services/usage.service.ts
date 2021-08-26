import { getHeaders } from '../lib/auth';
import { bytesToString } from './size.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(isTeam: boolean): Promise<UsageResponse> {
  const response: Response = await fetch(`${process.env.REACT_APP_API_URL}/api/usage`, { headers: getHeaders(true, false, isTeam) });

  return response.json();
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