import httpService from 'app/core/services/http.service';

const MAILERLITE_API_KEY = 'bbcd6c365d78a339a63df27b93ebd323';
const GROUP_ID = '103406410';

const newsletterService = {
  subscribe(email: string) {
    httpService.post<{ email: string; resubscribe: boolean; autoresponders: boolean }, void>(
      `https://api.mailerlite.com/api/v2/groups/${GROUP_ID}/subscribers`,
      { email, resubscribe: true, autoresponders: true },
      {
        headers: {
          Accept: 'application/json',
          'X-MailerLite-ApiDocs': 'true',
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': MAILERLITE_API_KEY,
          Authorization: undefined,
        },
      },
    );
  },
};

export default newsletterService;
