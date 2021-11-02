import httpService from 'app/core/services/http.service';

const GROUP_ID = '103406410';

const newsletterService = {
  subscribe(email: string) {
    return httpService.post<{ email: string; groupId: string }, void>('/api/newsletter/subscribe', {
      email,
      groupId: GROUP_ID,
    });
  },
};

export default newsletterService;
