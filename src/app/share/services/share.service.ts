import errorService from '../../core/services/error.service';
import { createShareClient } from '../../core/factory/sdk';
import { ShareTypes } from '@internxt/sdk/dist/drive';

export function generateShareLink(params: ShareTypes.GenerateShareLinkPayload): Promise<string> {
  const shareClient = createShareClient();
  return shareClient.createShareLink(params)
    .then(response => {
      return `${window.location.origin}/${response.token}`;
    });
}

export function getShareInfo(token: string): Promise<ShareTypes.GetShareInfoResponse> {
  const shareClient = createShareClient();
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
