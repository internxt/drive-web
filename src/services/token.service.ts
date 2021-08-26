import { getHeaders } from '../lib/auth';

export async function getTokenInfo() {

  return fetch(`${process.env.REACT_APP_API_URL}/api/token/info`, {
    method: 'get',
    headers: getHeaders(true, false, false)
  }).then(res => {
    if (res.status !== 200) {
      throw res;
    }

    return res.json();
  });
}