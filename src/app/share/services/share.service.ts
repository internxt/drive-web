import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from 'app/core/services/http.service';
import { aes } from '@internxt/lib';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';

interface CreateShareResponse {
  created: boolean;
  token: string;
}

export async function createShare(params: ShareTypes.GenerateShareLinkPayload): Promise<CreateShareResponse> {
  return await SdkFactory.getNewApiInstance().createShareClient().createShareLink(params);
}

export async function createShareLink(
  plainCode: string,
  mnemonic: string,
  params: ShareTypes.GenerateShareLinkPayload,
): Promise<string> {
  const share = await createShare(params);

  return getLinkFromShare(share, plainCode, mnemonic, params.type);
}

export function getLinkFromShare(
  share: CreateShareResponse,
  plainCode: string,
  mnemonic: string,
  type: string,
): string {
  if (share.created) {
    return `${window.location.origin}/sh/${type}/${share.token}/${plainCode}`;
  } else {
    return `${window.location.origin}/sh/${type}/${share.token}/${aes.decrypt((share as any).encryptedCode, mnemonic)}`;
  }
}

export function buildLinkFromShare(mnemonic: string, share: ListShareLinksItem & { code: string }): string {
  const plainCode = aes.decrypt(share.code, mnemonic);
  return `${window.location.origin}/sh/${share.isFolder ? 'folder' : 'file'}/${share.token}/${plainCode}`;
}

export function incrementShareView(token: string): Promise<{ incremented: boolean; token: string }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.incrementShareViewByToken(token).catch((error) => {
    throw errorService.castError(error);
  });
}

export function updateShareLink(params: ShareTypes.UpdateShareLinkPayload): Promise<ShareTypes.ShareLink> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.updateShareLink(params).catch((error) => {
    throw errorService.castError(error);
  });
}

export function deleteShareLink(shareId: string): Promise<{ deleted: boolean; shareId: string }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.deleteShareLink(shareId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFileInfo(token: string, code: string, password?: string): Promise<ShareTypes.ShareLink> {
  const newApiURL = SdkFactory.getNewApiInstance().getApiUrl();
  return httpService
    .get<ShareTypes.ShareLink>(newApiURL + '/storage/share/' + token + '?code=' + code, {
      headers: {
        'x-share-password': password,
      },
    })
    .catch((error) => {
      throw errorService.castError(error);
    });
}

export function getSharedFolderInfo(token: string, password?: string): Promise<ShareTypes.ShareLink> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLink(token, password).catch((error) => {
    throw errorService.castError(error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSharedFolderSize(shareId: string, folderId: string): Promise<any> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLinkFolderSize({ itemId: shareId, folderId }).catch((error) => {
    throw errorService.castError(error);
  });
}

interface SharedDirectoryFoldersPayload {
  token: string;
  directoryId: number;
  offset: number;
  limit: number;
  password?: string;
}

interface SharedDirectoryFilesPayload {
  token: string;
  directoryId: number;
  offset: number;
  limit: number;
  code: string;
  password?: string;
}

export function getSharedDirectoryFolders(
  payload: SharedDirectoryFoldersPayload,
): Promise<ShareTypes.SharedDirectoryFolders> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLinkDirectory({
    type: 'folder',
    token: payload.token,
    folderId: payload.directoryId,
    page: payload.offset / payload.limit,
    perPage: payload.limit,
    password: payload.password,
  });
}

export function getSharedDirectoryFiles(
  payload: SharedDirectoryFilesPayload,
): Promise<ShareTypes.SharedDirectoryFiles> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLinkDirectory({
    type: 'file',
    token: payload.token,
    code: payload.code,
    folderId: payload.directoryId,
    page: payload.offset / payload.limit,
    perPage: payload.limit,
    password: payload.password,
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getAllShareLinks(
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
) {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLinks(page, perPage, orderBy).catch((error) => {
    throw errorService.castError(error);
  });
}

const shareService = {
  createShare,
  createShareLink,
  updateShareLink,
  deleteShareLink,
  getSharedFileInfo,
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getLinkFromShare,
  getAllShareLinks,
  buildLinkFromShare,
  incrementShareView,
};

export default shareService;
