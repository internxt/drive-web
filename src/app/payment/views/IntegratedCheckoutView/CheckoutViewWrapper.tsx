import { useEffect, useReducer, useState, BaseSyntheticEvent } from 'react';
import { Elements } from '@stripe/react-stripe-js';

import navigationService from '../../../core/services/navigation.service';
import { AppView, IFormValues } from '../../../core/types';
import errorService from '../../../core/services/error.service';
import CheckoutView from './CheckoutView';
import envService from '../../../core/services/env.service';
import {
  Stripe,
  StripeElements,
  StripeElementsOptions,
  StripeElementsOptionsMode,
  loadStripe,
} from '@stripe/stripe-js';
import databaseService from '../../../database/services/database.service';
import localStorageService from '../../../core/services/local-storage.service';
import RealtimeService from '../../../core/services/socket.service';
import authCheckoutService from '../../services/auth-checkout.service';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import { AuthMethodTypes, CurrentPlanSelected, PlanData } from '../../types';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import checkoutService from '../../../payment/services/checkout.service';
import { useThemeContext } from '../../../theme/ThemeProvider';
import LoadingPulse from '../../../shared/components/LoadingPulse/LoadingPulse';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import paymentService from '../../../payment/services/payment.service';
import { getDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { planActions, PlanState } from '../../../store/slices/plan';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { useCheckout } from 'hooks/checkout/useCheckout';

export const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
    borderColor: 'rgb(58, 58, 59)',
    borderInputColor: 'rgb(142, 142, 148)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
    borderColor: 'rgb(229, 229, 235)',
    borderInputColor: 'rgb(174, 174, 179)',
  },
};

const BORDER_SHADOW = 'rgb(0 102 255)';

export type UpsellManagerProps = {
  isUpsellSwitchActivated: boolean;
  showUpsellSwitch: boolean;
  onUpsellSwitchButtonClicked: () => void;
  amountSaved: number | undefined;
  amount: number | undefined;
};

export interface UserInfoProps {
  avatar: Blob | null;
  name: string;
  email: string;
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

const IS_PRODUCTION = envService.isProduction();

const RETURN_URL_DOMAIN = IS_PRODUCTION ? process.env.REACT_APP_HOSTNAME : 'http://localhost:3000';

let stripe;

export const stripePromise = (async () => {
  const stripeKey = IS_PRODUCTION ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const userPlan = useSelector((state: RootState) => state.plan) as PlanState;
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  const workspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const { doRegister } = useSignUp('activate');

  const { individualSubscription, businessSubscription } = userPlan;

  const subscription = !workspace ? individualSubscription : businessSubscription;
  const fullName = `${user?.name} ${user?.lastname}`;
  const isUserAuthenticated = !!user;
  const isAnyError = state.error?.coupon || state.error?.auth || state.error?.stripe;

  const {
    onRemoveAppliedCouponCode,
    setAuthMethod,
    setAvatarBlob,
    setCouponCodeName,
    setError,
    setIsUserPaying,
    setPlan,
    setPromoCodeData,
    setSelectedPlan,
    setStripeElementsOptions,
    setUserNameFromElementAddress,
  } = useCheckout(dispatchReducer);
  const [isUpsellSwitchActivated, setIsUpsellSwitchActivated] = useState<boolean>(false);
  const [isCheckoutReadyToRender, setIsCheckoutReadyToRender] = useState<boolean>(false);

  const {
    authMethod,
    currentSelectedPlan,
    plan,
    avatarBlob,
    userNameFromAddressElement,
    couponCodeData,
    elementsOptions,
    promoCodeName,
  } = state;

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email,
  };

  const upsellManager = {
    onUpsellSwitchButtonClicked: () => {
      setIsUpsellSwitchActivated(!isUpsellSwitchActivated);

      const planType = isUpsellSwitchActivated ? 'selectedPlan' : 'upsellPlan';
      const stripeElementsOptions = {
        ...(elementsOptions as StripeElementsOptionsMode),
        amount: plan![planType].amount,
      };
      setSelectedPlan(plan![planType]);
      setStripeElementsOptions(stripeElementsOptions);
    },
    isUpsellSwitchActivated,
    showUpsellSwitch: !!plan?.upsellPlan,
    amountSaved: plan?.upsellPlan
      ? (plan?.selectedPlan.amount * ONE_YEAR_IN_MONTHS - plan?.upsellPlan.amount) / 100
      : undefined,
    amount: plan?.upsellPlan?.decimalAmount,
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('couponCode');
    const currency = params.get('currency');

    const currencyValue = currency ?? 'eur';

    if (!planId) {
      navigationService.push(AppView.Drive);
      return;
    }

    handleFetchSelectedPlan(planId, currencyValue)
      .then((plan) => {
        if (user && subscription?.type === 'subscription' && plan?.selectedPlan.interval !== 'lifetime') {
          setIsCheckoutReadyToRender(false);
          updateUserSubscription(planId);
          return;
        }
        if (checkoutTheme && plan) {
          if (promotionCode) {
            handleFetchPromotionCode(plan.selectedPlan.id as string, promotionCode).catch((err) => {
              const showPromoCodeErrorNotification = true;
              handlePromoCodeError(err, showPromoCodeErrorNotification);
            });
          }

          const { backgroundColor, textColor, borderColor, borderInputColor } = THEME_STYLES[checkoutTheme as string];
          loadStripeElements(textColor, backgroundColor, borderColor, borderInputColor, plan);
        }
      })
      .catch(() => {});

    setIsCheckoutReadyToRender(true);
  }, [checkoutTheme]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthMethod('userIsSignedIn');
      getDatabaseProfileAvatar()
        .then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null))
        .catch(() => {
          //
        });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (promoCodeName && currentSelectedPlan) {
      handleFetchPromotionCode(currentSelectedPlan?.id, promoCodeName).catch(handlePromoCodeError);
    }
  }, [promoCodeName]);

  useEffect(() => {
    if (isAnyError) {
      setTimeout(() => {
        setError('auth', undefined);
        setError('stripe', undefined);
        setError('coupon', undefined);
      }, 4000);
    }
  }, [state.error]);

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();
    setIsUserPaying(true);

    const { email, password } = formData;

    const userData = getUserInfo(user, email, userNameFromAddressElement, fullName);

    try {
      await authCheckoutService.authenticateUser(email, password, authMethod, dispatch, doRegister);
    } catch (err) {
      const error = err as Error;
      setIsUserPaying(false);
      setError('auth', error.message);
      errorService.reportError(error);
      return;
    }

    try {
      if (!stripeSDK || !elements) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const { customerId, token } = await paymentService.getCustomerId(userData.name, userData.email);

      await elements.submit();

      const { clientSecret, type } = await checkoutService.getClientSecret(
        currentSelectedPlan as CurrentPlanSelected,
        token,
        customerId,
        couponCodeData?.codeId,
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
        setError('stripe', error.message as string);
      }
    } catch (err) {
      const error = err as Error;
      errorService.reportError(error);
    } finally {
      setIsUserPaying(false);
    }
  };

  const loadStripeElements = async (
    textColor: string,
    backgroundColor: string,
    borderColor: string,
    borderInputColor: string,
    plan: PlanData,
  ) => {
    const stripeElementsOptions: StripeElementsOptions = {
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
          '.Block': {
            backgroundColor: backgroundColor,
          },
          '.TermsText': {
            color: textColor,
          },
          '.AccordionItem': {
            borderRadius: '16px',
            borderColor: borderColor,
            border: '1px solid',
            backgroundColor: backgroundColor,
          },
          '.Input': {
            backgroundColor: 'transparent',
            borderRadius: '0.375rem',
            color: textColor,
            border: `1px solid ${borderInputColor}`,
          },
          '.Input:focus': {
            backgroundColor: backgroundColor,
            // borderColor: borderInputColor,
            boxShadow: `0px 0px 4px ${BORDER_SHADOW}`,
            border: `0.5px solid ${BORDER_SHADOW}`,
          },
          '.Input::selection': {
            backgroundColor: backgroundColor,
            // borderColor: borderInputColor,
            border: `0.5px solid ${BORDER_SHADOW}`,
          },
          '.Label': {
            color: textColor,
          },
          '.RedirectText': {
            color: textColor,
          },
        },
      },
      mode: plan?.selectedPlan.interval === 'lifetime' ? 'payment' : 'subscription',
      amount: plan?.selectedPlan.amount,
      currency: plan?.selectedPlan.currency,
      payment_method_types: ['card', 'paypal'],
    };

    setStripeElementsOptions(stripeElementsOptions);

    stripe = await stripePromise;
  };

  const handleFetchSelectedPlan = async (planId: string, currency?: string) => {
    try {
      const plan = await checkoutService.fetchPlanById(planId, currency);
      setPlan(plan);
      setSelectedPlan(plan.selectedPlan);

      return plan;
    } catch (error) {
      errorService.reportError(error);
      if (user) {
        navigationService.push(AppView.Drive);
      } else {
        navigationService.push(AppView.Signup);
      }
    }
  };

  const handleFetchPromotionCode = async (priceId: string, promotionCode: string) => {
    const promoCodeData = await checkoutService.fetchPromotionCodeByName(priceId, promotionCode);
    const promoCode = {
      codeId: promoCodeData.codeId,
      codeName: promotionCode,
      amountOff: promoCodeData.amountOff,
      percentOff: promoCodeData.percentOff,
    };
    setPromoCodeData(promoCode);
  };

  const updateUserSubscription = async (planId: string, coupon?: string) => {
    try {
      const couponCode = coupon === 'null' ? undefined : coupon;
      const { userSubscription } = await paymentService.updateSubscriptionPrice(planId, couponCode);
      if (userSubscription && userSubscription.type === 'subscription') {
        if (userSubscription.userType == UserType.Individual)
          dispatch(planActions.setSubscriptionIndividual(userSubscription));
        if (userSubscription.userType == UserType.Business)
          dispatch(planActions.setSubscriptionBusiness(userSubscription));
      }
    } catch (err) {
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    } finally {
      navigationService.push(AppView.Drive);
    }
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signIn');
  };

  const getUserInfo = (user: UserSettings, email: string, userNameFromAddressElement: string, fullName: string) => {
    let userData;

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

    return userData;
  };

  const handlePromoCodeError = (err: unknown, showNotification?: boolean) => {
    const error = err as Error;
    const errorMessage = error.message.includes('Promotion code with an id')
      ? error.message
      : 'Something went wrong, try again later';
    setError('coupon', errorMessage);
    errorService.reportError(error);
    setPromoCodeData(undefined);

    if (showNotification) {
      notificationsService.show({
        text: errorMessage,
        type: ToastType.Error,
      });
    }
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: setCouponCodeName,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    handleAuthMethodChange: setAuthMethod,
    onUserNameFromAddressElementChange: setUserNameFromElementAddress,
  };

  return (
    <>
      {isCheckoutReadyToRender && elementsOptions && stripe ? (
        <Elements stripe={stripe} options={elementsOptions}>
          <CheckoutView
            checkoutViewVariables={state}
            userInfo={userInfo}
            isUserAuthenticated={isUserAuthenticated}
            upsellManager={upsellManager}
            authMethod={authMethod}
            checkoutViewManager={checkoutViewManager}
          />
        </Elements>
      ) : (
        <LoadingPulse />
      )}
    </>
  );
};

export default CheckoutViewWrapper;
