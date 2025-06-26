import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';

const usersReferralsService = {
  fetch(): Promise<UserReferral[]> {
    // If referral functionality is re-enabled, a new backend endpoint will be required to fetch the data.
    /*const referralsClient = SdkFactory.getNewApiInstance().createReferralsClient();
    return referralsClient.getReferrals();*/
    return Promise.resolve([]);
  },
  hasClickAction(referralKey: ReferralKey): boolean {
    return [
      ReferralKey.SubscribeToNewsletter,
      ReferralKey.InstallDesktopApp,
      ReferralKey.InviteFriends,
      ReferralKey.Invite2Friends,
      ReferralKey.CompleteSurvey,
    ].includes(referralKey);
  },
};

export default usersReferralsService;
