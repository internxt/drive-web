import httpService from './http.service';

export interface FetchLimitResponse {
  maxSpaceBytes: number;
}

async function fetchLimit(): Promise<number> {
  const response = await httpService.get<FetchLimitResponse>('/api/limit');

  return response.maxSpaceBytes;
}

const limitService = {
  fetchLimit,
};

export default limitService;
