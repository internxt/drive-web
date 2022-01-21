import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { createReferralsClient } from '../../core/factory/sdk';


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
