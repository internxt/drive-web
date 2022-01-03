import errorService from '../../core/services/error.service';
import { createShareClient } from '../../../factory/modules';
import { ShareTypes } from '@internxt/sdk';

export function generateShareLink(params: ShareTypes.GenerateShareLinkPayload): Promise<string> {
  const shareClient = createShareClient();
  return shareClient.generateShareLink(params)
    .then(response => {
      return `${window.location.origin}/${response.token}`;
    });
}

export function getShareInfo(token: string): Promise<ShareTypes.GetShareInfoResponse> {
  const shareClient = createShareClient();
  return shareClient.getShareTokenInfo(token)
    .catch(error => {
      throw errorService.castError(error);
    });
}

const shareService = {
  generateShareLink,
  getShareInfo,
};

export default shareService;
