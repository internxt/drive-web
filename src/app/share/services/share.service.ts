import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from 'app/core/services/http.service';


const shareClient = SdkFactory.getInstance().createShareClient();
// export function generateShareFileLink(params: ShareTypes.GenerateShareFileLinkPayload, code: string): Promise<string> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.createShareFileLink(params).then((response) => {
//     return `${window.location.origin}/s/file/${response.token}/${code}`;
//   });
// }

// export function generateShareFolderLink(
//   params: ShareTypes.GenerateShareFolderLinkPayload,
//   code: string,
// ): Promise<string> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.createShareFolderLink(params).then((response) => {
//     return `${window.location.origin}/s/folder/${response.token}/${code}`;
//   });
// }

// export function getSharedFileInfo(token: string): Promise<ShareTypes.SharedFileInfo> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.getSharedFileByToken(token).catch((error) => {
//     throw errorService.castError(error);
//   });
// }

// export function getSharedFolderInfo(token: string): Promise<ShareTypes.SharedFolderInfo> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.getSharedFolderByToken(token);
// }

// export async function getSharedFolderSize(shareId: number, folderId: number): Promise<number> {
//   try {
//     const { size } = await httpService.get<{ size: number }>(
//       `${process.env.REACT_APP_API_URL}/api/share/${shareId}/folder/${folderId}`,
//     );

//     return size;
//   } catch (err) {
//     throw errorService.castError(err);
//   }
// }

// export function getSharedDirectoryFolders(
//   payload: ShareTypes.GetSharedDirectoryFoldersPayload,
// ): Promise<ShareTypes.SharedDirectoryFolders> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.getSharedDirectoryFolders(payload);
// }

// export function getSharedDirectoryFiles(
//   payload: ShareTypes.GetSharedDirectoryFilesPayload,
// ): Promise<ShareTypes.SharedDirectoryFiles> {
//   const shareClient = SdkFactory.getInstance().createShareV2Client();
//   return shareClient.getSharedDirectoryFiles(payload);
// }


export function getAllShareLinks(page: number, perPage: number): Promise<Array<Partial<ShareTypes.ShareLink>> | []> {
  return shareClient.getShareLinks(page, perPage).catch((error) => {
    throw errorService.castError(error);
  });
}


const shareService = {
  getAllShareLinks,
};

export default shareService;
