import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';
import dayjs from 'dayjs';
import { getCookie } from './utils';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

const IMPACT_API = process.env.REACT_APP_IMPACT_API as string;

const anonymousID = getCookie('impactAnonymousId');
const source = getCookie('impactSource');

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

    try {
      window.gtag('event', 'purchase', {
        transaction_id: uuidV4(),
        value: amount,
        currency: currency?.toUpperCase() ?? '€',
        items: [
          {
            item_id: priceId,
            item_name: productName,
            quantity: 1,
            price: amount,
          },
        ],
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
