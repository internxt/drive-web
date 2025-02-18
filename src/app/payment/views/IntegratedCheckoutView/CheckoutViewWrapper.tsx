import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements, StripeElementsOptionsMode } from '@stripe/stripe-js';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef } from 'react';
import { useSelector } from 'react-redux';

import { Loader } from '@internxt/ui';
import { bytesToString } from 'app/drive/services/size.service';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import { useCheckout } from 'hooks/checkout/useCheckout';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import envService from '../../../core/services/env.service';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import RealtimeService from '../../../core/services/socket.service';
import { AppView, IFormValues } from '../../../core/types';
import databaseService from '../../../database/services/database.service';
import { getDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import ChangePlanDialog from '../../../newSettings/Sections/Account/Plans/components/ChangePlanDialog';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import checkoutService from '../../../payment/services/checkout.service';
import paymentService from '../../../payment/services/payment.service';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { planThunks } from '../../../store/slices/plan';
import { useThemeContext } from '../../../theme/ThemeProvider';
import authCheckoutService from '../../services/auth-checkout.service';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import { AuthMethodTypes, CouponCodeData, RequestedPlanData } from '../../types';
import CheckoutView from './CheckoutView';

export const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
    borderColor: 'rgb(58, 58, 59)',
    borderInputColor: 'rgb(142, 142, 148)',
    labelTextColor: 'rgb(229 229 235)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
    borderColor: 'rgb(229, 229, 235)',
    borderInputColor: 'rgb(174, 174, 179)',
    labelTextColor: 'rgb(58 58 59)',
  },
};

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
  onCountryChange: (country: string) => void;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onUserNameFromAddressElementChange: (userName: string) => void;
  onSeatsChange: (seat: number) => void;
}

const ONE_YEAR_IN_MONTHS = 12;
const IS_PRODUCTION = envService.isProduction();
const RETURN_URL_DOMAIN = IS_PRODUCTION ? process.env.REACT_APP_HOSTNAME : 'http://localhost:3000';
const STATUS_CODE_ERROR = {
  USER_EXISTS: 409,
  COUPON_NOT_VALID: 422,
  PROMO_CODE_BY_NAME_NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

function savePaymentDataInLocalStorage(
  subscriptionId: string | undefined,
  paymentIntentId: string | undefined,
  selectedPlan: RequestedPlanData | undefined,
  users: number,
  couponCodeData: CouponCodeData | undefined,
) {
  if (subscriptionId) localStorageService.set('subscriptionId', subscriptionId);
  if (paymentIntentId) localStorageService.set('paymentIntentId', paymentIntentId);
  if (selectedPlan) {
    const planName = bytesToString(selectedPlan.bytes) + selectedPlan.interval;
    const amountToPay = getProductAmount(selectedPlan.decimalAmount, users, couponCodeData);

    localStorageService.set('productName', planName);
    localStorageService.set('amountPaid', amountToPay);
    localStorageService.set('priceId', selectedPlan.id);
    localStorageService.set('currency', selectedPlan.currency);
  }
}

let stripeSdk: Stripe;

const CheckoutViewWrapper = () => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { doRegister } = useSignUp('activate');
  const userAuthComponentRef = useRef<HTMLDivElement>(null);

  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;
  const isUserAuthenticated = !!user;
  const thereIsAnyError = state.error?.coupon || state.error?.auth || state.error?.stripe;

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
    setSeatsForBusinessSubscription,
    setCountry,
    setPrices,
    setIsCheckoutReadyToRender,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
    setIsUpsellSwitchActivated,
  } = useCheckout(dispatchReducer);

  const {
    authMethod,
    currentSelectedPlan,
    plan,
    avatarBlob,
    userNameFromAddressElement,
    couponCodeData,
    elementsOptions,
    promoCodeName,
    seatsForBusinessSubscription,
    country,
    isCheckoutReadyToRender,
    isUpdateSubscriptionDialogOpen,
    isUpdatingSubscription,
    isUpsellSwitchActivated,
    prices,
  } = state;

  const canChangePlanDialogBeOpened = prices && currentSelectedPlan && isUpdateSubscriptionDialogOpen;

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email ?? '',
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

    paymentService
      .getStripe()
      .then((stripe) => (stripeSdk = stripe))
      .catch((error) => {
        errorService.reportError(error);
        if (user) {
          navigationService.push(AppView.Drive);
        } else {
          navigationService.push(AppView.Signup);
        }
      });

    handleFetchSelectedPlan(planId, currencyValue)
      .then(async (plan) => {
        if (checkoutTheme && plan) {
          if (promotionCode) {
            handleFetchPromotionCode(plan.selectedPlan.id, promotionCode).catch(handlePromoCodeError);
          }

          checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme as string], setStripeElementsOptions, plan);
          const prices = await checkoutService.fetchPrices(plan.selectedPlan.type, currencyValue);
          setPrices(prices);
          setIsCheckoutReadyToRender(true);
        }
      })
      .catch((error) => {
        errorService.reportError(error);
        if (user) {
          navigationService.push(AppView.Drive);
        } else {
          navigationService.push(AppView.Signup);
        }
      });
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
    if (thereIsAnyError) {
      setTimeout(() => {
        setError('auth', undefined);
        setError('stripe', undefined);
        setError('coupon', undefined);
      }, 8000);
    }
  }, [state.error]);

  const onChangePlanClicked = async (priceId: string, currency: string) => {
    setIsUpdatingSubscription(true);
    await handleSubscriptionPayment(priceId);
    setIsUpdateSubscriptionDialogOpen(false);
    setIsUpdatingSubscription(false);
    navigationService.push(AppView.Drive);
  };

  const showSuccessSubscriptionNotification = useCallback(
    () => notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success }),
    [translate],
  );

  const showCancelSubscriptionErrorNotification = useCallback(
    () =>
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      }),
    [translate],
  );

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    dispatch(planThunks.initializeThunk()).unwrap();
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    if (!currentSelectedPlan) return;

    try {
      const updatedSubscription = await paymentService.updateSubscriptionPrice({
        priceId,
        userType: currentSelectedPlan.type,
      });
      if (updatedSubscription.request3DSecure) {
        stripeSdk
          .confirmCardPayment(updatedSubscription.clientSecret)
          .then(async (result) => {
            if (result.error) {
              notificationsService.show({
                type: ToastType.Error,
                text: result.error.message as string,
              });
            } else {
              handlePaymentSuccess();
            }
          })
          .catch((err) => {
            const error = errorService.castError(err);
            errorService.reportError(error);
            showCancelSubscriptionErrorNotification();
          });
      } else {
        handlePaymentSuccess();
      }
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      showCancelSubscriptionErrorNotification();
    }
  };

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();

    setIsUserPaying(true);

    const { email, password, companyName, companyVatId } = formData;
    const isStripeNotLoaded = !stripeSDK || !elements;
    const customerName = companyName ?? userNameFromAddressElement;

    try {
      await authCheckoutService.authenticateUser({ email, password, authMethod, dispatch, doRegister });
    } catch (err) {
      const error = err as Error;
      setError('auth', error.message);
      (userAuthComponentRef.current as any).scrollIntoView();
      errorService.reportError(error);
      setIsUserPaying(false);
      return;
    }

    try {
      if (isStripeNotLoaded) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const { error: elementsError } = await elements.submit();

      if (elementsError) {
        throw new Error(elementsError.message);
      }

      const { customerId, token } = await paymentService.getCustomerId(
        customerName,
        email ?? user?.email,
        country,
        companyVatId,
      );

      const { clientSecret, type, subscriptionId, paymentIntentId, invoiceStatus } =
        await checkoutService.getClientSecret({
          selectedPlan: currentSelectedPlan as RequestedPlanData,
          token,
          customerId,
          promoCodeId: couponCodeData?.codeId,
          seatsForBusinessSubscription,
        });

      // Store subscriptionId, paymentIntendId, and amountPaid to send to IMPACT API
      savePaymentDataInLocalStorage(
        subscriptionId,
        paymentIntentId,
        plan?.selectedPlan,
        seatsForBusinessSubscription,
        couponCodeData,
      );

      // !DO NOT REMOVE THIS
      // If there is a one time payment with a 100% OFF coupon code, the invoice will be marked as 'paid' by Stripe and
      // no client secret will be provided.
      if (invoiceStatus && invoiceStatus === 'paid') {
        navigationService.push(AppView.CheckoutSuccess);
        return;
      }

      const confirmIntent = type === 'setup' ? stripeSDK.confirmSetup : stripeSDK.confirmPayment;

      const { error: confirmIntentError } = await confirmIntent({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${RETURN_URL_DOMAIN}/checkout/success`,
        },
      });

      if (confirmIntentError) {
        throw new Error(confirmIntentError.message);
      }
    } catch (err) {
      const statusCode = (err as any).status;

      if (statusCode === STATUS_CODE_ERROR.BAD_REQUEST) {
        notificationsService.show({
          text: translate('notificationMessages.invalidTaxIdIsProvided'),
          type: ToastType.Error,
        });
      } else if (statusCode === STATUS_CODE_ERROR.USER_EXISTS) {
        setIsUpdateSubscriptionDialogOpen(true);
      } else if (statusCode === STATUS_CODE_ERROR.COUPON_NOT_VALID) {
        notificationsService.show({
          text: translate('notificationMessages.couponIsNotValidForUserError'),
          type: ToastType.Error,
        });
      } else {
        notificationsService.show({
          text: translate('notificationMessages.errorCreatingSubscription'),
          type: ToastType.Error,
        });
      }

      errorService.reportError(err);
    } finally {
      setIsUserPaying(false);
    }
  };

  const handleFetchSelectedPlan = async (planId: string, currency?: string) => {
    const plan = await checkoutService.fetchPlanById(planId, currency);
    setPlan(plan);
    setSelectedPlan(plan.selectedPlan);
    if (plan.selectedPlan.minimumSeats) {
      setSeatsForBusinessSubscription(plan.selectedPlan.minimumSeats);
    }

    return plan;
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

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signUp');
  };

  const handlePromoCodeError = (err: unknown, showNotification?: boolean) => {
    const error = err as Error;
    const statusCode = (err as any).status;
    let errorMessage = translate('notificationMessages.errorApplyingCoupon');
    if (statusCode) {
      if (
        statusCode === STATUS_CODE_ERROR.PROMO_CODE_BY_NAME_NOT_FOUND ||
        statusCode === STATUS_CODE_ERROR.BAD_REQUEST
      ) {
        errorMessage = error.message;
      }
    }
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

  const onCountryChange = (country: string) => {
    setCountry(country);
  };

  const onSeatsChange = (seats: number) => {
    const minSeats = currentSelectedPlan?.minimumSeats;
    const maxSeats = currentSelectedPlan?.maximumSeats;

    if (maxSeats && seats > maxSeats) {
      setSeatsForBusinessSubscription(maxSeats);
    } else if (minSeats && seats < minSeats) {
      setSeatsForBusinessSubscription(minSeats);
    } else {
      setSeatsForBusinessSubscription(seats);
    }
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: setCouponCodeName,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    onCountryChange,
    handleAuthMethodChange: setAuthMethod,
    onUserNameFromAddressElementChange: setUserNameFromElementAddress,
    onSeatsChange,
  };

  return (
    <>
      {isCheckoutReadyToRender && elementsOptions && stripeSdk ? (
        <Elements stripe={stripeSdk} options={{ ...elementsOptions }}>
          <CheckoutView
            checkoutViewVariables={state}
            userAuthComponentRef={userAuthComponentRef}
            userInfo={userInfo}
            isUserAuthenticated={isUserAuthenticated}
            upsellManager={upsellManager}
            checkoutViewManager={checkoutViewManager}
          />
          {canChangePlanDialogBeOpened ? (
            <ChangePlanDialog
              prices={prices}
              isDialogOpen={isUpdateSubscriptionDialogOpen}
              setIsDialogOpen={setIsUpdateSubscriptionDialogOpen}
              onPlanClick={onChangePlanClicked}
              priceIdSelected={currentSelectedPlan.id}
              isUpdatingSubscription={isUpdatingSubscription}
              subscriptionSelected={currentSelectedPlan.type}
            />
          ) : undefined}
        </Elements>
      ) : (
        <Loader type="pulse" />
      )}
    </>
  );
};

export default CheckoutViewWrapper;
