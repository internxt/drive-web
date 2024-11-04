import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { getCookie } from './utils';
import errorService from 'app/core/services/error.service';
import httpService from 'app/core/services/http.service';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { AnalyticsTrackNames } from './types';

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
        messageId: uuidv4(),
        userId: uuid,
        type: 'track',
        event: 'User Signup',
      });
    }
  } catch (e) {
    const castedError = errorService.castError(e);
    console.error(castedError);
    errorService.reportError(castedError);
  }
}

export async function trackPaymentConversion() {
  try {
    const checkoutSessionId = localStorage.getItem('sessionId');

    const { username, uuid } = localStorageService.getUser() as UserSettings;
    let metadata, amount_total, currency, customer, subscription, paymentIntent;
    // TODO: REVIEW IN ORDER TO MAKE WORK CORRECTLY WITH THE NEW INTEGRATED CHECKOUT
    try {
      const {
        metadata: metadataRetrived,
        amount_total: totalAmountRetrieved,
        currency: currencyRetrieved,
        customer: customerRetrieved,
        subscription: subscriptionId,
        payment_intent: paymentIntentRetrieved,
      } = (await httpService.get(`${process.env.REACT_APP_API_URL}/stripe/session`, {
        params: {
          sessionId: checkoutSessionId,
        },
        headers: httpService.getHeaders(true, false),
      })) as any;
      metadata = metadataRetrived;
      amount_total = totalAmountRetrieved;
      currency = currencyRetrieved;
      customer = customerRetrieved;
      paymentIntent = paymentIntentRetrieved;
      subscription = subscriptionId;
    } catch (error) {
      console.log(error);
    }

    subscription = subscription ?? localStorageService.get('subscriptionId');
    paymentIntent = paymentIntent ?? localStorageService.get('paymentIntentId');
    // TO MANTAIN OLD BEHAVIOR
    const amount = amount_total ? amount_total * 0.01 : parseFloat(localStorageService.get('amountPaid') ?? '0');
    amount_total = amount_total ?? parseFloat(localStorageService.get('amountPaid') ?? '0');

    try {
      window.rudderanalytics.identify(uuid, {
        email: username,
        plan: metadata.priceId,
        customer_id: customer,
        storage_limit: metadata.maxSpaceBytes,
        plan_name: metadata.name,
        subscription_id: subscription,
        payment_intent: paymentIntent,
      });
      window.rudderanalytics.track(AnalyticsTrackNames.PaymentConversionEvent, {
        price_id: metadata.priceId,
        product: metadata.product,
        email: username,
        customer_id: customer,
        currency: currency.toUpperCase(),
        value: amount,
        revenue: amount,
        quantity: 1,
        type: metadata.type,
        plan_name: metadata.name,
        impact_value: amount_total === 0 ? 0.01 : amount,
        subscription_id: subscription,
        payment_intent: paymentIntent,
      });

      window.gtag('event', 'purchase', {
        transaction_id: uuidv4(),
        value: amount,
        currency: currency.toUpperCase(),
        items: [
          {
            item_id: metadata.priceId,
            item_name: metadata.name,
            quantity: 1,
            price: amount,
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }

    if (source && source !== 'direct') {
      axios
        .post(IMPACT_API, {
          anonymousId: anonymousID,
          timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
          properties: {
            impact_value: amount_total === 0 ? 0.01 : amount,
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
    const castedError = errorService.castError(err);
    window.rudderanalytics.track('Error Signup After Payment Conversion', {
      message: castedError.message || '',
    });
  }
}
