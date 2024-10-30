import errorService from '../../core/services/error.service';
import httpService from '../../core/services/http.service';

const newsletterService = {
  subscribe(email: string): Promise<void> {
    try {
      return httpService.post<{ email: string }, void>('/newsletter/subscribe', { email });
    } catch (err) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  },
};

export default newsletterService;
