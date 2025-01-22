import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';
import dayjs from 'dayjs';
import { getCookie } from './utils';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import gaService, { GA_SEND_TO_KEY } from 'app/analytics/ga.service';

const IMPACT_API = process.env.REACT_APP_IMPACT_API as string;

const anonymousID = getCookie('impactAnonymousId');
const source = getCookie('impactSource');
const gaPlanId = getCookie('gaPlanId');

export async function trackSignUp(uuid, email) {
  try {
    window.rudderanalytics.identify(uuid, { email, uuid: uuid });
    window.rudderanalytics.track('User Signup', { email });
    window.gtag('event', 'User Signup');

    if (source && source !== 'direct') {
      await axios.post(IMPACT_API, {
        anonymousId: anonymousID,
        timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
        messageId: uuidV4(),
        userId: uuid,
        type: 'track',
        event: 'User Signup',
      });
    }
  } catch (e) {
    const castedError = errorService.castError(e);
    errorService.reportError(castedError);
  }
}

export async function trackPaymentConversion() {
  try {
    const { uuid } = localStorageService.getUser() as UserSettings;

    const subscription = localStorageService.get('subscriptionId');
    const paymentIntent = localStorageService.get('paymentIntentId');
    const productName = localStorageService.get('productName');
    const priceId = localStorageService.get('priceId');
    const currency = localStorageService.get('currency');
    const amount = parseFloat(localStorageService.get('amountPaid') ?? '0');
    const UserType = localStorageService.get('userType');
    const type = localStorageService.get('type');

    let tag;

    if (type === 'free') {
      tag = '1CTxCP_HzYcaEOf1ydsC';
    } else if (UserType === 'Individual') {
      tag = 'O6oUCPzHzYcaEOf1ydsC';
    } else if (UserType === 'Business') {
      tag = '1CTxCP_HzYcaEOf1ydsC';
    }

    try {
      gaService.track('conversion', {
        send_to: `${GA_SEND_TO_KEY}/${tag}`,
        value: amount / 100,
        currency: currency?.toUpperCase() ?? '€',
        transaction_id: gaPlanId,
      });
    } catch (error) {
      //
    }

    if (source && source !== 'direct') {
      axios
        .post(IMPACT_API, {
          anonymousId: anonymousID,
          timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
          properties: {
            impact_value: amount === 0 ? 0.01 : amount,
            subscription_id: subscription,
            payment_intent: paymentIntent,
          },
          userId: uuid,
          type: 'track',
          event: 'Payment Conversion',
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
  } catch (err) {
    //
  }
}
