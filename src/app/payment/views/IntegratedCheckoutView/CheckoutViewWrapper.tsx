import { useEffect, useCallback, useReducer, useState, BaseSyntheticEvent } from 'react';
import { Elements } from '@stripe/react-stripe-js';

import navigationService from '../../../core/services/navigation.service';
import { AppView, IFormValues } from '../../../core/types';
import errorService from '../../../core/services/error.service';
import CheckoutView from './CheckoutView';
import envService from '../../../core/services/env.service';
import { Stripe, StripeElements, StripeElementsOptions, loadStripe } from '@stripe/stripe-js';
import databaseService from '../../../database/services/database.service';
import localStorageService from '../../../core/services/local-storage.service';
import RealtimeService from '../../../core/services/socket.service';
import authCheckoutService from '../../services/auth-checkout.service';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import { AuthMethodTypes, CouponCodeData, CurrentPlanSelected, ErrorType } from '../../types';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import checkoutService from 'app/payment/services/checkout.service';
import { useThemeContext } from 'app/theme/ThemeProvider';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import paymentService from 'app/payment/services/payment.service';
import { getDatabaseProfileAvatar } from 'app/drive/services/database.service';

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

export type UpsellManagerProps = {
  isUpsellSwitchActivated: boolean;
  showUpsellSwitch: boolean;
  onUpsellSwitchButtonClicked: () => void;
  amountSaved: number | undefined;
  amount: number | undefined;
};

export interface CheckoutViewVariables {
  isPaying: boolean;
  error: Partial<Record<ErrorType, string>> | undefined;

  couponCodeData: CouponCodeData | undefined;
  userInfo: {
    avatar: Blob | null;
    name: string;
    email: string;
  };
  currentSelectedPlan: CurrentPlanSelected | null;
  upsellManager: UpsellManagerProps;
}

export interface CheckoutViewManager {
  onCouponInputChange: (coupon: string) => void;
  onLogOut: () => Promise<void>;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onUserNameFromAddressElementChange: (userName: string) => void;
}

const ONE_YEAR_IN_MONTHS = 12;

const RETURN_URL_DOMAIN =
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.REACT_APP_HOSTNAME;

export const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const { checkoutTheme } = useThemeContext();
  const dispatch = useAppDispatch();
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const { doRegister } = useSignUp('activate');

  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const [isUpsellSwitchActivated, setIsUpsellSwitchActivated] = useState<boolean>(false);

  const fullName = `${user?.name} ${user?.lastname}`;

  const {
    authMethod,
    error,
    currentSelectedPlan,
    plan,
    isPaying,
    avatarBlob,
    userNameFromAddressElement,
    stripe,
    couponCodeData,
    elementsOptions,
    promoCodeName,
  } = state;

  const userInfo = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email,
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

  const checkoutViewVariables: CheckoutViewVariables = {
    isPaying,
    error,
    userInfo,
    couponCodeData,
    currentSelectedPlan,
    upsellManager,
  };

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

  const getClientSecret = async (selectedPlan: CurrentPlanSelected, token: string, customerId: string) => {
    if (selectedPlan?.interval === 'lifetime') {
      const { clientSecretType, client_secret } = await checkoutService.getClientSecretForPaymentIntent(
        customerId,
        selectedPlan.amount,
        selectedPlan.id,
        token,
        couponCodeData?.codeId,
      );

      return {
        type: clientSecretType,
        clientSecret: client_secret,
      };
    } else {
      const { clientSecretType, client_secret } = await checkoutService.getClientSecretForSubscriptionIntent(
        customerId,
        selectedPlan?.id,
        token,
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
    const promotionCode = params.get('couponCode');

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

  useEffect(() => {
    if (isAuthenticated) {
      handleAuthMethodChange('userIsSignedIn');
      getDatabaseProfileAvatar()
        .then((avatarData) =>
          dispatchReducer({
            type: 'SET_AVATAR_BLOB',
            payload: avatarData?.avatarBlob ?? null,
          }),
        )
        .catch(() => {
          //
        });
    }
  }, [user]);

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

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    handleAuthMethodChange('signIn');
  };

  const onUserNameFromAddressElementChange = (userName: string) =>
    dispatchReducer({ type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT', payload: userName });

  const onCouponInputChange = (coupon: string) => dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: coupon });

  const onRemoveAppliedCouponCode = () => {
    dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: undefined });
    dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: undefined });
  };

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

  const setIsUserPaying = (isPaying: boolean) => {
    dispatchReducer({
      type: 'SET_IS_PAYING',
      payload: isPaying,
    });
  };

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();
    setIsUserPaying(true);

    let userData;

    const { email, password } = formData;

    if (user) {
      userData = {
        name: fullName,
        email: user.email,
      };
    } else {
      userData = {
        name: userNameFromAddressElement,
        email: email,
      };
    }

    try {
      await authCheckoutService.authenticateUser(email, password, authMethod, dispatch, doRegister);
    } catch (err) {
      const error = err as Error;
      handleError('auth', error.message);
      errorService.reportError(error);
      return;
    }

    try {
      if (!stripeSDK || !elements) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const { customerId, token } = await paymentService.getCustomerId(userData.name, userData.email);

      const { error: submitError } = await elements.submit();

      if (submitError) {
        handleError('stripe', submitError.message as string);
      }

      const { clientSecret, type } = await getClientSecret(
        currentSelectedPlan as CurrentPlanSelected,
        token,
        customerId,
      );

      const confirmIntent = type === 'setup' ? stripeSDK.confirmSetup : stripeSDK.confirmPayment;

      const { error } = await confirmIntent({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${RETURN_URL_DOMAIN}/checkout/success`,
        },
      });

      if (error) {
        handleError('stripe', error.message as string);
        console.error('Error in payment intent confirmation: ', error.message);
      }
    } catch (err) {
      const error = err as Error;
      errorService.reportError(error);
      console.error('Error creating subscription: ', error.stack ?? error.message);
    } finally {
      setIsUserPaying(false);
    }
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    handleAuthMethodChange,
    onUserNameFromAddressElementChange,
  };

  return (
    <Elements stripe={stripe} options={elementsOptions}>
      {currentSelectedPlan ? (
        <CheckoutView
          checkoutViewVariables={checkoutViewVariables}
          authMethod={authMethod}
          checkoutViewManager={checkoutViewManager}
        />
      ) : (
        <LoadingPulse />
      )}
    </Elements>
  );
};

export default CheckoutViewWrapper;
