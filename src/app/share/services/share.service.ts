import httpService from '../../core/services/http.service';
import errorService from '../../core/services/error.service';

interface GenerateShareLinkResponse {
  token: string;
}

interface GenerateShareLinkRequestBody {
  isFolder: boolean;
  views: number;
  encryptionKey: string;
  fileToken: string;
  bucket: string;
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
  };
}

export function generateShareLink(fileId: string, params: GenerateShareLinkRequestBody): Promise<string> {
  return fetch(`${process.env.REACT_APP_API_URL}/api/storage/share/file/${fileId}`, {
    method: 'POST',
    headers: httpService.getHeaders(true, true),
    body: JSON.stringify(params),
  })
    .then((res) => {
      if (res.status === 401) throw new Error('unauthenticated');
      return res.json();
    })
    .then((res: GenerateShareLinkResponse) => {
      return `${window.location.origin}/${res.token}`;
    });
}

export function getShareInfo(token: string): Promise<GetShareInfoResponse> {
  try {
    return httpService.get(`${process.env.REACT_APP_API_URL}/api/storage/share/${token}`);
  } catch (err: unknown) {
    const castedError = errorService.castError(err);
    throw castedError;
  }
}

const shareService = {
  generateShareLink,
  getShareInfo,
};

export default shareService;
