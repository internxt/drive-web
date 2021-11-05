import httpService from 'app/core/services/http.service';
import { ReferralKey, UserReferral } from '../types';

const usersReferralsService = {
  fetch() {
    return httpService.get<UserReferral[]>('/api/users-referrals');
  },
  hasClickAction(referralKey: ReferralKey) {
    return [ReferralKey.SubscribeToNewsletter, ReferralKey.InstallDesktopApp, ReferralKey.InviteFriends].includes(
      referralKey,
    );
  },
};

export default usersReferralsService;
