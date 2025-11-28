import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements, StripeElementsOptions } from '@stripe/stripe-js';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { UserLocation } from '@internxt/sdk';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { Loader } from '@internxt/ui';
import { userLocation } from 'utils/userLocation';
import { useCheckout } from 'views/Checkout/hooks/useCheckout';
import { useSignUp } from 'views/Signup/hooks/useSignup';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import RealtimeService from 'services/socket.service';
import { STORAGE_KEYS } from 'services/storage-keys';
import AppError, { AppView, IFormValues } from 'app/core/types';
import databaseService from 'app/database/services/database.service';
import { getDatabaseProfileAvatar } from 'app/drive/services/database.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ChangePlanDialog from 'views/NewSettings/components/Sections/Account/Plans/components/ChangePlanDialog';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService, checkoutService, currencyService } from 'views/Checkout/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { useThemeContext } from 'app/theme/ThemeProvider';
import { authenticateUser } from 'services/auth.service';
import { checkoutReducer, initialStateForCheckout } from 'views/Checkout/store/checkoutReducer';
import { PaymentType, PlanInterval } from 'views/Checkout/types';
import { AddressProvider, CheckoutViewManager, UserInfoProps } from '../types/checkout.types';
import CheckoutView from './CheckoutView';
import { useUserPayment } from 'views/Checkout/hooks/useUserPayment';
import { CRYPTO_PAYMENT_DIALOG_KEY, CryptoPaymentDialog } from 'views/Checkout/components/CryptoPaymentDialog';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { generateCaptchaToken } from 'utils/generateCaptchaToken';
import gaService from 'app/analytics/ga.service';

const GCLID_COOKIE_LIFESPAN_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const IS_CRYPTO_PAYMENT_ENABLED = true;

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
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressProvider>();
  const [userName, setUserName] = useState(user?.name ?? '');

  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const { doRegister } = useSignUp('activate');
  const { handleUserPayment } = useUserPayment();
  const userAuthComponentRef = useRef<HTMLDivElement>(null);
  const [userLocationData, setUserLocationData] = useState<UserLocation>();
  const { isDialogOpen, openDialog: openCryptoPaymentDialog } = useActionDialog();
  const [availableCryptoCurrencies, setAvailableCryptoCurrencies] = useState<CryptoCurrency[] | undefined>(undefined);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('eur');
  const [currencyType, setCurrencyType] = useState<PaymentType>();

  const userAccountName = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = userAccountName + ' ' + lastName;
  const isUserAuthenticated = !!user;
  const thereIsAnyError = state.error?.coupon || state.error?.auth || state.error?.stripe;

  const gclidStored = localStorageService.get(STORAGE_KEYS.GCLID);

  const {
    onRemoveAppliedCouponCode,
    setAuthMethod,
    setAvatarBlob,
    setError,
    setIsUserPaying,
    setPromoCodeData,
    setSelectedPlan,
    setStripeElementsOptions,
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
    couponCodeData,
    elementsOptions,
    seatsForBusinessSubscription,
    isCheckoutReadyToRender,
    isUpdateSubscriptionDialogOpen,
    isUpdatingSubscription,
    prices,
  } = state;

  const renewsAtPCComp = `${translate('checkout.productCard.pcMobileRenews')}`;

  const canChangePlanDialogBeOpened = prices && currentSelectedPlan?.price && isUpdateSubscriptionDialogOpen;
  const isCryptoPaymentDialogOpen = isDialogOpen(CRYPTO_PAYMENT_DIALOG_KEY);

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email ?? '',
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

    if (userLocationData?.location !== address?.country && address?.postal_code) {
      recalculatePrice(
        currentSelectedPlan.price.id,
        currentSelectedPlan.price.currency,
        couponCodeData?.codeName,
        address.postal_code,
        address.country,
      );
    }
  }, [address?.country, address?.postal_code, currentSelectedPlan?.price?.id, currentSelectedPlan?.price?.currency]);

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
      console.error('Error fetching price with taxes', error);
    }
  };

  const getCheckoutQueryParams = () => {
    const params = new URLSearchParams(globalThis.location.search);

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
    let price: PriceWithTax | null = null;
    try {
      price = await handleFetchSelectedPlan(planId, promotionCode, currencyValue, userAddress);
    } catch (error) {
      console.error('Error fetching selected plan', error);
      redirectToFallbackPage();
      return;
    }

    if (!checkoutTheme || !price) {
      return;
    }

    if (promotionCode) {
      try {
        await handleFetchPromotionCode(price.price.id, promotionCode);
      } catch (error) {
        handlePromoCodeError(error);
      }
    }

    setSelectedCurrency(price.price.currency);

    if (price.price.interval === PlanInterval.LIFETIME && IS_CRYPTO_PAYMENT_ENABLED) {
      try {
        const availableCryptoCurrencies = await currencyService.getAvailableCryptoCurrencies();
        setAvailableCryptoCurrencies(availableCryptoCurrencies);
      } catch (error) {
        console.error('Error fetching available crypto currencies', error);
        notificationsService.show({
          text: translate('checkout.error.fetchingCryptoCurrencies'),
          type: ToastType.Error,
        });
      }
    }

    try {
      const stripeElements = await checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme as string], price);
      setStripeElementsOptions(stripeElements as StripeElementsOptions);
    } catch (error) {
      console.error('Error loading Stripe elements:', error);
      redirectToFallbackPage();
      return;
    }

    try {
      const prices = await checkoutService.fetchPrices(price.price.type, currencyValue);
      setPrices(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      redirectToFallbackPage();
      return;
    }

    setIsCheckoutReadyToRender(true);

    gaService.trackBeginCheckout({
      planId: price.price.id,
      planPrice: price.price.decimalAmount,
      currency: price.price.currency ?? 'eur',
      planType: price.price.type === 'business' ? 'business' : 'individual',
      interval: price.price.interval,
      storage: price.price.bytes.toString(),
      promoCodeId: promotionCode ?? undefined,
      couponCodeData: couponCodeData,
      seats: price.price.type === 'business' ? seatsForBusinessSubscription : 1,
    });
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
    const customerName = companyName ?? userName;

    const authCaptcha = await generateCaptchaToken();

    if (authMethod !== 'userIsSignedIn') {
      try {
        await authenticateUser({
          email,
          password,
          authMethod,
          twoFactorCode: '',
          dispatch,
          token: authCaptcha,
          doSignUp: doRegister,
        });
      } catch (err) {
        const error = err as Error;
        setError('auth', error.message);
        (userAuthComponentRef.current as any).scrollIntoView();
        errorService.reportError(error);
        setIsUserPaying(false);
        return;
      }
    }

    try {
      if (isStripeNotLoaded) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      if (!address?.line1 || !address?.city || !address.country || !address?.postal_code) {
        throw new Error(translate('checkout.error.addressRequired'));
      }

      if (currencyType === PaymentType['FIAT']) {
        const { error: elementsError } = await elements.submit();

        if (elementsError) {
          throw new Error(elementsError.message);
        }
      }

      const customerToken = await generateCaptchaToken();
      const { customerId, token } = await checkoutService.createCustomer({
        customerName,
        lineAddress1: address?.line1,
        lineAddress2: address?.line2 ?? undefined,
        country: address?.country,
        postalCode: address?.postal_code,
        city: address?.city,
        companyVatId,
        captchaToken: customerToken,
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
        const intentCaptcha = await generateCaptchaToken();

        await handleUserPayment({
          confirmPayment: stripeSDK.confirmPayment,
          confirmSetupIntent: stripeSDK.confirmSetup,
          couponCodeData: couponCodeData,
          currency: selectedCurrency ?? currentSelectedPlan.price.currency,
          priceId: currentSelectedPlan.price.id,
          customerId,
          elements,
          translate,
          selectedPlan: currentSelectedPlan,
          token,
          gclidStored,
          captchaToken: intentCaptcha,
          seatsForBusinessSubscription,
          openCryptoPaymentDialog,
          userAddress: userLocationData?.ip as string,
        });
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

  const onUserAddressChanges = (address: AddressProvider) => {
    setAddress(address);
  };

  const onUserNameChanges = (userName: string) => {
    setUserName(userName);
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

  const onCurrencyTypeChanges = (currency: PaymentType) => {
    setCurrencyType(currency);
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: onCheckoutCouponChanges,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    onUserAddressChanges,
    handleAuthMethodChange: setAuthMethod,
    onSeatsChange,
    onCurrencyChange: setSelectedCurrency,
    onUserNameChanges,
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
            checkoutViewVariables={{ ...state, selectedCurrency }}
            userAuthComponentRef={userAuthComponentRef}
            showCouponCode={!mobileToken}
            userInfo={userInfo}
            isUserAuthenticated={isUserAuthenticated}
            showHardcodedRenewal={mobileToken ? renewsAtPCComp : undefined}
            checkoutViewManager={checkoutViewManager}
            availableCryptoCurrencies={availableCryptoCurrencies}
            onCurrencyTypeChanges={onCurrencyTypeChanges}
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

          {IS_CRYPTO_PAYMENT_ENABLED && isCryptoPaymentDialogOpen && (
            <div role="none" className="flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
              <CryptoPaymentDialog />
            </div>
          )}
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
