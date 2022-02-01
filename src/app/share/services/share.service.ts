import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';

export function generateShareFileLink(params: ShareTypes.GenerateShareFileLinkPayload): Promise<string> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.createShareFileLink(params)
    .then(response => {
      return `${window.location.origin}/${response.token}`;
    });
}

export function getShareInfo(token: string): Promise<ShareTypes.GetShareInfoResponse> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.getShareByToken(token)
    .catch(error => {
      throw errorService.castError(error);
    });
}

const shareService = {
  generateShareFileLink,
  getShareInfo,
};

export default shareService;
