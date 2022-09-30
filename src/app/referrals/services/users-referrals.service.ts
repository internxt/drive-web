import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { SdkFactory } from '../../core/factory/sdk';


const usersReferralsService = {
  fetch(): Promise<UserReferral[]> {
    const referralsClient = SdkFactory.getInstance().createReferralsClient();
    return referralsClient.getReferrals();
  },
  hasClickAction(referralKey: ReferralKey): boolean {
    return [ReferralKey.SubscribeToNewsletter, ReferralKey.InstallDesktopApp, ReferralKey.InviteFriends, ReferralKey.Invite2Friends, ReferralKey.CompleteSurvey].includes(
      referralKey,
    );
  },
};

export default usersReferralsService;
