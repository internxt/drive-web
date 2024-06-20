import { useEffect, useCallback, useReducer } from 'react';
import { Elements } from '@stripe/react-stripe-js';

import { useThemeContext } from '../../../theme/ThemeProvider';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import errorService from '../../../core/services/error.service';
import CheckoutView from './CheckoutView';
import { fetchPlanById, fetchPromotionCodeByName } from '../../helpers/checkout';
import envService from '../../../core/services/env.service';
import { StripeElementsOptions, loadStripe } from '@stripe/stripe-js';
import databaseService from '../../../database/services/database.service';
import localStorageService from '../../../core/services/local-storage.service';
import RealtimeService from '../../../core/services/socket.service';
import authCheckoutService from '../../services/auth-checkout.service';
import { useAppDispatch } from '../../../store/hooks';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import { AuthMethodTypes, ErrorType, THEME_STYLES } from '../../types';
import { checkoutReducer, initialStateForCheckout } from './checkoutReducer';

export const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const { currentTheme } = useThemeContext();
  const dispatch = useAppDispatch();
  const { doRegister } = useSignUp('activate');

  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);

  const { authMethod, error, selectedPlan, stripe, couponCodeData, elementsOptions, promoCode } = state;

  const { backgroundColor, textColor } = THEME_STYLES[currentTheme as string];

  const elementsOptionsParams: StripeElementsOptions = {
    appearance: {
      labels: 'above',
      variables: {
        spacingAccordionItem: '8px',
        colorPrimary: textColor,
      },
      theme: 'flat',
      rules: {
        '.AccordionItem:hover': {
          color: textColor,
        },
        '.TermsText': {
          color: textColor,
        },
        '.AccordionItem': {
          border: `1px solid ${backgroundColor}`,
          backgroundColor: backgroundColor,
        },
        '.Label': {
          color: textColor,
        },
        '.RedirectText': {
          color: textColor,
        },
      },
    },
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('promotion_code');

    if (planId) {
      handleFetchSelectedPlan(planId)
        .then(async (plan) => {
          dispatchReducer({
            type: 'SET_ELEMENTS_OPTIONS',
            payload: {
              ...(elementsOptionsParams as any),
              mode: plan?.interval === 'lifetime' ? 'payment' : 'subscription',
              amount: plan?.amount,
              currency: plan?.currency,
              payment_method_types: ['card', 'paypal'],
            },
          });

          const stripe = await stripePromise;
          dispatchReducer({ type: 'SET_STRIPE', payload: stripe });
        })
        .catch((err) => {
          const error = err as Error;
          errorService.reportError(error);
          navigationService.push(AppView.Drive);
        });

      if (promotionCode) {
        handleFetchPromotionCode(promotionCode)
          .then((promoCodeData) => {
            dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: promoCodeData });
          })
          .catch((err) => {
            const error = err as Error;
            console.log('ERROR', error.message);
            errorService.reportError(error);
          });
      }
    } else {
      navigationService.push(AppView.Drive);
    }
  }, []);

  useEffect(() => {
    if (promoCode) {
      handleFetchPromotionCode(promoCode)
        .then((promoCode) => {
          dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: promoCode });
        })
        .catch((err) => {
          const error = err as Error;
          handleError('coupon', 'This code does not exist');
          errorService.reportError(error);
        });
    }
  }, [promoCode]);

  const authenticateUser = async (email: string, password: string) => {
    try {
      if (authMethod === 'signIn') {
        await authCheckoutService.logIn(email, password, '', dispatch);
      } else if (authMethod === 'signUp') {
        await authCheckoutService.signUp(doRegister, email, password, '', dispatch);
      }
    } catch (err) {
      const error = err as Error;
      handleError('auth', error.message);
      throw new Error('Authentication failed');
    }
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    handleAuthMethodChange('signIn');
  };

  const handleFetchSelectedPlan = useCallback(async (planId: string) => {
    try {
      const plan = await fetchPlanById(planId);
      dispatchReducer({ type: 'SET_SELECTED_PLAN', payload: plan });
      return plan;
    } catch (error) {
      console.error('Error fetching plan or payment intent:', error);
    }
  }, []);

  const handleFetchPromotionCode = useCallback(async (promotionCode: string) => {
    const promoCodeData = await fetchPromotionCodeByName(promotionCode);

    return promoCodeData;
  }, []);

  const handleOnInputChange = (coupon: string) => dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: coupon });

  const handleAuthMethodChange = (method: AuthMethodTypes) => {
    dispatchReducer({ type: 'SET_AUTH_METHOD', payload: method });
  };

  const handleError = (type: ErrorType, error: string) => {
    dispatchReducer({
      type: 'SET_ERROR',
      payload: {
        [type]: error,
      },
    });
  };

  return (
    <Elements stripe={stripe} options={elementsOptions}>
      <CheckoutView
        selectedPlan={selectedPlan}
        couponCodeData={couponCodeData}
        authMethod={authMethod}
        error={error}
        handleOnInputChange={handleOnInputChange}
        handleError={handleError}
        onLogOut={onLogOut}
        authenticateUser={authenticateUser}
        handleAuthMethod={handleAuthMethodChange}
      />
    </Elements>
  );
};

export default CheckoutViewWrapper;
