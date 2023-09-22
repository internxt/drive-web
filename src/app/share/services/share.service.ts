import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from '../../core/services/http.service';
import { aes } from '@internxt/lib';
import {
  ListAllSharedFoldersResponse,
  ListPrivateSharedFoldersResponse,
  ListShareLinksItem,
  ShareDomainsResponse,
  ShareFolderWithUserPayload,
  UpdateUserRolePayload,
  ListSharedItemsResponse,
  AcceptInvitationToSharedFolderPayload,
  SharingInvite,
  UpdateUserRoleResponse,
  SharedFolders,
  SharedFiles,
  SharedFoldersInvitationsAsInvitedUserResponse,
  CreateSharingPayload,
  SharingMeta,
} from '@internxt/sdk/dist/drive/share/types';
import { domainManager } from './DomainManager';
import _ from 'lodash';
import { decryptMessageWithPrivateKey } from '../../crypto/services/pgp.service';
import localStorageService from '../../core/services/local-storage.service';
import {
  downloadItemsAsZipThunk,
  downloadItemsThunk,
} from '../../store/slices/storage/storage.thunks/downloadItemsThunk';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { t } from 'i18next';
import { Iterator } from '../../core/collections';
import { Role } from 'app/store/slices/sharedLinks/types';
import folderService from 'app/drive/services/folder.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import crypto from 'crypto';
import copy from 'copy-to-clipboard';

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

export function getAllSharedFiles(
  page: number,
  perPage: number,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListAllSharedFoldersResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getAllSharedFiles(page, perPage, orderBy).catch((error) => {
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
      throw error;
    });
}

export function getPublicSharedFolderContent(
  sharedFolderId: string,
  type: 'folders' | 'files',
  token: string | null,
  page: number,
  perPage: number,
  code?: string,
  orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC',
): Promise<ListSharedItemsResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient
    .getPublicSharedFolderContent(sharedFolderId, type, token, page, perPage, code, orderBy)
    .catch((error) => {
      throw error;
    });
}

export function deleteShareLink(shareId: string): Promise<{ deleted: boolean; shareId: string }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.deleteShareLink(shareId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFileInfo(
  sharingId: string,
  code: string,
  password?: string,
): Promise<{
  id: string;
  itemId: string;
  itemType: string;
  ownerId: string;
  sharedWith: string;
  encryptionKey: string;
  encryptionAlgorithm: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  item: any;
  itemToken: string;
}> {
  const newApiURL = SdkFactory.getNewApiInstance().getApiUrl();
  return httpService
    .get<{
      id: string;
      itemId: string;
      itemType: string;
      ownerId: string;
      sharedWith: string;
      encryptionKey: string;
      encryptionAlgorithm: string;
      createdAt: string;
      updatedAt: string;
      type: string;
      item: ShareTypes.ShareLink['item'];
      itemToken: string;
    }>(newApiURL + '/sharings/' + sharingId + '/meta?code=' + code, {
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

export function getUsersOfSharedFolder({
  itemType,
  folderId,
}: {
  itemType: string;
  folderId: string;
}): Promise<Record<'users', any[]> | Record<'error', string>> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getAllAccessUsers({ itemType, folderId }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharedFolderInvitationsAsInvitedUser({
  limit = 10,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
}): Promise<{ invites: SharedFoldersInvitationsAsInvitedUserResponse[] }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharedFolderInvitationsAsInvitedUser({ limit, offset }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function declineSharedFolderInvite({
  invitationId,
  token,
}: {
  invitationId: string;
  token?: string;
}): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.declineSharedFolderInvite(invitationId, token).catch((error) => {
    throw errorService.castError(error);
  });
}

export function acceptSharedFolderInvite({
  invitationId,
  acceptInvite,
  token,
}: {
  invitationId: string;
  acceptInvite?: AcceptInvitationToSharedFolderPayload;
  token?: string;
}): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.acceptSharedFolderInvite({ invitationId, acceptInvite, token }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getUserRoleOfSharedRolder(sharingId: string): Promise<Role> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getUserRole(sharingId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function updateUserRoleOfSharedFolder({
  newRoleId,
  sharingId,
}: UpdateUserRolePayload): Promise<UpdateUserRoleResponse> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient
    .updateUserRole({
      newRoleId,
      sharingId,
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

export function stopSharingItem(itemType: string, itemId: string): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.stopSharingFolder(itemType, itemId);
}

export const getPublicShareLink = async (uuid: string, itemType: 'folder' | 'file'): Promise<void> => {
  const user = localStorageService.getUser() as UserSettings;
  const { mnemonic } = user;
  const code = crypto.randomBytes(32).toString('hex');

  const encryptedMnemonic = aes.encrypt(mnemonic, code);

  try {
    const publicSharingItemData = await shareService.createPublicSharingItem({
      encryptionAlgorithm: 'inxt-v2',
      encryptionKey: encryptedMnemonic,
      itemType,
      itemId: uuid,
    });
    const { id: sharingId } = publicSharingItemData;

    copy(`${process.env.REACT_APP_HOSTNAME}/sh/${itemType}/${sharingId}/${code}`);
    notificationsService.show({ text: t('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
  } catch (error) {
    notificationsService.show({
      text: t('modals.shareModal.errors.copy-to-clipboard'),
      type: ToastType.Error,
    });
  }
};

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

class DirectorySharedFolderIterator implements Iterator<SharedFolders> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string };

  constructor(queryValues: { directoryId: string; resourcesToken?: string }, page?: number, itemsPerPage?: number) {
    this.page = page || 0;
    this.itemsPerPage = itemsPerPage || 5;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken } = this.queryValues;
    const items = await getSharedFolderContent(
      directoryId,
      'folders',
      resourcesToken ?? '',
      this.page,
      this.itemsPerPage,
    );
    const folders = items.items.map((folder) => ({ ...folder, name: folder?.plainName ?? folder.name }));
    this.page += 1;

    const done = folders.length < this.itemsPerPage;

    return { value: folders as SharedFolders[], done: done, token: items.token };
  }
}

class DirectorySharedFilesIterator implements Iterator<SharedFiles> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string };

  constructor(queryValues: { directoryId: string; resourcesToken?: string }, page?: number, itemsPerPage?: number) {
    this.page = page || 0;
    this.itemsPerPage = itemsPerPage || 15;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken } = this.queryValues;

    const items = await getSharedFolderContent(
      directoryId,
      'files',
      resourcesToken ?? '',
      this.page,
      this.itemsPerPage,
    );
    const files = items.items.map((file) => ({ ...file, name: file?.plainName ?? file.name }));
    this.page += 1;
    const done = files.length < this.itemsPerPage;

    return { value: files, done: done, token: items.token };
  }
}

class DirectoryPublicSharedFolderIterator implements Iterator<SharedFolders> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string };

  constructor(queryValues: { directoryId: string; resourcesToken?: string }, page?: number, itemsPerPage?: number) {
    this.page = page || 0;
    this.itemsPerPage = itemsPerPage || 5;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken } = this.queryValues;
    const items = await getPublicSharedFolderContent(
      directoryId,
      'folders',
      resourcesToken ?? '',
      this.page,
      this.itemsPerPage,
    );
    const folders = items.items.map((folder) => ({ ...folder, name: folder?.plainName ?? folder.name }));
    this.page += 1;

    const done = folders.length < this.itemsPerPage;

    return { value: folders as SharedFolders[], done: done, token: items.token };
  }
}

class DirectoryPublicSharedFilesIterator implements Iterator<SharedFiles> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string; code?: string };

  constructor(
    queryValues: { directoryId: string; resourcesToken?: string; code?: string },
    page?: number,
    itemsPerPage?: number,
  ) {
    this.page = page || 0;
    this.itemsPerPage = itemsPerPage || 15;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken, code } = this.queryValues;

    const items = await getPublicSharedFolderContent(
      directoryId,
      'files',
      resourcesToken ?? '',
      this.page,
      this.itemsPerPage,
      code,
    );
    const files = items.items.map((file) => ({ ...file, name: file?.plainName ?? file.name }));
    this.page += 1;
    const done = files.length < this.itemsPerPage;

    return { value: files, done: done, token: items.token };
  }
}

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
  token?: string;
}): Promise<void> {
  const decryptedKey = await decryptMnemonic(encryptionKey);

  if (selectedItems.length === 1 && !selectedItems[0].isFolder) {
    try {
      const sharingOptions = {
        credentials: { ...creds },
        mnemonic: decryptedKey,
      };

      dispatch(downloadItemsThunk([{ ...selectedItems[0], sharingOptions }]));
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
    const initPage = 0;
    const itemsPerPage = 15;

    const createFoldersIterator = (directoryUuid: string, resourcesToken?: string) => {
      return new DirectorySharedFolderIterator(
        { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token },
        initPage,
        itemsPerPage,
      );
    };

    const createFilesIterator = (directoryUuid: string, resourcesToken?: string) => {
      return new DirectorySharedFilesIterator(
        { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token },
        initPage,
        itemsPerPage,
      );
    };
    dispatch(
      downloadItemsAsZipThunk({
        items: selectedItems,
        credentials: creds,
        mnemonic: decryptedKey as string,
        fileIterator: createFilesIterator,
        folderIterator: createFoldersIterator,
        areSharedItems: true,
      }),
    );
  }
}

export async function downloadPublicSharedFolder({
  encryptionKey,
  item,
  token,
  code,
}: {
  encryptionKey: string;
  item;
  token?: string;
  code: string;
}): Promise<void> {
  const initPage = 0;
  const itemsPerPage = 15;

  const decrypted = aes.decrypt(encryptionKey, code);

  const { credentials } = await shareService.getPublicSharedFolderContent(
    // folderUUID
    item.uuid,
    'files',
    '',
    0,
    15,
    code,
  );

  if (!credentials) {
    throw Error('No Credentials!');
  }

  const createFoldersIterator = (directoryUuid: string, resourcesToken?: string) => {
    return new DirectoryPublicSharedFolderIterator(
      { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token },
      initPage,
      itemsPerPage,
    );
  };

  const createFilesIterator = (directoryUuid: string, resourcesToken?: string) => {
    return new DirectoryPublicSharedFilesIterator(
      { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token, code: code },
      initPage,
      itemsPerPage,
    );
  };

  const options = {
    credentials: {
      user: credentials.networkUser,
      pass: credentials.networkPass,
    },
    mnemonic: decrypted,
    isPublicShare: true,
  };

  return folderService.downloadSharedFolderAsZip(
    item.id,
    item.plainName,
    createFoldersIterator,
    createFilesIterator,
    (progress) => ({}),
    item.uuid,
    options,
  );
}

export const processInvitation = async (
  isDeclineAction: boolean,
  invitationId: string,
  token: string,
): Promise<void> => {
  const invitationData = {
    invitationId,
    token,
  };

  const response = isDeclineAction
    ? await shareService.declineSharedFolderInvite(invitationData)
    : await shareService.acceptSharedFolderInvite(invitationData);

  return response;
};

export function createPublicSharingItem(publicSharingPayload: CreateSharingPayload): Promise<SharingMeta> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.createSharing(publicSharingPayload).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getPublicSharingMeta(sharingId: string, code: string, password?: string): Promise<SharingMeta> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharingMeta(sharingId, code, password).catch((error) => {
    throw errorService.castError(error);
  });
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
  getAllSharedFiles,
  getLinkFromShare,
  getAllShareLinks,
  buildLinkFromShare,
  incrementShareView,
  getShareDomains,
  stopSharingItem,
  removeUserRole,
  getSharedFolderContent,
  downloadSharedFiles,
  getUsersOfSharedFolder,
  updateUserRoleOfSharedFolder,
  getUserRoleOfSharedRolder,
  acceptSharedFolderInvite,
  declineSharedFolderInvite,
  processInvitation,
  createPublicSharingItem,
  getPublicSharingMeta,
  getPublicSharedFolderContent,
  getPublicShareLink,
};

export default shareService;
