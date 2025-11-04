import { bytesToString } from './size.service';
import { SdkFactory } from 'app/core/factory/sdk';
import { HUNDRED_TB } from 'app/core/constants';

async function fetchLimit(): Promise<number> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.spaceLimitV2().then((response) => {
    return response.maxSpaceBytes;
  });
}

const formatLimit = (limit: number): string => {
  let result = '...';

  if (limit > 0) {
    result = limit > HUNDRED_TB ? '\u221E' : bytesToString(limit);
  }

  return result;
};

const limitService = {
  fetchLimit,
  formatLimit,
};

export default limitService;
