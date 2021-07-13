import { getHeaders } from '../lib/auth';
import { UserSettings } from '../models/interfaces';
import localStorageService from './localStorage.service';

export interface UsageResponse {
  _id: string;
  total: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  const user: UserSettings = localStorageService.getUser();
  const response: Response = await fetch('/api/usage', { headers: getHeaders(true, false, user.teams) });

  return response.json();
}

const usageService = {
  fetchUsage
};

export default usageService;