import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from '../../core/services/http.service';
import { aes } from '@internxt/lib';
import {
  ListAllSharedFoldersResponse,
  ListPrivateSharedFoldersResponse,
  ListShareLinksItem,
  PrivateSharedFolder,
  ShareDomainsResponse,
  ShareFolderWithUserPayload,
  UpdateUserRolePayload,
  ListSharedItemsResponse,
  AcceptInvitationToSharedFolderPayload,
  SharingInvite,
  UpdateUserRoleResponse,
} from '@internxt/sdk/dist/drive/share/types';
import { domainManager } from './DomainManager';
import _ from 'lodash';
import { binaryStreamToBlob } from '../../core/services/stream.service';
import downloadService from '../../drive/services/download.service';
import network from '../../network';
import { decryptMessageWithPrivateKey } from '../../crypto/services/pgp.service';
import localStorageService from '../../core/services/local-storage.service';
import { downloadItemsAsZipThunk } from '../../store/slices/storage/storage.thunks/downloadItemsThunk';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { t } from 'i18next';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { Iterator } from '../../core/collections';
import { createFilesIterator, createFoldersIterator } from '../../drive/services/folder.service';
import { Role } from 'app/store/slices/sharedLinks/types';

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
  const domainList =
    domainManager.getDomainsList().length > 0 ? domainManager.getDomainsList() : [window.location.origin];
  const shareDomain = _.sample(domainList);

  if (share.created) {
    return `${shareDomain}/sh/${type}/${share.token}/${plainCode}`;
  } else {
    return `${shareDomain}/sh/${type}/${share.token}/${aes.decrypt((share as any).encryptedCode, mnemonic)}`;
  }
}

export function buildLinkFromShare(mnemonic: string, share: ListShareLinksItem & { code: string }): string {
  const domainList =
    domainManager.getDomainsList().length > 0 ? domainManager.getDomainsList() : [window.location.origin];
  const shareDomain = _.sample(domainList);
  const plainCode = aes.decrypt(share.code, mnemonic);

  return `${shareDomain}/sh/${share.isFolder ? 'folder' : 'file'}/${share.token}/${plainCode}`;
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

export function getReceivedSharedFolders(
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListPrivateSharedFoldersResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getReceivedSharedFolders(page, perPage, orderBy).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSentSharedFolders(
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListPrivateSharedFoldersResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSentSharedFolders(page, perPage, orderBy).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getAllSharedFolders(
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListAllSharedFoldersResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getAllSharedFolders(page, perPage, orderBy).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFolderContent(
  sharedFolderId: string,
  type: 'folders' | 'files',
  invitedToken: string | null,
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListSharedItemsResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient
    .getSharedFolderContent(sharedFolderId, type, invitedToken, page, perPage, orderBy)
    .catch((error) => {
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

export function getShareDomains(): Promise<ShareDomainsResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareDomains().catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharingRoles(): Promise<Role[]> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharingRoles().catch((error) => {
    throw errorService.castError(error);
  });
}

export function inviteUserToSharedFolder(props: ShareFolderWithUserPayload): Promise<SharingInvite> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.inviteUserToSharedFolder({ ...props, encryptionAlgorithm: 'ed25519' }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFolderInvitations({
  itemType,
  itemId,
}: {
  itemType: 'folder';
  itemId: string;
}): Promise<any[]> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharedFolderInvitations({ itemType, itemId }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFolderInvitationsAsInvitedUser({
  limit = 10,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}): Promise<{ invites: any }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharedFolderInvitationsAsInvitedUser({ limit, offset }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function acceptSharedFolderInvite({
  invitationId,
  acceptInvite,
}: {
  invitationId: string;
  acceptInvite?: AcceptInvitationToSharedFolderPayload;
}): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.acceptSharedFolderInvite({ invitationId, acceptInvite }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function updateUserRoleOfSharedFolder({
  newRoleId,
  folderUUID,
  roleId,
}: UpdateUserRolePayload): Promise<UpdateUserRoleResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient
    .updateUserRole({
      newRoleId,
      folderUUID,
      roleId,
    })
    .catch((error) => {
      throw errorService.castError(error);
    });
}

export function removeUserRole({
  itemType,
  itemId,
  userId,
}: {
  itemType: string;
  itemId: string;
  userId: string;
}): Promise<{ message: string }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.removeUserRole({ itemType, itemId, userId }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getPrivateSharedFolder(folderUUID: string): Promise<{ data: PrivateSharedFolder }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getPrivateSharedFolder(folderUUID).catch((error) => {
    throw errorService.castError(error);
  });
}

export function stopSharingItem(itemType: string, itemId: string): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.stopSharingFolder(itemType, itemId);
}

interface SharedDirectoryFoldersPayload {
  token: string;
  directoryId: number;
  parentId: number;
  offset: number;
  limit: number;
  password?: string;
}

interface SharedDirectoryFilesPayload {
  token: string;
  directoryId: number;
  parentId: number;
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
    parentId: payload.parentId,
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
    parentId: payload.parentId,
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

const getFormatFileName = (info): string => {
  const hasType = info?.type !== null;
  const extension = hasType ? `.${info?.type}` : '';
  return `${info.name}${extension}`;
};

class DirectoryFilesIterator implements Iterator<DriveFileData> {
  private page: number;
  private perPage: number;
  private readonly queryValues: { directoryUuid: string; token: string };

  constructor(queryValues: { directoryUuid: string; token: string }, page?: number, perPage?: number) {
    this.page = page || 0;
    this.perPage = perPage || 5;
    this.queryValues = queryValues;
  }

  async next() {
    const { items, token, credentials } = await httpService.get<ListSharedItemsResponse>(
      `private-sharing/items/${this.queryValues.directoryUuid}/files?token=${this.queryValues.token}&page=${this.page}&perPage=${this.perPage}`,
    );

    return { value: items as unknown as DriveFileData[], done: items.length === 0 };
  }
}

class DirectorySharedFoldersIterator implements Iterator<DriveFileData> {
  private page: number;
  private perPage: number;
  private readonly queryValues: { directoryUuid: string; token: string };

  constructor(queryValues: { directoryUuid: string; token: string }, page?: number, perPage?: number) {
    this.page = page || 0;
    this.perPage = perPage || 5;
    this.queryValues = queryValues;
  }

  async next() {
    const { items, token, credentials } = await httpService.get<ListSharedItemsResponse>(
      `private-sharing/items/${this.queryValues.directoryUuid}/files?token=${this.queryValues.token}&page=${this.page}&perPage=${this.perPage}`,
    );

    return { value: items as unknown as DriveFileData[], done: items.length === 0 };
  }
}

// const createFoldersIterator = (directoryUuid: string, token: string) => {
//   return new DirectorySharedFoldersIterator({ directoryUuid, token }, 0, 20);
// };

export const decryptMnemonic = async (encryptionKey: string): Promise<string | undefined> => {
  const user = localStorageService.getUser();
  if (user) {
    let decryptedKey;
    try {
      decryptedKey = await decryptMessageWithPrivateKey({
        encryptedMessage: atob(encryptionKey),
        privateKeyInBase64: user.privateKey,
      });
    } catch (err) {
      decryptedKey = user.mnemonic;
    }
    return decryptedKey;
  } else {
    const error = errorService.castError('User Not Found');
    errorService.reportError(error);

    notificationsService.show({
      text: t('error.decryptMnemonic', { message: error.message }),
      type: ToastType.Error,
    });
  }
};

export async function downloadSharedFiles({
  creds,
  encryptionKey,
  selectedItems,
  dispatch,
  token,
}: {
  creds: { user: string; pass: string };
  encryptionKey: string;
  selectedItems: any[];
  dispatch: any;
  token: string;
}): Promise<void> {
  const decryptedKey = await decryptMnemonic(encryptionKey);

  if (selectedItems.length === 1 && !selectedItems[0].isFolder) {
    try {
      const readable = await network.downloadFile({
        bucketId: selectedItems[0].bucket,
        fileId: selectedItems[0].fileId,
        creds: {
          pass: creds.pass,
          user: creds.user,
        },
        mnemonic: decryptedKey, // DECRYPTED
      });

      const fileBlob = await binaryStreamToBlob(readable);

      return downloadService.downloadFileFromBlob(fileBlob, getFormatFileName(selectedItems[0]));
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      const itemError = selectedItems.length > 1 ? 'downloadingFiles' : 'downloadingFile';

      notificationsService.show({
        text: t(`error.${itemError}`, { message: error.message }),
        type: ToastType.Error,
      });
    }
  } else {
    dispatch(
      downloadItemsAsZipThunk({
        items: selectedItems,
        credentials: creds,
        mnemonic: decryptedKey as string,
        fileIterator: createFilesIterator,
        folderIterator: createFoldersIterator,
      }),
    );
  }
}

const shareService = {
  createShare,
  createShareLink,
  updateShareLink,
  deleteShareLink,
  getSharedFileInfo,
  getSharedFolderInvitations,
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getSentSharedFolders,
  getReceivedSharedFolders,
  getAllSharedFolders,
  getLinkFromShare,
  getAllShareLinks,
  buildLinkFromShare,
  incrementShareView,
  getShareDomains,
  getPrivateSharedFolder,
  stopSharingItem,
  removeUserRole,
  getSharedFolderContent,
  downloadSharedFiles,
};

export default shareService;
