import { getHeaders } from '../lib/auth';

export function getLimit() {
  return fetch('/api/limit', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then(res => {
    return res.json();
  }).then(res1 => {
    return res1.maxSpaceBytes;
  }).catch(err => {
    console.log('Error getting /api/limit for App', err);
  });
}