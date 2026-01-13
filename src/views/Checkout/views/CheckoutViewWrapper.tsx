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
import { STORAGE_KEYS } from 'services/storage-keys';
import AppError, { AppView, IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ChangePlanDialog from 'views/NewSettings/components/Sections/Account/Plans/components/ChangePlanDialog';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService, checkoutService } from 'views/Checkout/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { useThemeContext } from 'app/theme/ThemeProvider';
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
import { useUserLocation } from 'hooks/useUserLocation';
import {
  GCLID_COOKIE_LIFESPAN_DAYS,
  IS_CRYPTO_PAYMENT_ENABLED,
  MILLISECONDS_PER_DAY,
  STATUS_CODE_ERROR,
} from '../constants';
import { usePromotionalCode } from '../hooks/usePromotionalCode';
import { useAuthCheckout } from '../hooks/useAuthCheckout';
import { checkoutReducer, initialStateForCheckout } from '../store';
import { processPcCloudPayment } from '../utils/pcCloud.utils';

const CheckoutViewWrapper = () => {
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const { authMethod, isPaying, isUpdateSubscriptionDialogOpen, isUpdatingSubscription, prices } = state;
  const {
    setAuthMethod,
    setIsUserPaying,
    setSeatsForBusinessSubscription,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  } = useCheckout(dispatchReducer);

  const { planId, promotionCode, currency, paramMobileToken, gclid } = useCheckoutQueryParams();
  const { location: userLocationData } = useUserLocation();

  const { selectedPlan, businessSeats, fetchSelectedPlan } = useProducts({
    currency: currency ?? 'eur',
    translate,
    planId,
    promotionCode: promotionCode ?? undefined,
    userLocation: userLocationData?.location,
    userAddress: userLocationData?.ip,
  });

  const { promoCodeData, couponError, fetchPromotionCode, onPromoCodeError, removeCouponCode } = usePromotionalCode({
    promoCodeName: promotionCode,
  });

  const { isCheckoutReady, stripeElementsOptions, availableCryptoCurrencies, stripeSdk } = useInitializeCheckout({
    user,
    price: selectedPlan,
    checkoutTheme: checkoutTheme ?? 'light',
    translate,
  });

  const { onAuthenticateUser, onLogOut, authError } = useAuthCheckout({
    changeAuthMethod: setAuthMethod,
  });

  const dispatch = useAppDispatch();
  const [address, setAddress] = useState<AddressProvider>();
  const [userName, setUserName] = useState(user?.name ?? '');

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

  const gclidStored = localStorageService.get(STORAGE_KEYS.GCLID);

  const renewsAtPCComp = `${translate('checkout.productCard.pcMobileRenews')}`;

  const canChangePlanDialogBeOpened = prices && selectedPlan?.price && isUpdateSubscriptionDialogOpen;
  const isCryptoPaymentDialogOpen = isDialogOpen(CRYPTO_PAYMENT_DIALOG_KEY);

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: user?.avatar ?? null,
    email: user?.email ?? '',
  };

  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (gclid) {
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + GCLID_COOKIE_LIFESPAN_DAYS * MILLISECONDS_PER_DAY);
      document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/`;
      localStorageService.set(STORAGE_KEYS.GCLID, gclid);
    }
  }, [checkoutTheme]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthMethod('userIsSignedIn');
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
        promotionCode: promotionCode ?? undefined,
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

  useEffect(() => {
    if (envService.isProduction() && selectedPlan?.price && isAuthenticated && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      const planPrice = selectedPlan.taxes?.amountWithTax || selectedPlan.price.amount;
      checkoutService.trackIncompleteCheckout(selectedPlan, planPrice);
    }
  }, [selectedPlan, isAuthenticated]);

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
      await fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        userAddress: userLocationData?.ip,
        currency: selectedPlan.price.currency,
        promotionCode: promoCodeName,
      });
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
      await onAuthenticateUser({
        email,
        password,
        authMethod,
        dispatch,
        authCaptcha,
        doRegister,
        onAuthenticationFail: () => {
          userAuthComponentRef.current?.scrollIntoView();
          setIsUserPaying(false);
        },
      });
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

      if (paramMobileToken) {
        await processPcCloudPayment({
          customerId,
          selectedPlan,
          token,
          mobileToken: paramMobileToken,
          stripeSDK,
          elements,
        });
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
            showCouponCode={!paramMobileToken}
            userInfo={userInfo}
            isUserAuthenticated={isAuthenticated}
            showHardcodedRenewal={paramMobileToken ? renewsAtPCComp : undefined}
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
