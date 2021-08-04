import { getHeaders } from '../lib/auth';
import { UserSettings } from '../models/interfaces';
import localStorageService from './localStorage.service';
import { bytesToString } from './size.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(isTeam: boolean): Promise<UsageResponse> {
  const response: Response = await fetch('/api/usage', { headers: getHeaders(true, false, isTeam) });

  return response.json();
}

export const putLimitUser = (limit: number): string => {
  if (limit > 0) {
    if (limit < 108851651149824) {
      return bytesToString(limit);
    } else if (limit >= 108851651149824) {
      return '\u221E';
    } else {
      return '...';
    }
  }
};

const usageService = {
  fetchUsage,
  putLimitUser
};

export default usageService;