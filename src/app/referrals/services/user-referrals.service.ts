import httpService from 'app/core/services/http.service';
import { UserReferral } from '../types';

const userReferralsService = {
  fetch() {
    return httpService.get<UserReferral[]>('/api/user-referrals');
  },
};

export default userReferralsService;
