import { getHeaders } from '../lib/auth';

/**
 * Calls drive API to get Storage limit of a client
 * @param {String} maxCalls - Max number of API calls that it can be made (Default 5 calls)
 *
 */
export function getLimit(maxCalls : number = 5) {
  return fetch('/api/limit', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then(res => {
    if (res.status !== 200) {
      throw res;
    }
    return res.json();
  }).then(res1 => {
    return res1.maxSpaceBytes;
  }).catch(err => {
    if (maxCalls > 0) {
      return getLimit(maxCalls - 1);
    }
    console.log('Error getting /api/limit for App', err);
  });
}