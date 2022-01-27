import errorService from '../../core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../core/factory/sdk';

export function generateShareLink(params: ShareTypes.GenerateShareLinkPayload): Promise<string> {
  const shareClient = SdkFactory.getInstance().createShareClient();
  return shareClient.createShareLink(params)
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
  generateShareLink,
  getShareInfo,
};

export default shareService;
