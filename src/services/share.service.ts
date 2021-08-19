import { getHeaders } from '../lib/auth';

interface GenerateShareLinkResponse {
  token: string
}

interface GenerateShareLinkRequestBody {
  isFolder: boolean,
  views: number,
  encryptionKey: string,
  fileToken: string,
  bucket: string
}

export interface GetShareInfoResponse {
  user: string;
  token: string;
  file: string;
  encryptionKey: string;
  mnemonic: string;
  isFolder: boolean;
  views: number;
  bucket: string;
  fileToken: string;
  fileMeta: {
    folderId: string;
    name: string;
    type: string;
    size: number;
  }
}

export function generateShareLink(fileId: string, params: GenerateShareLinkRequestBody): Promise<string> {
  return fetch(`/api/storage/share/file/${fileId}`, {
    method: 'POST',
    headers: getHeaders(true, true),
    body: JSON.stringify(params)
  }).then((res) => {
    return res.json();
  }).then((res: GenerateShareLinkResponse) => {
    return `${window.location.origin}/${res.token}`;
  });
}

export function getShareInfo(token: string): Promise<GetShareInfoResponse> {
  return fetch(`/api/storage/share/${token}`).then<GetShareInfoResponse>((res) => res.json());
}

const shareService = {
  generateShareLink,
  getShareInfo
};

export default shareService;