import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useCallback, useReducer } from 'react';
import { useThemeContext } from 'app/theme/ThemeProvider';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import errorService from 'app/core/services/error.service';
import CheckoutView from './CheckoutView';
import { initialState, checkoutReducer } from './checkoutReducer';
import { fetchPlanById, fetchPromotionCodeByName } from 'app/payment/helpers/checkout';
import envService from 'app/core/services/env.service';
import { StripeElementsOptions, loadStripe } from '@stripe/stripe-js';
import databaseService from 'app/database/services/database.service';
import localStorageService from 'app/core/services/local-storage.service';
import RealtimeService from 'app/core/services/socket.service';
import authCheckoutService from './services/auth-checkout.service';
import { useAppDispatch } from 'app/store/hooks';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import { AuthMethodTypes, ErrorType } from './types';

export const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const ERROR_TYPES: Record<ErrorType, any> = {
  auth: 'SET_AUTH_ERROR',
  stripe: 'SET_STRIPE_ERROR',
  coupon: 'SET_STRIPE_ERROR',
};

const CheckoutViewWrapper = () => {
  const { currentTheme } = useThemeContext();
  const dispatch = useAppDispatch();
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialState);
  const { doRegister } = useSignUp('activate');

  const errorStates = {
    authError: state.authError,
    stripeError: state.stripeError,
    couponError: state.couponError,
  };

  useEffect(() => {
    const stripeElementsBackgroundColor = currentTheme === 'dark' ? 'rgb(17 17 17)' : 'rgb(255 255 255)';
    const stripeElementsTextColor = currentTheme === 'dark' ? 'rgb(255 255 255)' : 'rgb(17 17 17)';

    const elementsOptions: StripeElementsOptions = {
      appearance: {
        labels: 'above',
        variables: {
          spacingAccordionItem: '8px',
          colorPrimary: stripeElementsTextColor,
        },
        theme: 'flat',
        rules: {
          '.AccordionItem:hover': {
            color: stripeElementsTextColor,
          },
          '.TermsText': {
            color: stripeElementsTextColor,
          },
          '.AccordionItem': {
            border: `1px solid ${stripeElementsBackgroundColor}`,
            backgroundColor: stripeElementsBackgroundColor,
          },
          '.Label': {
            color: stripeElementsTextColor,
          },
          '.RedirectText': {
            color: stripeElementsTextColor,
          },
        },
      },
    };

    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('promotion_code');

    if (planId) {
      handleFetchSelectedPlan(planId)
        .then(async (plan) => {
          dispatchReducer({
            type: 'SET_ELEMENTS_OPTIONS',
            payload: {
              ...(elementsOptions as any),
              mode: plan?.interval === 'lifetime' ? 'payment' : 'subscription',
              amount: plan?.amount,
              currency: plan?.currency,
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
    if (state.promoCode) {
      handleFetchPromotionCode(state.promoCode)
        .then((promoCode) => {
          dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: promoCode });
        })
        .catch((err) => {
          const error = err as Error;
          handleError('coupon', 'This code does not exist');
          errorService.reportError(error);
        });
    }
  }, [state.promoCode]);

  const authenticateUser = async (email: string, password: string, token: string) => {
    try {
      if (state.authMethod === 'signIn') {
        await authCheckoutService.logIn(email, password, '', dispatch);
      } else if (state.authMethod === 'signUp') {
        await authCheckoutService.signUp(doRegister, email, password, token, dispatch);
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
    handleAuthMethod('signIn');
  };

  const handleFetchSelectedPlan = useCallback(async (planId: string) => {
    dispatchReducer({ type: 'SET_IS_LOADING', payload: true });

    try {
      const plan = await fetchPlanById(planId);
      dispatchReducer({ type: 'SET_SELECTED_PLAN', payload: plan });
      return plan;
    } catch (error) {
      console.error('Error fetching plan or payment intent:', error);
    } finally {
      dispatchReducer({ type: 'SET_IS_LOADING', payload: false });
    }
  }, []);

  const handleFetchPromotionCode = useCallback(async (promotionCode: string) => {
    const promoCodeData = await fetchPromotionCodeByName(promotionCode);

    return promoCodeData;
  }, []);

  const handleOnInputChange = (coupon: string) => dispatchReducer({ type: 'SET_PROMO_CODE', payload: coupon });

  const handleAuthMethod = (method: AuthMethodTypes) => {
    dispatchReducer({ type: 'SET_AUTH_METHOD', payload: method });
  };

  const handleError = (type: ErrorType, error: string) => {
    dispatchReducer({ type: ERROR_TYPES[type], payload: error });
  };

  return state.isLoading ? (
    <></>
  ) : (
    <Elements stripe={state.stripe} options={state.elementsOptions}>
      <CheckoutView
        selectedPlan={state.selectedPlan}
        couponCodeData={state.couponCodeData}
        handleOnInputChange={handleOnInputChange}
        handleStripeError={handleError}
        errorStates={errorStates}
        onLogOut={onLogOut}
        authenticateUser={authenticateUser}
      />
    </Elements>
  );
};

export default CheckoutViewWrapper;
