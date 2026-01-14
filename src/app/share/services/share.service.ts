import { aes, stringUtils } from '@internxt/lib';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import {
  AcceptInvitationToSharedFolderPayload,
  CreateSharingPayload,
  ListAllSharedFoldersResponse,
  ListPrivateSharedFoldersResponse,
  ListSharedItemsResponse,
  PublicSharedItemInfo,
  Role,
  ShareDomainsResponse,
  ShareFolderWithUserPayload,
  SharedFiles,
  SharedFolderSize,
  SharedFolders,
  SharedFoldersInvitationsAsInvitedUserResponse,
  SharingInfo,
  SharingInvite,
  SharingMeta,
  UpdateUserRolePayload,
  UpdateUserRoleResponse,
} from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import copy from 'copy-to-clipboard';
import { t } from 'i18next';
import { Iterator } from '../../core/collections';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import workspacesService from 'services/workspace.service';
import { hybridDecryptMessageWithPrivateKey } from '../../crypto/services/pgp.service';
import { downloadFolderAsZip } from 'app/drive/services/folder.service';
import { DriveFolderData } from 'app/drive/types';
import { DownloadManager } from '../../network/DownloadManager';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { AdvancedSharedItem } from '../types';
import { domainManager } from './DomainManager';
import { generateCaptchaToken } from 'utils';

interface CreateShareResponse {
  created: boolean;
  token: string;
}

export async function createShare(params: ShareTypes.GenerateShareLinkPayload): Promise<CreateShareResponse> {
  return await SdkFactory.getNewApiInstance().createShareClient().createShareLink(params);
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

export function getSharedFolderInfo(token: string, password?: string): Promise<ShareTypes.ShareLink> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getShareLink(token, password).catch((error) => {
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

export async function inviteUserToSharedFolder(props: ShareFolderWithUserPayload): Promise<SharingInvite> {
  const captchaToken = await generateCaptchaToken();
  const shareClient = SdkFactory.getNewApiInstance().createShareClient(captchaToken);
  return shareClient.inviteUserToSharedFolder({ ...props }).catch((error) => {
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

export function getUserRoleOfSharedFolder(sharingId: string): Promise<Role> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getUserRole(sharingId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getPublicSharedItemInfo(sharingId: string): Promise<PublicSharedItemInfo> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getPublicSharedItemInfo(sharingId).catch((error) => {
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

export const createPublicShareFromOwnerUser = async (
  uuid: string,
  itemType: 'folder' | 'file',
  plainPassword?: string,
  encryptionAlgorithm?: string,
): Promise<SharingMeta> => {
  const user = localStorageService.getUser() as UserSettings;
  const { mnemonic } = user;
  const code = stringUtils.generateRandomStringUrlSafe(8);

  const encryptedMnemonic = aes.encrypt(mnemonic, code);
  const encryptedCode = aes.encrypt(code, mnemonic);
  const encryptedPassword = plainPassword ? aes.encrypt(plainPassword, code) : null;

  return createPublicSharingItem({
    encryptionAlgorithm: encryptionAlgorithm ?? 'inxt-v2',
    encryptionKey: encryptedMnemonic,
    itemType,
    itemId: uuid,
    encryptedCode,
    persistPreviousSharing: true,
    ...(encryptedPassword && { encryptedPassword }),
  });
};

export const decryptPublicSharingCodeWithOwner = (encryptedCode: string) => {
  const user = localStorageService.getUser() as UserSettings;
  const { mnemonic } = user;
  return aes.decrypt(encryptedCode, mnemonic);
};

const getRandomElement = (list: string[]) => {
  if (list.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * list.length);

  return list[randomIndex];
};

export const getPublicShareLink = async (
  uuid: string,
  itemType: 'folder' | 'file',
  encriptedMnemonic?: string,
): Promise<SharingMeta | void> => {
  const user = localStorageService.getUser() as UserSettings;
  let { mnemonic } = user;

  try {
    const publicSharingItemData = await createPublicShareFromOwnerUser(uuid, itemType);
    const { id: sharingId, encryptedCode: encryptedCodeFromResponse } = publicSharingItemData;
    const isUserInvited = publicSharingItemData.ownerId !== user.uuid;

    if (isUserInvited && encriptedMnemonic) {
      const ownerMnemonic = await decryptMnemonic(encriptedMnemonic);
      if (ownerMnemonic) mnemonic = ownerMnemonic;
    }
    const plainCode = aes.decrypt(encryptedCodeFromResponse, mnemonic);

    const domains = domainManager.getDomainsList();
    let selectedDomain = getRandomElement(domains);

    if (!selectedDomain) {
      selectedDomain = window.location.origin;
    }

    const encodedSharingId = stringUtils.encodeV4Uuid(sharingId);

    const publicShareLink = `${selectedDomain}/sh/${itemType}/${encodedSharingId}/${plainCode}`;

    await copyTextToClipboard(publicShareLink);

    notificationsService.show({ text: t('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
    return publicSharingItemData;
  } catch (error) {
    notificationsService.show({
      text: t('modals.shareModal.errors.copy-to-clipboard'),
      type: ToastType.Error,
    });
    errorService.reportError(error);
  }
};

export const copyTextToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copy(text);
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

class DirectorySharedFolderIterator implements Iterator<SharedFolders> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string; workspaceId?: string; teamId?: string };

  constructor(
    queryValues: { directoryId: string; resourcesToken?: string; workspaceId?: string; teamId?: string },
    page?: number,
    itemsPerPage?: number,
  ) {
    this.page = page ?? 0;
    this.itemsPerPage = itemsPerPage ?? 5;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken, workspaceId } = this.queryValues;
    let items;
    if (workspaceId) {
      const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFolders(
        workspaceId,
        directoryId,
        this.page,
        this.itemsPerPage,
        resourcesToken,
      );
      const response = await promise;
      items = response;
    } else {
      items = await getSharedFolderContent(directoryId, 'folders', resourcesToken ?? '', this.page, this.itemsPerPage);
    }
    const folders = items.items.map((folder) => ({ ...folder, name: folder?.plainName ?? folder.name }));
    this.page += 1;

    const done = folders.length < this.itemsPerPage;

    return { value: folders as SharedFolders[], done: done, token: items.token };
  }
}

class DirectorySharedFilesIterator implements Iterator<SharedFiles> {
  private page: number;
  private itemsPerPage: number;
  private readonly queryValues: { directoryId: string; resourcesToken?: string; workspaceId?: string; teamId?: string };

  constructor(
    queryValues: { directoryId: string; resourcesToken?: string; workspaceId?: string; teamId?: string },
    page?: number,
    itemsPerPage?: number,
  ) {
    this.page = page ?? 0;
    this.itemsPerPage = itemsPerPage ?? 15;
    this.queryValues = queryValues;
  }

  async next() {
    const { directoryId, resourcesToken, workspaceId } = this.queryValues;
    let items;
    if (workspaceId) {
      const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFiles(
        workspaceId,
        directoryId,
        this.page,
        this.itemsPerPage,
        resourcesToken,
      );
      const response = await promise;
      items = response;
    } else {
      items = await getSharedFolderContent(directoryId, 'files', resourcesToken ?? '', this.page, this.itemsPerPage);
    }
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
    this.page = page ?? 0;
    this.itemsPerPage = itemsPerPage ?? 5;
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
    this.page = page ?? 0;
    this.itemsPerPage = itemsPerPage ?? 15;
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
    const privateKeyInBase64 = user.keys?.ecc?.privateKey ?? user.privateKey;
    const privateKyberKeyInBase64 = user.keys?.kyber?.privateKey ?? '';
    try {
      decryptedKey = await hybridDecryptMessageWithPrivateKey({
        encryptedMessageInBase64: encryptionKey,
        privateKeyInBase64,
        privateKyberKeyInBase64,
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
  decryptedEncryptionKey,
  selectedItems,
  token,
  teamId,
  selectedWorkspace,
  workspaceCredentials,
}: {
  creds: { user: string; pass: string };
  decryptedEncryptionKey: string;
  selectedItems: AdvancedSharedItem[];
  token?: string;
  teamId?: string;
  selectedWorkspace: WorkspaceData | null;
  workspaceCredentials: WorkspaceCredentialsDetails | null;
}): Promise<void> {
  const sharingCredentials = {
    credentials: { ...creds },
    mnemonic: decryptedEncryptionKey,
  };

  if (selectedItems.length === 1 && !selectedItems[0].isFolder) {
    await DownloadManager.downloadItem({
      payload: selectedItems,
      selectedWorkspace,
      workspaceCredentials,
      downloadCredentials: sharingCredentials,
    });
  } else {
    const initPage = 0;
    const itemsPerPage = 15;

    const workspaceId = selectedWorkspace?.workspace.id;

    const createFoldersIterator = (directoryUuid: string, resourcesToken?: string) => {
      return new DirectorySharedFolderIterator(
        { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token, workspaceId, teamId },
        initPage,
        itemsPerPage,
      );
    };

    const createFilesIterator = (directoryUuid: string, resourcesToken?: string) => {
      return new DirectorySharedFilesIterator(
        { directoryId: directoryUuid, resourcesToken: resourcesToken ?? token, workspaceId, teamId },
        initPage,
        itemsPerPage,
      );
    };

    const payload: AdvancedSharedItem[] = [];

    for (const selectedItem of selectedItems) {
      const item = selectedItem;
      payload.push({
        ...item,
        credentials: {
          ...item.credentials,
          mnemonic: await decryptMnemonic(item.encryptionKey),
        },
      });
    }

    await DownloadManager.downloadItem({
      payload,
      selectedWorkspace,
      workspaceCredentials,
      downloadCredentials: sharingCredentials,
      createFilesIterator,
      createFoldersIterator,
      downloadOptions: {
        areSharedItems: true,
      },
    });
  }
}

export async function downloadPublicSharedFolder({
  encryptionKey,
  item,
  token,
  code,
  incrementItemCount,
}: {
  encryptionKey: string;
  item;
  token?: string;
  code: string;
  incrementItemCount: () => void;
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

  await downloadFolderAsZip({
    folder: item as DriveFolderData,
    isSharedFolder: true,
    foldersIterator: createFoldersIterator,
    filesIterator: createFilesIterator,
    updateProgress: () => {},
    updateNumItems: incrementItemCount,
    options,
  });
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
export function validateSharingInvitation(sharingId: string): Promise<{ uuid: string }> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.validateInviteExpiration(sharingId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getPublicSharingMeta(sharingId: string, code: string, password?: string): Promise<SharingMeta> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharingMeta(sharingId, code, password).catch((error) => {
    throw error;
  });
}

export function updateSharingType(itemId: string, itemType: 'file' | 'folder', sharingType: string): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.updateSharingType({ itemId, itemType, sharingType }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharingType(itemId: string, itemType: 'file' | 'folder'): Promise<SharingMeta> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharingType({ itemId, itemType }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getSharingInfo(itemId: string, itemType: 'file' | 'folder'): Promise<SharingInfo> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharingInfo({ itemId, itemType }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function saveSharingPassword(
  sharingId: string,
  plainPassword: string,
  encryptedCode: string,
): Promise<SharingMeta> {
  const code = shareService.decryptPublicSharingCodeWithOwner(encryptedCode);
  const encryptedPassword = aes.encrypt(plainPassword, code);

  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.saveSharingPassword(sharingId, encryptedPassword).catch((error) => {
    throw errorService.castError(error);
  });
}

export function removeSharingPassword(sharingId: string): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.removeSharingPassword(sharingId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getSharedFolderSize(id: string): Promise<SharedFolderSize> {
  const shareClient = SdkFactory.getNewApiInstance().createShareClient();
  return shareClient.getSharedFolderSize(id).catch((error) => {
    throw errorService.castError(error);
  });
}

const shareService = {
  createShare,
  updateShareLink,
  deleteShareLink,
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getSentSharedFolders,
  getAllSharedFolders,
  getAllSharedFiles,
  getSharingType,
  getSharingInfo,
  getShareDomains,
  stopSharingItem,
  removeUserRole,
  getSharedFolderContent,
  downloadSharedFiles,
  getUsersOfSharedFolder,
  updateUserRoleOfSharedFolder,
  getUserRoleOfSharedFolder,
  acceptSharedFolderInvite,
  declineSharedFolderInvite,
  processInvitation,
  createPublicSharingItem,
  createPublicShareFromOwnerUser,
  updateSharingType,
  getPublicSharingMeta,
  getPublicSharedFolderContent,
  getPublicShareLink,
  saveSharingPassword,
  removeSharingPassword,
  decryptPublicSharingCodeWithOwner,
  validateSharingInvitation,
  getPublicSharedItemInfo,
  getSharedFolderSize,
  inviteUserToSharedFolder,
  getSharedFolderInvitationsAsInvitedUser,
  getSharingRoles,
};

export default shareService;
