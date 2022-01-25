import { sha256 } from '@internxt/inxt-js/build/lib/utils/crypto';
import axios, { AxiosRequestConfig } from 'axios';

const networkApiUrl = process.env.REACT_APP_BRIDGE;

interface NetworkCredentials {
  user: string,
  pass: string
}

export function checkBucketExistence(bucketId: string, creds: NetworkCredentials): Promise<boolean> {
  const options: AxiosRequestConfig = {
    method: 'GET',
    auth: {
      username: creds.user,
      password: sha256(Buffer.from(creds.pass)).toString('hex')
    },
    url: `${networkApiUrl}/buckets/${bucketId}`
  };

  return axios.request<T>(options).then(() => {
    // If no error -> Bucket exists
    return true;
  });
}

export function createFrame(creds: NetworkCredentials): Promise<> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: {
      username: creds.user,
      password: sha256(Buffer.from(creds.pass)).toString('hex')
    },
    url: `${networkApiUrl}/frames`
  };

  return axios.request<T>(options);
}

export function addShardToFrame(frameId: string, body: any, creds: NetworkCredentials): Promise<> {
  const options: AxiosRequestConfig = {
    method: 'PUT',
    auth: {
      username: creds.user,
      password: sha256(Buffer.from(creds.pass)).toString('hex')
    },
    data: body,
    url: `${networkApiUrl}/frames/${frameId}`
  };

  return axios.request<T>(options);
}

export function createBucketEntry(
  bucketId: string,
  body: CreateEntryFromFrameBody,
  creds: NetworkCredentials
): Promise<> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: {
      username: creds.user,
      password: sha256(Buffer.from(creds.pass)).toString('hex')
    },
    data: body,
    url: `${networkApiUrl}/buckets/${bucketId}/files`
  };

  return axios.request<T>(options);
}

export async function prepareUpload(bucketId: string, creds: NetworkCredentials): Promise<any> {
  const exists = await checkBucketExistence(bucketId, creds);

  if (!exists) {
    throw new Error('Upload error: Code 1');
  }

  const frame = await createFrame(creds);
  return addShardToFrame(frame.id, null, creds);
}
