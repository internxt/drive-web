import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from 'app/core/services/http.service';


export function generateShareFileLink(
  params: ShareTypes.GenerateShareFileLinkPayload, code: string
): Promise<string> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.createShareFileLink(params)
    .then(response => {
      return `${window.location.origin}/sh/file/${response.token}/${code}`;
    });
}

export function generateShareFolderLink(
  params: ShareTypes.GenerateShareFolderLinkPayload, code: string
): Promise<string> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.createShareFolderLink(params)
    .then(response => {
      return `${window.location.origin}/sh/folder/${response.token}/${code}`;
    });
}

export function getSharedFileInfo(token: string): Promise<ShareTypes.SharedFileInfo> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getSharedFileByToken(token)
    .catch(error => {
      throw errorService.castError(error);
    });
}

export function getSharedFolderInfo(token: string): Promise<ShareTypes.SharedFolderInfo> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getSharedFolderByToken(token);
}

export async function getSharedFolderSize(shareId: number, folderId: number): Promise<number> {
  try {
    const { size } = await httpService.get<{ size: number }>(
      `${process.env.REACT_APP_API_URL}/api/share/${shareId}/folder/${folderId}`
    );

    return size;
  } catch (err) {
    throw errorService.castError(err);
  }
}

export function getSharedDirectoryFolders(payload: ShareTypes.GetSharedDirectoryFoldersPayload):
  Promise<ShareTypes.SharedDirectoryFolders> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getSharedDirectoryFolders(payload);
}

export function getSharedDirectoryFiles(payload: ShareTypes.GetSharedDirectoryFilesPayload):
  Promise<ShareTypes.SharedDirectoryFiles> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getSharedDirectoryFiles(payload);
}

const shareService = {
  generateShareFileLink,
  generateShareFolderLink,
  getSharedFileInfo,
};

export default shareService;
