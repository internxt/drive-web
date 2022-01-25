import { bytesToString } from './size.service';
import { createStorageClient } from '../../../factory/modules';

export const INFINITE_LIMIT = 108851651149824;

async function fetchLimit(): Promise<number> {
  return createStorageClient().spaceLimit()
    .then(response => {
      return response.maxSpaceBytes;
    });
}

const formatLimit = (limit: number): string => {
  let result = '...';

  if (limit > 0) {
    result = limit === INFINITE_LIMIT ? '\u221E' : bytesToString(limit);
  }

  return result;
};

const limitService = {
  fetchLimit,
  formatLimit,
};

export default limitService;
