import { getHeaders } from '../lib/auth';

function fetchLimit(isTeam: boolean): Promise<number> {
  return fetch('/api/limit', {
    method: 'get',
    headers: getHeaders(true, false, isTeam)
  }).then(res => {
    if (res.status !== 200) {
      throw res;
    }
    return res.json();
  }).then(res1 => {
    return res1.maxSpaceBytes;
  }).catch(error => {
    throw error;
  });
}

const limitService = {
  fetchLimit
};

export default limitService;