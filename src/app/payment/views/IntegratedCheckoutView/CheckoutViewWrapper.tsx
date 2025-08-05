import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements, StripeElementsOptions } from '@stripe/stripe-js';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { UserLocation } from '@internxt/sdk';
import { Loader } from '@internxt/ui';
import { sendConversionToAPI } from 'app/analytics/googleSheet.service';
import { savePaymentDataInLocalStorage } from 'app/analytics/impact.service';
import { userLocation } from 'app/utils/userLocation';
import { useCheckout } from 'hooks/checkout/useCheckout';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import envService from '../../../core/services/env.service';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import RealtimeService from '../../../core/services/socket.service';
import { STORAGE_KEYS } from '../../../core/services/storage-keys';
import AppError, { AppView, IFormValues } from '../../../core/types';
import databaseService from '../../../database/services/database.service';
import { getDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import ChangePlanDialog from '../../../newSettings/Sections/Account/Plans/components/ChangePlanDialog';
import longNotificationsService from '../../../notifications/services/longNotification.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import checkoutService from '../../../payment/services/checkout.service';
import paymentService from '../../../payment/services/payment.service';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { planThunks } from '../../../store/slices/plan';
import { useThemeContext } from '../../../theme/ThemeProvider';
import authCheckoutService from '../../services/auth-checkout.service';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import { AuthMethodTypes } from '../../types';
import CheckoutView from './CheckoutView';

const GCLID_COOKIE_LIFESPAN_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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
  onCouponInputChange: (coupon?: string) => void;
  onLogOut: () => Promise<void>;
  onCountryChange: (country: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
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

const STATUS_CODE_ERROR = {
  USER_EXISTS: 409,
  COUPON_NOT_VALID: 422,
  PROMO_CODE_BY_NAME_NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
};

let stripeSdk: Stripe;

const CheckoutViewWrapper = () => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { doRegister } = useSignUp('activate');
  const userAuthComponentRef = useRef<HTMLDivElement>(null);
  const [userLocationData, setUserLocationData] = useState<UserLocation>();

  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;
  const isUserAuthenticated = !!user;
  const thereIsAnyError = state.error?.coupon || state.error?.auth || state.error?.stripe;

  const gclidStored = localStorageService.get(STORAGE_KEYS.GCLID);

  const {
    onRemoveAppliedCouponCode,
    setAuthMethod,
    setAvatarBlob,
    setCouponCodeName,
    setError,
    setIsUserPaying,
    setPromoCodeData,
    setSelectedPlan,
    setStripeElementsOptions,
    setUserNameFromElementAddress,
    setSeatsForBusinessSubscription,
    setPrices,
    setIsCheckoutReadyToRender,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  } = useCheckout(dispatchReducer);

  const {
    authMethod,
    currentSelectedPlan,
    avatarBlob,
    userNameFromAddressElement,
    couponCodeData,
    elementsOptions,
    promoCodeName,
    seatsForBusinessSubscription,
    isUpsellSwitchActivated,
    isCheckoutReadyToRender,
    isUpdateSubscriptionDialogOpen,
    isUpdatingSubscription,
    prices,
  } = state;

  const renewsAtPCComp = `${translate('checkout.productCard.pcMobileRenews')}`;

  const canChangePlanDialogBeOpened = prices && currentSelectedPlan?.price && isUpdateSubscriptionDialogOpen;

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email ?? '',
  };

  // TODO: Remove dead code
  const upsellManager = {
    onUpsellSwitchButtonClicked: () => {},
    isUpsellSwitchActivated,
    showUpsellSwitch: false,
    amountSaved: undefined,
    amount: undefined,
  };

  useEffect(() => {
    const { planId, promotionCode, currency, paramMobileToken, gclid } = getCheckoutQueryParams();
    setMobileToken(paramMobileToken);
    const currencyValue = currency ?? 'eur';

    if (!planId) {
      redirectToFallbackPage();
      return;
    }

    if (gclid) {
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + GCLID_COOKIE_LIFESPAN_DAYS * MILLISECONDS_PER_DAY);
      document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/`;
      localStorageService.set(STORAGE_KEYS.GCLID, gclid);
    }

    initializeStripe()
      .then(() => fetchUserLocationAndStore())
      .then((location) => loadCheckoutData(planId, currencyValue, promotionCode, location?.ip))
      .catch(() => redirectToFallbackPage());
  }, [checkoutTheme, mobileToken]);

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
    if (!currentSelectedPlan?.price?.id || !currentSelectedPlan?.price?.currency) {
      return;
    }

    if (userLocationData?.location !== country && postalCode) {
      recalculatePrice(
        currentSelectedPlan.price.id,
        currentSelectedPlan.price.currency,
        promoCodeName,
        postalCode,
        country,
      );
    }
  }, [country, postalCode, currentSelectedPlan?.price?.id, currentSelectedPlan?.price?.currency]);

  useEffect(() => {
    if (thereIsAnyError) {
      setTimeout(() => {
        setError('auth', undefined);
        setError('stripe', undefined);
        setError('coupon', undefined);
      }, 8000);
    }
  }, [state.error]);

  const onCheckoutCouponChanges = async (promoCodeName?: string) => {
    if (!currentSelectedPlan?.price?.id) {
      return;
    }

    try {
      if (promoCodeName) {
        setCouponCodeName(promoCodeName);
        await handleFetchPromotionCode(currentSelectedPlan.price.id, promoCodeName);
      }
    } catch (error) {
      handlePromoCodeError(error);
    }

    try {
      const priceWithTaxes = await checkoutService.getPriceById({
        priceId: currentSelectedPlan.price.id,
        userAddress: userLocationData?.ip,
        promoCodeName,
      });
      setSelectedPlan(priceWithTaxes);
    } catch (error) {
      if (user) {
        navigationService.push(AppView.Drive);
      } else {
        navigationService.push(AppView.Signup);
      }
    }
  };

  const getCheckoutQueryParams = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      planId: params.get('planId'),
      promotionCode: params.get('couponCode'),
      currency: params.get('currency'),
      paramMobileToken: params.get('mobileToken'),
      gclid: params.get('gclid') ?? '',
    };
  };

  const redirectToFallbackPage = () => {
    if (user) {
      navigationService.push(AppView.Drive);
    } else {
      navigationService.push(AppView.Signup);
    }
  };

  const initializeStripe = async (): Promise<void> => {
    try {
      const stripe = await paymentService.getStripe();
      stripeSdk = stripe;
    } catch {
      redirectToFallbackPage();
      throw new Error('Stripe failed to load');
    }
  };

  const fetchUserLocationAndStore = async (): Promise<UserLocation | undefined> => {
    try {
      const location = await userLocation();
      setUserLocationData(location);
      return location;
    } catch {
      // NO OP
      return undefined;
    }
  };

  const loadCheckoutData = async (
    planId: string,
    currencyValue: string,
    promotionCode: string | null,
    userAddress?: UserLocation['ip'],
  ): Promise<void> => {
    try {
      const price = await handleFetchSelectedPlan(planId, promotionCode, currencyValue, userAddress);
      if (checkoutTheme && price) {
        if (promotionCode) {
          handleFetchPromotionCode(price.price.id, promotionCode).catch(handlePromoCodeError);
        }

        const stripeElements = await checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme as string], price);
        setStripeElementsOptions(stripeElements as StripeElementsOptions);
        const prices = await checkoutService.fetchPrices(price.price.type, currencyValue);
        setPrices(prices);
        setIsCheckoutReadyToRender(true);
      }
    } catch {
      redirectToFallbackPage();
    }
  };

  const onChangePlanClicked = async (priceId: string) => {
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

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    dispatch(planThunks.initializeThunk()).unwrap();
  };

  const handleErrorMessage = (error: AppError, defaultErrorMessage: string) => {
    if (error?.status && error?.status >= STATUS_CODE_ERROR.INTERNAL_SERVER_ERROR) {
      notificationsService.show({
        text: defaultErrorMessage,
        type: ToastType.Error,
      });
    } else {
      longNotificationsService.show({
        type: ToastType.Error,
        text: error?.message,
      });
    }
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    if (!currentSelectedPlan?.price?.type) {
      console.error('No selected plan available for subscription payment');
      return;
    }

    try {
      const updatedSubscription = await paymentService.updateSubscriptionPrice({
        priceId,
        userType: currentSelectedPlan.price.type,
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
            handleErrorMessage(error, translate('notificationMessages.errorCancelSubscription'));
          });
      } else {
        handlePaymentSuccess();
      }
    } catch (err) {
      const error = errorService.castError(err);
      handleErrorMessage(error, translate('notificationMessages.errorCancelSubscription'));
    }
  };

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();

    if (!currentSelectedPlan?.price?.id) {
      console.error('No selected plan available for checkout');
      setIsUserPaying(false);
      return;
    }

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

      const { customerId, token } = await checkoutService.getCustomerId({
        customerName,
        countryCode: country,
        postalCode,
        vatId: companyVatId,
      });

      if (mobileToken) {
        const setupIntent = await checkoutService.checkoutSetupIntent(customerId);
        localStorageService.set('customerId', customerId);
        localStorageService.set('token', token);
        localStorageService.set('priceId', currentSelectedPlan.price.id);
        localStorageService.set('customerToken', token);
        localStorageService.set('mobileToken', mobileToken);
        const RETURN_URL_DOMAIN = envService.getVariable('hostname');
        const { error: confirmIntentError } = await stripeSDK.confirmSetup({
          elements,
          clientSecret: setupIntent.clientSecret,
          confirmParams: {
            return_url: `${RETURN_URL_DOMAIN}/checkout/pcCloud-success?mobileToken=${mobileToken}&priceId=${currentSelectedPlan.price.id}`,
          },
        });

        if (confirmIntentError) {
          throw new Error(confirmIntentError.message);
        }
      } else {
        const { clientSecret, type, subscriptionId, paymentIntentId, invoiceStatus } =
          await checkoutService.getClientSecret({
            selectedPlan: currentSelectedPlan,
            token,
            mobileToken,
            customerId,
            promoCodeId: couponCodeData?.codeId,
            seatsForBusinessSubscription,
          });

        // Store subscriptionId, paymentIntentId, and amountPaid to send to IMPACT API once the payment is done
        savePaymentDataInLocalStorage(
          subscriptionId,
          paymentIntentId,
          currentSelectedPlan,
          seatsForBusinessSubscription,
          couponCodeData,
        );

        if (gclidStored) {
          await sendConversionToAPI({
            gclid: gclidStored,
            name: `Checkout - ${currentSelectedPlan.price.type}`,
            value: currentSelectedPlan,
            currency: currentSelectedPlan.price.currency,
            timestamp: new Date(),
            users: seatsForBusinessSubscription,
            couponCodeData: couponCodeData,
          });
        }

        // !DO NOT REMOVE THIS
        // If there is a one time payment with a 100% OFF coupon code, the invoice will be marked as 'paid' by Stripe and
        // no client secret will be provided.
        if (invoiceStatus && invoiceStatus === 'paid') {
          navigationService.push(AppView.CheckoutSuccess);
          return;
        }

        const confirmIntent = type === 'setup' ? stripeSDK.confirmSetup : stripeSDK.confirmPayment;
        const RETURN_URL_DOMAIN = envService.getVariable('hostname');
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
      }
    } catch (err) {
      const statusCode = (err as any).status;
      const castedError = errorService.castError(err);

      if (statusCode === STATUS_CODE_ERROR.USER_EXISTS) {
        setIsUpdateSubscriptionDialogOpen(true);
      } else if (statusCode === STATUS_CODE_ERROR.COUPON_NOT_VALID) {
        notificationsService.show({
          text: translate('notificationMessages.couponIsNotValidForUserError'),
          type: ToastType.Error,
        });
      } else {
        handleErrorMessage(castedError, translate('notificationMessages.errorCreatingSubscription'));
      }
    } finally {
      setIsUserPaying(false);
    }
  };

  const handleFetchSelectedPlan = async (
    priceId: string,
    promotionCode: string | null,
    currency?: string,
    ip?: string,
  ) => {
    const plan = await checkoutService.getPriceById({
      priceId,
      userAddress: ip,
      currency,
      promoCodeName: promotionCode ?? undefined,
    });
    const amount = mobileToken ? { amount: 0, decimalAmount: 0 } : {};
    setSelectedPlan({ ...plan, ...amount });
    if (plan?.price?.minimumSeats) {
      setSeatsForBusinessSubscription(plan.price.minimumSeats);
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

    return promoCode;
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signUp');
  };

  const recalculatePrice = async (
    priceId: string,
    currency: string,
    promoCodeName?: string,
    postalCode?: string,
    country?: string,
  ) => {
    const price = await checkoutService.getPriceById({ priceId, currency, promoCodeName, postalCode, country });
    setSelectedPlan(price);
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

  const onPostalCodeChange = (postalCode: string) => {
    setPostalCode(postalCode);
  };

  const onSeatsChange = (seats: number) => {
    if (!currentSelectedPlan?.price) {
      console.warn('Cannot change seats: no selected plan available');
      return;
    }

    const minSeats = currentSelectedPlan.price.minimumSeats;
    const maxSeats = currentSelectedPlan.price.maximumSeats;

    if (maxSeats && seats > maxSeats) {
      setSeatsForBusinessSubscription(maxSeats);
    } else if (minSeats && seats < minSeats) {
      setSeatsForBusinessSubscription(minSeats);
    } else {
      setSeatsForBusinessSubscription(seats);
    }
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: onCheckoutCouponChanges,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    onCountryChange,
    onPostalCodeChange,
    handleAuthMethodChange: setAuthMethod,
    onUserNameFromAddressElementChange: setUserNameFromElementAddress,
    onSeatsChange,
  };

  return (
    <>
      {isCheckoutReadyToRender &&
      elementsOptions &&
      stripeSdk &&
      currentSelectedPlan?.price &&
      currentSelectedPlan.taxes ? (
        <Elements stripe={stripeSdk} options={{ ...elementsOptions }}>
          <CheckoutView
            checkoutViewVariables={state}
            userAuthComponentRef={userAuthComponentRef}
            showCouponCode={!mobileToken}
            userInfo={userInfo}
            upsellManager={upsellManager}
            isUserAuthenticated={isUserAuthenticated}
            showHardcodedRenewal={mobileToken ? renewsAtPCComp : undefined}
            checkoutViewManager={checkoutViewManager}
          />
          {canChangePlanDialogBeOpened ? (
            <ChangePlanDialog
              prices={prices}
              isDialogOpen={isUpdateSubscriptionDialogOpen}
              setIsDialogOpen={setIsUpdateSubscriptionDialogOpen}
              onPlanClick={onChangePlanClicked}
              priceIdSelected={currentSelectedPlan.price.id}
              isUpdatingSubscription={isUpdatingSubscription}
              subscriptionSelected={currentSelectedPlan.price.type}
            />
          ) : undefined}
        </Elements>
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-1">
          <Loader type="pulse" />
        </div>
      )}
    </>
  );
};

export default CheckoutViewWrapper;
