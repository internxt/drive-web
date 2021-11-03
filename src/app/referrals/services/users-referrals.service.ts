import httpService from 'app/core/services/http.service';
import { UserReferral } from '../types';

const usersReferralsService = {
  fetch() {
    return httpService.get<UserReferral[]>('/api/users-referrals');
  },
};

export default usersReferralsService;
