import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { createReferralsClient } from '../../../factory/modules';


const usersReferralsService = {
  fetch(): Promise<UserReferral[]> {
    return createReferralsClient().getReferrals();
  },
  hasClickAction(referralKey: ReferralKey): boolean {
    return [ReferralKey.SubscribeToNewsletter, ReferralKey.InstallDesktopApp, ReferralKey.InviteFriends].includes(
      referralKey,
    );
  },
};

export default usersReferralsService;
