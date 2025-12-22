import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { Loader } from '@internxt/ui';
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
import { paymentService, checkoutService } from 'views/Checkout/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { useThemeContext } from 'app/theme/ThemeProvider';
import { authenticateUser } from 'services/auth.service';
import { checkoutReducer, initialStateForCheckout } from 'views/Checkout/store/checkoutReducer';
import { PaymentType } from 'views/Checkout/types';
import { AddressProvider, CheckoutViewManager, UserInfoProps } from '../types/checkout.types';
import CheckoutView from './CheckoutView';
import { useUserPayment } from 'views/Checkout/hooks/useUserPayment';
import { CRYPTO_PAYMENT_DIALOG_KEY, CryptoPaymentDialog } from 'views/Checkout/components/CryptoPaymentDialog';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { generateCaptchaToken } from 'utils/generateCaptchaToken';
import gaService from 'app/analytics/ga.service';
import { useCheckoutQueryParams } from '../hooks/useCheckoutQueryParams';
import { useInitializeCheckout } from '../hooks/useInitializeCheckout';
import { useProducts } from '../hooks/useProducts';

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

const CheckoutViewWrapper = () => {
  const { planId, promotionCode, currency, paramMobileToken, gclid } = useCheckoutQueryParams();
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    selectedPlan,
    promoCodeData,
    businessSeats,
    couponError,
    removeCouponCode,
    fetchSelectedPlan,
    fetchPromotionCode,
    onPromoCodeError,
  } = useProducts({ currency: currency ?? 'eur', translate, planId, promotionCode });

  const {
    isCheckoutReady,
    location: userLocationData,
    stripeElementsOptions,
    availableCryptoCurrencies,
    stripeSdk,
  } = useInitializeCheckout({
    user,
    price: selectedPlan,
    checkoutTheme: checkoutTheme ?? 'light',
    translate,
  });

  const dispatch = useAppDispatch();
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressProvider>();
  const [userName, setUserName] = useState(user?.name ?? '');

  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const { doRegister } = useSignUp('activate');
  const { handleUserPayment } = useUserPayment();
  const userAuthComponentRef = useRef<HTMLDivElement>(null);
  const { isDialogOpen, openDialog: openCryptoPaymentDialog } = useActionDialog();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('eur');
  const [currencyType, setCurrencyType] = useState<PaymentType>();

  const userAccountName = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = userAccountName + ' ' + lastName;
  const isUserAuthenticated = !!user;

  const gclidStored = localStorageService.get(STORAGE_KEYS.GCLID);

  const {
    setAuthMethod,
    setAvatarBlob,
    setIsUserPaying,
    setSelectedPlan,
    setSeatsForBusinessSubscription,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  } = useCheckout(dispatchReducer);

  const { authMethod, avatarBlob, isPaying, isUpdateSubscriptionDialogOpen, isUpdatingSubscription, prices } = state;

  const renewsAtPCComp = `${translate('checkout.productCard.pcMobileRenews')}`;

  const canChangePlanDialogBeOpened = prices && selectedPlan?.price && isUpdateSubscriptionDialogOpen;
  const isCryptoPaymentDialogOpen = isDialogOpen(CRYPTO_PAYMENT_DIALOG_KEY);

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email ?? '',
  };

  useEffect(() => {
    setMobileToken(paramMobileToken);

    if (gclid) {
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + GCLID_COOKIE_LIFESPAN_DAYS * MILLISECONDS_PER_DAY);
      document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/`;
      localStorageService.set(STORAGE_KEYS.GCLID, gclid);
    }
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
    if (!selectedPlan?.price?.id || !selectedPlan?.price?.currency) {
      return;
    }

    if (userLocationData?.location !== address?.country && address?.postal_code) {
      fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        currency: selectedPlan.price.currency,
        promotionCode: promoCodeData?.codeName,
        postalCode: address.postal_code,
        country: address.country,
      });
    }
  }, [address?.country, address?.postal_code, selectedPlan?.price?.id, selectedPlan?.price?.currency]);

  useEffect(() => {
    if (isCheckoutReady && selectedPlan?.price) {
      gaService.trackBeginCheckout({
        planId: selectedPlan.price.id,
        planPrice: selectedPlan.price.decimalAmount,
        currency: selectedPlan.price.currency ?? 'eur',
        planType: selectedPlan.price.type === 'business' ? 'business' : 'individual',
        interval: selectedPlan.price.interval,
        storage: selectedPlan.price.bytes.toString(),
        promoCodeId: promotionCode ?? undefined,
        couponCodeData: promoCodeData,
        seats: selectedPlan.price.type === 'business' ? businessSeats : 1,
      });
    }
  }, [isCheckoutReady]);

  const onCheckoutCouponChanges = async (promoCodeName?: string) => {
    if (!selectedPlan?.price?.id) {
      return;
    }

    try {
      if (promoCodeName) {
        await fetchPromotionCode({ priceId: selectedPlan.price.id, promotionCode: promoCodeName });
      }
    } catch (error) {
      onPromoCodeError(error);
    }

    try {
      const priceWithTaxes = await fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        userAddress: userLocationData?.ip,
        promotionCode: promoCodeName,
      });
      setSelectedPlan(priceWithTaxes);
    } catch (error) {
      console.error('Error fetching price with taxes', error);
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
    if (!selectedPlan?.price?.type) {
      console.error('No selected plan available for subscription payment');
      return;
    }

    try {
      const updatedSubscription = await paymentService.updateSubscriptionPrice({
        priceId,
        userType: selectedPlan.price.type,
      });
      if (updatedSubscription.request3DSecure && stripeSdk) {
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

    if (!selectedPlan?.price?.id) {
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
        setAuthError(error.message);
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
        localStorageService.set('priceId', selectedPlan.price.id);
        localStorageService.set('customerToken', token);
        localStorageService.set('mobileToken', mobileToken);
        const RETURN_URL_DOMAIN = envService.getVariable('hostname');
        const { error: confirmIntentError } = await stripeSDK.confirmSetup({
          elements,
          clientSecret: setupIntent.clientSecret,
          confirmParams: {
            return_url: `${RETURN_URL_DOMAIN}/checkout/pcCloud-success?mobileToken=${mobileToken}&priceId=${selectedPlan.price.id}`,
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
          couponCodeData: promoCodeData,
          currency: selectedCurrency ?? selectedPlan.price.currency,
          priceId: selectedPlan.price.id,
          customerId,
          elements,
          translate,
          selectedPlan,
          token,
          gclidStored,
          captchaToken: intentCaptcha,
          seatsForBusinessSubscription: businessSeats,
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

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signUp');
  };

  const onUserAddressChanges = (address: AddressProvider) => {
    setAddress(address);
  };

  const onUserNameChanges = (userName: string) => {
    setUserName(userName);
  };

  const onSeatsChange = (seats: number) => {
    if (!selectedPlan?.price) {
      console.warn('Cannot change seats: no selected plan available');
      return;
    }

    const minSeats = selectedPlan.price.minimumSeats;
    const maxSeats = selectedPlan.price.maximumSeats;

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
    onRemoveAppliedCouponCode: removeCouponCode,
    onUserAddressChanges,
    handleAuthMethodChange: setAuthMethod,
    onSeatsChange,
    onCurrencyChange: setSelectedCurrency,
    onUserNameChanges,
  };

  return (
    <>
      {isCheckoutReady && stripeElementsOptions && stripeSdk && selectedPlan?.price && selectedPlan?.taxes ? (
        <Elements stripe={stripeSdk} options={{ ...stripeElementsOptions }}>
          <CheckoutView
            checkoutViewVariables={{
              isPaying,
              authMethod,
              couponCodeData: promoCodeData,
              couponCodeError: couponError ?? undefined,
              authError: authError ?? undefined,
              seatsForBusinessSubscription: businessSeats,
              currentSelectedPlan: selectedPlan,
              selectedCurrency: currency ?? selectedPlan.price.currency,
            }}
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
              priceIdSelected={selectedPlan.price.id}
              isUpdatingSubscription={isUpdatingSubscription}
              subscriptionSelected={selectedPlan.price.type}
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
