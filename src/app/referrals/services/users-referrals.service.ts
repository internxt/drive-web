import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/users/types';
import { createUsersClient } from '../../../factory/modules';


const usersReferralsService = {
  fetch(): Promise<UserReferral[]> {
    const usersClient = createUsersClient();
    return usersClient.getReferrals();
  },
  hasClickAction(referralKey: ReferralKey): boolean {
    return [ReferralKey.SubscribeToNewsletter, ReferralKey.InstallDesktopApp, ReferralKey.InviteFriends].includes(
      referralKey,
    );
  },
};

export default usersReferralsService;
