import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { useCheckout } from 'views/Checkout/hooks/useCheckout';
import { useSignUp } from 'views/Signup/hooks/useSignup';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import { AppError } from '@internxt/sdk';
import { AppView, IFormValues, LocalStorageItem } from 'app/core/types';
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
import { CheckoutViewManager, UserInfoProps } from '../types/checkout.types';
import CheckoutView from './CheckoutView';
import { useUserPayment } from 'views/Checkout/hooks/useUserPayment';
import { CRYPTO_PAYMENT_DIALOG_KEY, CryptoPaymentDialog } from 'views/Checkout/components/CryptoPaymentDialog';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { generateCaptchaToken } from 'utils/generateCaptchaToken';
import gaService from 'app/analytics/ga.service';
import { handleImpactDTCCheckout } from 'app/analytics/impact.service';
import referralService from 'services/referral.service';
import metaService from 'app/analytics/meta.service';
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
import { useBillingDetails } from '../hooks/useBillingDetails';
import { usePromotionalCode } from '../hooks/usePromotionalCode';
import { useAuthCheckout } from '../hooks/useAuthCheckout';
import { checkoutReducer, initialStateForCheckout } from '../store';
import { CheckoutLoader } from '../components/CheckoutLoader';

const CheckoutViewWrapper = () => {
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const { authMethod, isPaying, isUpdateSubscriptionDialogOpen, isUpdatingSubscription } = state;
  const { setAuthMethod, setIsUserPaying, setIsUpdateSubscriptionDialogOpen, setIsUpdatingSubscription } =
    useCheckout(dispatchReducer);

  const { planId, promotionCode, currency, paramMobileToken, gclid, irclickid, utmMedium } = useCheckoutQueryParams();
  const { location: userLocationData } = useUserLocation();

  const { couponError, promoCodeData, onPromoCodeError, removeCouponCode, fetchPromotionCode } = usePromotionalCode({
    priceId: planId,
    promoCodeName: promotionCode,
  });

  const { selectedPlan, fetchSelectedPlan } = useProducts({
    currency: currency ?? 'eur',
    translate,
    planId,
    promotionCode: promoCodeData?.codeName ?? undefined,
    userLocation: userLocationData?.location,
    userAddress: userLocationData?.ip,
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
  const {
    address,
    isPostalCodeRequired,
    isCryptoAddressIncomplete,
    billingCountry,
    billingPostalCode,
    getCustomerName,
    onUserAddressChanges,
    onUserNameChanges,
    onPostalCodeChanges,
  } = useBillingDetails({ user, userLocation: userLocationData?.location });

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

  const gclidStored = localStorageService.get(LocalStorageItem.GCLID);

  const canChangePlanDialogBeOpened = selectedPlan?.price && isUpdateSubscriptionDialogOpen;
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
      document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/; domain=.internxt.com; Secure`;
      localStorageService.set(LocalStorageItem.GCLID, gclid);
    }
    if (irclickid) {
      handleImpactDTCCheckout({ irclickid, utmMedium });
    }
    referralService.captureUcc();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthMethod('userIsSignedIn');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!selectedPlan?.price?.id || !selectedPlan?.price?.currency) {
      return;
    }

    if (!billingCountry || !billingPostalCode) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        currency: selectedPlan.price.currency,
        promotionCode: promotionCode ?? undefined,
        postalCode: billingPostalCode,
        country: billingCountry,
      });
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [billingCountry, billingPostalCode, selectedPlan?.price?.id, selectedPlan?.price?.currency]);

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
        seats: 1,
      });

      metaService.trackCheckoutStart({
        value: selectedPlan.price.decimalAmount,
        currency: selectedPlan.price.currency ?? 'eur',
        content_ids: [selectedPlan.price.id],
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
        requestId: error?.requestId,
      });
    } else {
      longNotificationsService.show({
        type: ToastType.Error,
        text: error?.message,
        requestId: error?.requestId,
      });
    }
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    if (!selectedPlan?.price?.type) {
      console.error('No selected plan available for subscription payment');
      return;
    }

    try {
      await paymentService.updateSubscriptionWithConfirmation({
        priceId: selectedPlan.price.id,
        userType: selectedPlan.price.type,
        coupon: promotionCode ?? undefined,
        onSuccess: handlePaymentSuccess,
        onError: (error) => handleErrorMessage(error, translate('notificationMessages.errorCancelSubscription')),
      });
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

    if (!stripeSDK || !elements) {
      console.error('Stripe.js has not loaded yet. Please try again later.');
      return;
    }

    setIsUserPaying(true);

    const { email, password, companyName, companyVatId } = formData;

    try {
      const isCryptoPurchase = currencyType === PaymentType['CRYPTO'];

      if (isCryptoPurchase && isCryptoAddressIncomplete) {
        throw new Error(translate('checkout.error.addressRequired'));
      }

      if (!billingCountry) {
        throw new Error(translate('checkout.error.countryRequired'));
      }

      if (isPostalCodeRequired && !billingPostalCode) {
        throw new Error(translate('checkout.error.postalCodeRequired'));
      }

      if (currencyType === PaymentType['FIAT']) {
        const { error: elementsError } = await elements.submit();

        if (elementsError) {
          throw new Error(elementsError.message);
        }
      }

      const captchaToken = await generateCaptchaToken();

      let authenticatedUser = user;

      if (authMethod !== 'userIsSignedIn') {
        const result = await onAuthenticateUser({
          email,
          password,
          authMethod,
          dispatch,
          authCaptcha: captchaToken,
          doRegister,
          onAuthenticationFail: () => {
            userAuthComponentRef.current?.scrollIntoView();
            setIsUserPaying(false);
          },
        });

        if (result) {
          authenticatedUser = result;
        }
      }

      const customerToken = await generateCaptchaToken();
      const ucc = referralService.getStoredUcc();
      const userUuid = authenticatedUser?.uuid;
      const hasMetadata = ucc || userUuid;
      const metadata = hasMetadata
        ? {
            ...(ucc && { cello_ucc: ucc }),
            ...(userUuid && { new_user_id: userUuid }),
          }
        : undefined;
      const customerName = getCustomerName({ companyName, authenticatedUser, email });

      const { customerId, token } = await checkoutService.createCustomer({
        customerName: customerName || undefined,
        lineAddress1: address?.line1,
        lineAddress2: address?.line2 ?? undefined,
        country: billingCountry,
        postalCode: billingPostalCode,
        city: address?.city,
        companyVatId,
        captchaToken: customerToken,
        metadata,
      });

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
        captchaToken,
        openCryptoPaymentDialog,
        userAddress: userLocationData?.ip as string,
      });
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
    onCurrencyChange: setSelectedCurrency,
    onUserNameChanges,
    onPostalCodeChanges,
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
              currentSelectedPlan: selectedPlan,
              selectedCurrency: currency ?? selectedPlan.price.currency,
            }}
            userAuthComponentRef={userAuthComponentRef}
            showCouponCode={!paramMobileToken}
            userInfo={userInfo}
            isUserAuthenticated={isAuthenticated}
            checkoutViewManager={checkoutViewManager}
            availableCryptoCurrencies={availableCryptoCurrencies}
            onCurrencyTypeChanges={onCurrencyTypeChanges}
            isPostalCodeRequired={isPostalCodeRequired}
          />
          {canChangePlanDialogBeOpened ? (
            <ChangePlanDialog
              isDialogOpen={isUpdateSubscriptionDialogOpen}
              setIsDialogOpen={setIsUpdateSubscriptionDialogOpen}
              onPlanClick={onChangePlanClicked}
              priceSelected={{
                amount: selectedPlan.price.amount,
                currency: selectedPlan.price.currency,
                interval: selectedPlan.price.interval,
                userType: selectedPlan.price.type,
                bytes: selectedPlan.price.bytes,
                id: selectedPlan.price.id,
              }}
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
        <CheckoutLoader />
      )}
    </>
  );
};

export default CheckoutViewWrapper;
