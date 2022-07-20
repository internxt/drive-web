import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from 'app/core/services/http.service';

// export function generateShareFileLink(params: ShareTypes.GenerateShareFileLinkPayload, code: string): Promise<string> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.createShareFileLink(params).then((response) => {
//     return `${window.location.origin}/s/file/${response.token}/${code}`;
//   });
// }

export function generateShareLink(params: ShareTypes.GenerateShareLinkPayload): Promise<string> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.createShareLink(params).then((response) => {
    return `${window.location.origin}/s/folder/${response.token}/${params?.code ?? ''}`;
  });
}

export function getSharedFileInfo(token: string): Promise<ShareTypes.ShareLink> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLink(token).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFolderInfo(token: string): Promise<ShareTypes.ShareLink> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLink(token).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getSharedFolderSize(shareId: string, folderId: string): Promise<any> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLinkFolderSize({ itemId: shareId, folderId }).catch((error) => {
    throw errorService.castError(error);
  });
}
interface SharedDirectoryFoldersPayload {
  token: string;
  directoryId: number;
  offset: number;
  limit: number;
}

interface SharedDirectoryFilesPayload {
  token: string;
  directoryId: number;
  offset: number;
  limit: number;
  code: string;
}
export function getSharedDirectoryFolders(
  payload: SharedDirectoryFoldersPayload,
): Promise<ShareTypes.SharedDirectoryFolders> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLinkDirectory({
    type: 'folders',
    token: payload.token,
    folderId: payload.directoryId,
    page: payload.offset / payload.limit,
    perPage: payload.limit,
  });
}

export function getSharedDirectoryFiles(
  payload: SharedDirectoryFilesPayload,
): Promise<ShareTypes.SharedDirectoryFiles> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLinkDirectory({
    type: 'files',
    token: payload.token,
    code: payload.code,
    folderId: payload.directoryId,
    page: payload.offset / payload.limit,
    perPage: payload.limit,
  });
}

export function getAllShareLinks(page: number, perPage: number): Promise<Array<Partial<ShareTypes.ShareLink>> | []> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareLinks(page, perPage).catch((error) => {
    throw errorService.castError(error);
  });
}

const shareService = {
  generateShareLink,
  getSharedFileInfo,
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getAllShareLinks,
};

export default shareService;
