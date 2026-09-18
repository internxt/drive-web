import { AppError } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import gaService from 'app/analytics/ga.service';
import { handleImpactDTCCheckout } from 'app/analytics/impact.service';
import metaService from 'app/analytics/meta.service';
import { AppView, IFormValues, LocalStorageItem } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planThunks } from 'app/store/slices/plan';
import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import referralService from 'services/referral.service';
import { generateCaptchaToken } from 'utils/generateCaptchaToken';
import ChangePlanDialog from 'views/NewSettings/components/Sections/Account/Plans/components/ChangePlanDialog';
import { useSignUp } from 'views/Signup/hooks/useSignup';
import { useUserLocation } from 'hooks/useUserLocation';
import { CheckoutLoader } from 'views/Checkout/components/CheckoutLoader';
import { GCLID_COOKIE_LIFESPAN_DAYS, MILLISECONDS_PER_DAY, STATUS_CODE_ERROR } from 'views/Checkout/constants';
import { useAuthCheckout } from 'views/Checkout/hooks/useAuthCheckout';
import { useBillingDetails } from 'views/Checkout/hooks/useBillingDetails';
import { useCheckout } from 'views/Checkout/hooks/useCheckout';
import { useCheckoutQueryParams } from 'views/Checkout/hooks/useCheckoutQueryParams';
import { useProducts } from 'views/Checkout/hooks/useProducts';
import { usePromotionalCode } from 'views/Checkout/hooks/usePromotionalCode';
import { useUserPayment } from 'views/Checkout/hooks/useUserPayment';
import { checkoutService, paymentService } from 'views/Checkout/services';
import { checkoutReducer, initialStateForCheckout } from 'views/Checkout/store';
import BfCheckoutView from './BfCheckoutView';
import { getBfCheckoutVariant } from '../constants';
import { useInitializeBfCheckout } from '../hooks/useInitializeBfCheckout';
import { BfCheckoutManager, UserInfoProps } from '../types';

const PLAN_REFETCH_DEBOUNCE_MS = 500;

const BfCheckoutViewWrapper = () => {
  const { translate } = useTranslationContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const { authMethod, isPaying, isUpdateSubscriptionDialogOpen, isUpdatingSubscription } = state;
  const { setAuthMethod, setIsUserPaying, setIsUpdateSubscriptionDialogOpen, setIsUpdatingSubscription } =
    useCheckout(dispatchReducer);

  const { planId, promotionCode, currency, gclid, irclickid, utmMedium } = useCheckoutQueryParams();
  const variant = getBfCheckoutVariant(new URLSearchParams(globalThis.location.search).get('variant'));
  const { location: userLocationData } = useUserLocation();

  const { promoCodeData } = usePromotionalCode({
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
    country: userLocationData?.location,
  });

  const { isCheckoutReady, stripeElementsOptions, stripeSdk } = useInitializeBfCheckout({
    user,
    price: selectedPlan,
    translate,
  });

  const { onAuthenticateUser, onLogOut, authError } = useAuthCheckout({
    changeAuthMethod: setAuthMethod,
  });

  const dispatch = useAppDispatch();
  const { address, billingCountry, billingPostalCode, getCustomerName } = useBillingDetails({
    user,
    userLocation: userLocationData?.location,
  });

  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const { doRegister } = useSignUp('activate');
  const { handleUserPayment } = useUserPayment();
  const userAuthComponentRef = useRef<HTMLDivElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currency ?? 'eur');

  const userAccountName = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = userAccountName + ' ' + lastName;

  const gclidStored = localStorageService.get(LocalStorageItem.GCLID);
  const canChangePlanDialogBeOpened = selectedPlan?.price && isUpdateSubscriptionDialogOpen;

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

    if (!billingCountry) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        currency: selectedPlan.price.currency,
        promotionCode: promotionCode ?? undefined,
        postalCode: billingPostalCode,
        country: billingCountry,
        userAddress: userLocationData?.ip,
      });
    }, PLAN_REFETCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer);
  }, [billingCountry, billingPostalCode, selectedPlan?.price?.id, selectedPlan?.price?.currency, userLocationData]);

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

  const handleSubscriptionPayment = async () => {
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

  const onChangePlanClicked = async () => {
    setIsUpdatingSubscription(true);
    await handleSubscriptionPayment();
    setIsUpdateSubscriptionDialogOpen(false);
    setIsUpdatingSubscription(false);
    navigationService.push(AppView.Drive);
  };

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();

    const isStripeNotLoaded = !stripeSDK || !elements;

    if (!selectedPlan?.price?.id) {
      console.error('No selected plan available for checkout');
      setIsUserPaying(false);
      return;
    }

    if (isStripeNotLoaded) {
      console.error('Stripe.js has not loaded yet. Please try again later.');
      return;
    }

    setIsUserPaying(true);

    const { email, password } = formData;

    try {
      if (!billingCountry) {
        throw new Error(translate('checkout.error.countryRequired'));
      }

      const { error: elementsError } = await elements.submit();

      if (elementsError) {
        throw new Error(elementsError.message);
      }

      const { confirmationToken, error: confirmationTokenError } = await stripeSDK.createConfirmationToken({
        elements,
      });

      if (confirmationTokenError) {
        throw new Error(confirmationTokenError.message);
      }

      const confirmationTokenId = confirmationToken.id;
      const paymentPostalCode =
        confirmationToken.payment_method_preview.billing_details.address?.postal_code ?? undefined;

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
      const customerName = getCustomerName({ authenticatedUser, email });

      const { customerId, token } = await checkoutService.createCustomer({
        customerName: customerName || undefined,
        lineAddress1: address?.line1,
        lineAddress2: address?.line2 ?? undefined,
        country: billingCountry,
        postalCode: paymentPostalCode,
        city: address?.city,
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
        confirmationTokenId,
        translate,
        selectedPlan,
        token,
        gclidStored,
        captchaToken,
        userAddress: userLocationData?.ip as string,
      });
    } catch (err) {
      const statusCode = (err as AppError).status;
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

  const bfCheckoutManager: BfCheckoutManager = {
    onLogOut,
    onCheckoutButtonClicked,
    handleAuthMethodChange: setAuthMethod,
    onCurrencyChange: setSelectedCurrency,
  };

  if (!isCheckoutReady || !stripeElementsOptions || !stripeSdk || !selectedPlan?.price || !selectedPlan?.taxes) {
    return <CheckoutLoader />;
  }

  return (
    <Elements stripe={stripeSdk} options={stripeElementsOptions}>
      <BfCheckoutView
        checkoutViewVariables={{
          isPaying,
          authMethod,
          couponCodeData: promoCodeData,
          authError: authError ?? undefined,
          currentSelectedPlan: selectedPlan,
        }}
        variant={variant}
        userAuthComponentRef={userAuthComponentRef}
        userInfo={userInfo}
        checkoutViewManager={bfCheckoutManager}
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
    </Elements>
  );
};

export default BfCheckoutViewWrapper;
