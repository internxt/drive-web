import { sha256 } from '@internxt/inxt-js/build/lib/utils/crypto';
import errorService from 'app/core/services/error.service';
import axios, { AxiosBasicCredentials, AxiosRequestConfig } from 'axios';

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

function getAuthFromCredentials(creds: NetworkCredentials): AxiosBasicCredentials {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

function getFileInfo(
  bucketId: string,
  fileId: string,
  opts?: AxiosRequestConfig
): Promise<FileInfo> {
  const defaultOpts: AxiosRequestConfig = {
    method: 'GET',
    url: `${networkApiUrl}/buckets/${bucketId}/files/${fileId}/info`,
    maxContentLength: Infinity
  };

  console.log('AXIOS OPTS', { ...defaultOpts, ...opts });

  return axios.request<FileInfo>({ ...defaultOpts, ...opts }).then((res) => {
    return res.data;
  }).catch((err) => {
    throw errorService.castError(err);
  });
}

export function getFileInfoWithToken(bucketId: string, fileId: string, token: string): Promise<FileInfo> {
  return getFileInfo(bucketId, fileId, { headers: { 'x-token': token } });
}

export function getFileInfoWithAuth(bucketId: string, fileId: string, creds: NetworkCredentials): Promise<FileInfo> {
  return getFileInfo(bucketId, fileId, { auth: getAuthFromCredentials(creds) });
}

async function replaceMirror(
  bucketId: string,
  fileId: string,
  pointerIndex: number,
  excludeNodes: string[] = [],
  opts?: AxiosRequestConfig
): Promise<Mirror> {
  let mirrorIsOk = false;
  let mirror: Mirror;

  while (!mirrorIsOk) {
    const [newMirror] = await getFileMirrors(
      bucketId,
      fileId,
      1,
      pointerIndex,
      excludeNodes,
      opts
    );

    mirror = newMirror;
    mirrorIsOk = newMirror.farmer
      && newMirror.farmer.nodeID
      && newMirror.farmer.port
      && newMirror.farmer.address ? true : false;
  }

  return mirror!;
}

function getFileMirrors(
  bucketId: string,
  fileId: string,
  limit: number | 3,
  skip: number | 0,
  excludeNodes: string[] = [],
  opts?: AxiosRequestConfig
): Promise<Mirror[]> {
  const excludeNodeIds: string = excludeNodes.join(',');
  const path = `${networkApiUrl}/buckets/${bucketId}/files/${fileId}`;
  const queryParams = `?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`;

  const defaultOpts: AxiosRequestConfig = {
    responseType: 'json',
    url: path + queryParams
  };

  return axios.request<Mirror[]>({ ...defaultOpts, ...opts }).then((res) => {
    return res.data;
  }).catch((err) => {
    throw errorService.castError(err);
  });
}

export async function getMirrors(
  bucketId: string,
  fileId: string,
  creds: NetworkCredentials | null,
  token?: string
): Promise<Mirror[]> {
  const mirrors: Mirror[] = [];
  const limit = 3;

  let results: Mirror[] = [];
  const requestConfig: AxiosRequestConfig = {
    auth: creds ? getAuthFromCredentials(creds) : undefined,
    headers: token ? { 'x-token': token } : {},
  };

  do {
    results = (await getFileMirrors(
      bucketId,
      fileId,
      limit,
      mirrors.length,
      [],
      requestConfig
    ))
      .filter(m => !m.parity)
      .sort((mA, mB) => mA.index - mB.index);

    results.forEach(r => {
      mirrors.push(r);
    });
  } while (results.length > 0);

  for (const mirror of mirrors) {
    const farmerIsOk = isFarmerOk(mirror.farmer);

    if (farmerIsOk) {
      mirror.farmer.address = mirror.farmer.address.trim();
    } else {
      mirrors[mirror.index] = await replaceMirror(
        bucketId,
        fileId,
        mirror.index,
        [],
        requestConfig
      );

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