import errorService from '../core/services/error.service';
import axios, { AxiosBasicCredentials, AxiosRequestConfig } from 'axios';
import { encryptFilename, generateHMAC } from './crypto';
import { getSha256 } from '../crypto/services/utils';

// TODO: Make this injectable
const networkApiUrl = process.env.REACT_APP_STORJ_BRIDGE;

interface FileInfo {
  bucket: string;
  mimetype: string;
  filename: string;
  frame: string;
  size: number;
  id: string;
  created: Date;
  hmac: {
    value: string;
    type: string;
  };
  erasure?: {
    type: string;
  };
  index: string;
}

export interface Mirror {
  index: number;
  replaceCount: number;
  hash: string;
  size: number;
  parity: boolean;
  token: string;
  healthy?: boolean;
  farmer: {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: Date;
  };
  url: string;
  operation: string;
}

interface NetworkCredentials {
  user: string;
  pass: string;
}

async function getAuthFromCredentials(creds: NetworkCredentials): Promise<AxiosBasicCredentials> {
  return {
    username: creds.user,
    password: await getSha256(creds.pass),
  };
}

function getFileInfo(bucketId: string, fileId: string, opts?: AxiosRequestConfig): Promise<FileInfo> {
  const defaultOpts: AxiosRequestConfig = {
    method: 'GET',
    url: `${networkApiUrl}/buckets/${bucketId}/files/${fileId}/info`,
    maxContentLength: Infinity,
  };

  return axios
    .request<FileInfo>({ ...defaultOpts, ...opts })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw errorService.castError(err);
    });
}

export function getFileInfoWithToken(bucketId: string, fileId: string, token: string): Promise<FileInfo> {
  return getFileInfo(bucketId, fileId, { headers: { 'x-token': token } });
}

export async function getFileInfoWithAuth(
  bucketId: string,
  fileId: string,
  creds: NetworkCredentials,
): Promise<FileInfo> {
  return getFileInfo(bucketId, fileId, { auth: await getAuthFromCredentials(creds) });
}

async function replaceMirror(
  bucketId: string,
  fileId: string,
  pointerIndex: number,
  excludeNodes: string[] = [],
  opts?: AxiosRequestConfig,
): Promise<Mirror> {
  let mirrorIsOk = false;
  let mirror: Mirror;

  while (!mirrorIsOk) {
    const [newMirror] = await getFileMirrors(bucketId, fileId, 1, pointerIndex, excludeNodes, opts);

    mirror = newMirror;
    mirrorIsOk =
      newMirror.farmer && newMirror.farmer.nodeID && newMirror.farmer.port && newMirror.farmer.address ? true : false;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mirror!;
}

function getFileMirrors(
  bucketId: string,
  fileId: string,
  limit: number | 3,
  skip: number | 0,
  excludeNodes: string[] = [],
  opts?: AxiosRequestConfig,
): Promise<Mirror[]> {
  const excludeNodeIds: string = excludeNodes.join(',');
  const path = `${networkApiUrl}/buckets/${bucketId}/files/${fileId}`;
  const queryParams = `?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`;

  const defaultOpts: AxiosRequestConfig = {
    responseType: 'json',
    url: path + queryParams,
  };

  return axios
    .request<Mirror[]>({ ...defaultOpts, ...opts })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw errorService.castError(err);
    });
}

export async function getMirrors(
  bucketId: string,
  fileId: string,
  creds: NetworkCredentials | null,
  token?: string,
): Promise<Mirror[]> {
  const mirrors: Mirror[] = [];
  const limit = 3;

  let results: Mirror[] = [];
  const requestConfig: AxiosRequestConfig = {
    auth: creds ? await getAuthFromCredentials(creds) : undefined,
    headers: token ? { 'x-token': token } : {},
  };

  do {
    results = (await getFileMirrors(bucketId, fileId, limit, mirrors.length, [], requestConfig))
      .filter((m) => !m.parity)
      .sort((mA, mB) => mA.index - mB.index);

    results.forEach((r) => {
      mirrors.push(r);
    });
  } while (results.length > 0);

  for (const mirror of mirrors) {
    const farmerIsOk = isFarmerOk(mirror.farmer);

    if (farmerIsOk) {
      mirror.farmer.address = mirror.farmer.address.trim();
    } else {
      mirrors[mirror.index] = await replaceMirror(bucketId, fileId, mirror.index, [], requestConfig);

      if (!isFarmerOk(mirrors[mirror.index].farmer)) {
        throw new Error('Missing pointer for shard %s' + mirror.hash);
      }

      if (!mirrors[mirror.index].url) {
        throw new Error('Missing download url for shard %s' + mirror.hash);
      }
    }
  }

  return mirrors;
}

function isFarmerOk(farmer?: Partial<Mirror['farmer']>) {
  return farmer && farmer.nodeID && farmer.port && farmer.address;
}

interface NetworkCredentials {
  user: string;
  pass: string;
}

interface LegacyShardMeta {
  hash: string;
  size: number;
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
}

export type ShardMeta = Omit<LegacyShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>;

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

export async function checkBucketExistence(bucketId: string, creds: NetworkCredentials): Promise<boolean> {
  const options: AxiosRequestConfig = {
    method: 'GET',
    auth: await getAuthFromCredentials(creds),
    url: `${networkApiUrl}/buckets/${bucketId}`,
  };

  return axios.request(options).then(() => {
    // If no error -> Bucket exists
    return true;
  });
}

export async function createFrame(creds: NetworkCredentials): Promise<Frame> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: await getAuthFromCredentials(creds),
    url: `${networkApiUrl}/frames`,
  };

  return axios.request<Frame>(options).then((res) => {
    return res.data;
  });
}

export async function addShardToFrame(
  frameId: string,
  body: LegacyShardMeta,
  creds: NetworkCredentials,
): Promise<Contract> {
  const options: AxiosRequestConfig = {
    method: 'PUT',
    auth: await getAuthFromCredentials(creds),
    data: { ...body, challenges: body.challenges_as_str },
    url: `${networkApiUrl}/frames/${frameId}`,
  };

  return axios.request<Contract>(options).then((res) => {
    return res.data;
  });
}

export async function createEntryFromFrame(
  bucketId: string,
  body: CreateEntryFromFramePayload,
  creds: NetworkCredentials,
): Promise<BucketEntry> {
  const options: AxiosRequestConfig = {
    method: 'POST',
    auth: await getAuthFromCredentials(creds),
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
  shardMeta: Omit<ShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>,
  creds: NetworkCredentials,
): Promise<string> {
  const payload: CreateEntryFromFramePayload = {
    frame: frameId,
    filename: await encryptFilename(mnemonic, bucketId, filename),
    index: index.toString('hex'),
    hmac: {
      type: 'sha512',
      value: await generateHMAC([shardMeta], encryptionKey),
    },
  };

  const bucketEntry = await createEntryFromFrame(bucketId, payload, creds);

  return bucketEntry.id;
}

export const CONNECTION_LOST_ERROR_MESSAGE = 'Connection lost';

export class ConnectionLostError extends Error {
  constructor() {
    super(CONNECTION_LOST_ERROR_MESSAGE);

    Object.setPrototypeOf(this, ConnectionLostError.prototype);
  }
}
