import { sha256 } from '@internxt/inxt-js/build/lib/utils/crypto';
import axios, { AxiosBasicCredentials, AxiosRequestConfig } from 'axios';
import { encryptFilename, generateHMAC } from './crypto';

const networkApiUrl = process.env.REACT_APP_STORJ_BRIDGE;

interface NetworkCredentials {
  user: string;
  pass: string;
}

interface ShardMeta {
  hash: string;
  size: number;
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
}

interface Contract {
  hash: string;
  token: string;
  operation: 'PUSH';
  url: string;
}

type FrameId = string;

interface Frame {
  id: FrameId;
  user: string;
  shards: [];
  storageSize: number;
  size: number;
  locked: boolean;
  created: string;
}

interface CreateEntryFromFramePayload {
  frame: string;
  filename: string;
  index: string;
  hmac: {
    type: string;
    value: string;
  };
  erasure?: {
    type: string;
  };
}

interface BucketEntry {
  id: string;
  index: string;
  frame: FrameId;
  bucket: string;
  mimetype: string;
  name: string;
  renewal: string;
  created: string;
  hmac: {
    value: string;
    type: string;
  };
  erasure: {
    type: string;
  };
  size: number;
}

function getAuthFromCredentials(creds: NetworkCredentials): AxiosBasicCredentials {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

export function checkBucketExistence(bucketId: string, creds: NetworkCredentials): Promise<boolean> {
  const options: AxiosRequestConfig = {
    method: 'GET',
    auth: getAuthFromCredentials(creds),
    url: `${networkApiUrl}/buckets/${bucketId}`,
  };

  return axios.request<any>(options).then(() => {
    // If no error -> Bucket exists
    return true;
  });
}

export function createFrame(creds: NetworkCredentials): Promise<Frame> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: getAuthFromCredentials(creds),
    url: `${networkApiUrl}/frames`,
  };

  return axios.request<Frame>(options).then((res) => {
    return res.data;
  });
}

export function addShardToFrame(frameId: string, body: ShardMeta, creds: NetworkCredentials): Promise<Contract> {
  const options: AxiosRequestConfig = {
    method: 'PUT',
    auth: getAuthFromCredentials(creds),
    data: { ...body, challenges: body.challenges_as_str },
    url: `${networkApiUrl}/frames/${frameId}`,
  };

  return axios.request<Contract>(options).then((res) => {
    return res.data;
  });
}

export function createEntryFromFrame(
  bucketId: string,
  body: CreateEntryFromFramePayload,
  creds: NetworkCredentials,
): Promise<BucketEntry> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: getAuthFromCredentials(creds),
    data: body,
    url: `${networkApiUrl}/buckets/${bucketId}/files`,
  };

  return axios.request<BucketEntry>(options).then((res) => {
    return res.data;
  });
}

export async function prepareUpload(bucketId: string, creds: NetworkCredentials): Promise<FrameId> {
  const exists = await checkBucketExistence(bucketId, creds);

  if (!exists) {
    throw new Error('Upload error: Code 1');
  }

  const frame = await createFrame(creds);
  return frame.id;
}

export async function getUploadUrl(
  frameId: string,
  shardMeta: Omit<ShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>,
  creds: NetworkCredentials,
): Promise<string> {
  const { url } = await addShardToFrame(
    frameId,
    {
      ...shardMeta,
      // Legacy from storj required right now.
      tree: [
        '0000000000000000000000000000000000000000',
        '0000000000000000000000000000000000000000',
        '0000000000000000000000000000000000000000',
        '0000000000000000000000000000000000000000',
      ],
      challenges: [
        Buffer.from('00000000000000000000000000000000', 'hex'),
        Buffer.from('00000000000000000000000000000000', 'hex'),
        Buffer.from('00000000000000000000000000000000', 'hex'),
        Buffer.from('00000000000000000000000000000000', 'hex'),
      ],
      challenges_as_str: [
        '00000000000000000000000000000000',
        '00000000000000000000000000000000',
        '00000000000000000000000000000000',
        '00000000000000000000000000000000',
      ],
    },
    creds,
  );

  return url;
}

export async function finishUpload(
  mnemonic: string,
  bucketId: string,
  frameId: string,
  filename: string,
  index: Buffer,
  encryptionKey: Buffer,
  shardMeta: ShardMeta,
  creds: NetworkCredentials,
): Promise<string> {
  const payload: CreateEntryFromFramePayload = {
    frame: frameId,
    filename: await encryptFilename(mnemonic, bucketId, filename),
    index: index.toString('hex'),
    hmac: {
      type: 'sha512',
      value: generateHMAC([shardMeta], encryptionKey).toString('hex'),
    },
  };

  const bucketEntry = await createEntryFromFrame(bucketId, payload, creds);

  return bucketEntry.id;
}
