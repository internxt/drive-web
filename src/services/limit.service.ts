import httpService from './http.service';

import { bytesToString } from './size.service';

export interface FetchLimitResponse {
  maxSpaceBytes: number;
}

export const INFINITE_LIMIT = 108851651149824;

async function fetchLimit(): Promise<number> {
  const response = await httpService.get<FetchLimitResponse>('/api/limit');

  return response.maxSpaceBytes;
}

const formatLimit = (limit: number): string => {
  let result = '...';

  if (limit > 0) {
    result = limit < INFINITE_LIMIT ? bytesToString(limit) : '\u221E';
  }

  return result;
};

const limitService = {
  fetchLimit,
  formatLimit,
};

export default limitService;
