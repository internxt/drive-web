import errorService from 'app/core/services/error.service';
import httpService from 'app/core/services/http.service';

const GROUP_ID = '103406410';

const newsletterService = {
  subscribe(email: string) {
    try {
      return httpService.post<{ email: string; groupId: string }, void>('/api/newsletter/subscribe', {
        email,
        groupId: GROUP_ID,
      });
    } catch (err) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  },
};

export default newsletterService;
