import { getHeaders } from '../lib/auth';

export async function getTokenInfo() {

  return fetch('/api/token/info', {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => res.json());
}