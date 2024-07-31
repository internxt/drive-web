import { useEffect, useCallback, useReducer, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';

import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import errorService from '../../../core/services/error.service';
import CheckoutView from './CheckoutView';
import envService from '../../../core/services/env.service';
import { StripeElementsOptions, loadStripe } from '@stripe/stripe-js';
import databaseService from '../../../database/services/database.service';
import localStorageService from '../../../core/services/local-storage.service';
import RealtimeService from '../../../core/services/socket.service';
import authCheckoutService from '../../services/auth-checkout.service';
import { useAppDispatch } from '../../../store/hooks';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import { AuthMethodTypes, CurrentPlanSelected, ErrorType } from '../../types';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import checkoutService from 'app/payment/services/checkout.service';
import { useThemeContext } from 'app/theme/ThemeProvider';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';

export const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
  },
};

const ONE_YEAR_IN_MONTHS = 12;

export const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const { checkoutTheme } = useThemeContext();
  const dispatch = useAppDispatch();
  const { doRegister } = useSignUp('activate');

  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const [isUpsellSwitchActivated, setIsUpsellSwitchActivated] = useState<boolean>(false);

  const { authMethod, error, currentPlanSelected, plan, stripe, couponCodeData, elementsOptions, promoCodeName } =
    state;
  const { backgroundColor, textColor } = THEME_STYLES[checkoutTheme as string];

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

  const getClientSecret = async (selectedPlan: CurrentPlanSelected, customerId: string) => {
    if (selectedPlan?.interval === 'lifetime') {
      const { clientSecretType, client_secret } = await checkoutService.getClientSecretForPaymentIntent(
        customerId,
        selectedPlan.amount,
        selectedPlan.id,
        couponCodeData?.codeId,
      );

      return {
        type: clientSecretType,
        clientSecret: client_secret,
      };
    } else {
      const { clientSecretType, client_secret } = await checkoutService.getClientSecretForSubscriptionIntent(
        customerId,
        selectedPlan?.id as string,
        couponCodeData?.codeId,
      );
      return {
        type: clientSecretType,
        clientSecret: client_secret,
      };
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('promotion_code');

    if (planId) {
      handleFetchSelectedPlan(planId);
    } else {
      navigationService.push(AppView.Drive);
    }

    if (promotionCode) {
      handleFetchPromotionCode(promotionCode);
    }
  }, []);

  useEffect(() => {
    if (promoCodeName) {
      handleFetchPromotionCode(promoCodeName);
    }
  }, [promoCodeName]);

  const handleFetchSelectedPlan = useCallback(async (planId: string) => {
    try {
      const plan = await checkoutService.fetchPlanById(planId);
      dispatchReducer({ type: 'SET_PLAN', payload: plan });
      dispatchReducer({ type: 'SET_CURRENT_PLAN_SELECTED', payload: plan.selectedPlan });
      dispatchReducer({
        type: 'SET_ELEMENTS_OPTIONS',
        payload: {
          ...(elementsOptionsParams as any),
          mode: plan?.selectedPlan.interval === 'lifetime' ? 'payment' : 'subscription',
          amount: plan?.selectedPlan.amount,
          currency: plan?.selectedPlan.currency,
          payment_method_types: ['card', 'paypal'],
        },
      });

      const stripe = await stripePromise;
      dispatchReducer({ type: 'SET_STRIPE', payload: stripe });

      return plan;
    } catch (error) {
      console.error('Error fetching plan or payment intent:', error);
      errorService.reportError(error);
      navigationService.push(AppView.Drive);
    }
  }, []);

  const handleFetchPromotionCode = useCallback(async (promotionCode: string) => {
    try {
      const promoCodeData = await checkoutService.fetchPromotionCodeByName(promotionCode);
      const promoCode = {
        codeId: promoCodeData.codeId,
        codeName: promotionCode,
        amountOff: promoCodeData.amountOff,
        percentOff: promoCodeData.percentOff,
      };
      dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: promoCode });
    } catch (err) {
      const error = err as Error;
      errorService.reportError(error);
      console.error('ERROR FETCHING COUPON: ', error.message);
    }
  }, []);

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
      errorService.reportError(error);
      throw new Error('Authentication failed');
    }
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    handleAuthMethodChange('signIn');
  };

  const onCouponInputChange = (coupon: string) => dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: coupon });

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

  const upsellManager = {
    onUpsellSwitchButtonClicked: () => {
      setIsUpsellSwitchActivated(!isUpsellSwitchActivated);
      const planType = isUpsellSwitchActivated ? 'selectedPlan' : 'upsellPlan';
      dispatchReducer({ type: 'SET_CURRENT_PLAN_SELECTED', payload: plan![planType] });
      dispatchReducer({
        type: 'SET_ELEMENTS_OPTIONS',
        payload: {
          ...(elementsOptions as any),
          amount: plan![planType].amount,
        },
      });
    },
    isUpsellSwitchActivated,
    showUpsellSwitch: !!plan?.upsellPlan,
    amountSaved: plan?.upsellPlan
      ? (plan?.selectedPlan.amount * ONE_YEAR_IN_MONTHS - plan?.upsellPlan.amount) / 100
      : undefined,
    amount: plan?.upsellPlan?.decimalAmount,
  };

  return (
    <Elements stripe={stripe} options={elementsOptions}>
      {currentPlanSelected ? (
        <CheckoutView
          selectedPlan={currentPlanSelected}
          couponCodeData={couponCodeData}
          authMethod={authMethod}
          error={error}
          upsellManager={upsellManager}
          getClientSecret={getClientSecret}
          onCouponInputChange={onCouponInputChange}
          handleError={handleError}
          onLogOut={onLogOut}
          authenticateUser={authenticateUser}
          handleAuthMethod={handleAuthMethodChange}
        />
      ) : (
        <LoadingPulse />
      )}
    </Elements>
  );
};

export default CheckoutViewWrapper;
