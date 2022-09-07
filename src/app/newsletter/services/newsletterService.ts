import errorService from 'app/core/services/error.service';
import httpService from 'app/core/services/http.service';

const GROUP_ID = '51650193869768251';

const newsletterService = {
  subscribe(email: string): Promise<void> {
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
