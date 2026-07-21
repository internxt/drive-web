import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Elements } from '@stripe/react-stripe-js';
import { useReducer, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useCheckout } from 'views/Checkout/hooks/useCheckout';
import localStorageService from 'services/local-storage.service';
import { LocalStorageItem } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ChangePlanDialog from 'views/NewSettings/components/Sections/Account/Plans/components/ChangePlanDialog';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { useThemeContext } from 'app/theme/ThemeProvider';
import { CheckoutViewManager, UserInfoProps } from '../types/checkout.types';
import CheckoutView from './CheckoutView';
import { useUserPayment } from 'views/Checkout/hooks/useUserPayment';
import { CRYPTO_PAYMENT_DIALOG_KEY, CryptoPaymentDialog } from 'views/Checkout/components/CryptoPaymentDialog';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { useCheckoutQueryParams } from '../hooks/useCheckoutQueryParams';
import { useInitializeCheckout } from '../hooks/useInitializeCheckout';
import { useProducts } from '../hooks/useProducts';
import { useBillingDetails } from '../hooks/useBillingDetails';
import { useCheckoutSubmit } from '../hooks/useCheckoutSubmit';
import { useSubscriptionUpdate } from '../hooks/useSubscriptionUpdate';
import { useCheckoutAnalytics } from '../hooks/useCheckoutAnalytics';
import { useUserLocation } from 'hooks/useUserLocation';
import { IS_CRYPTO_PAYMENT_ENABLED } from '../constants';
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

  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  const { onAuthenticateUser, onLogOut, authError } = useAuthCheckout({
    changeAuthMethod: setAuthMethod,
    isAuthenticated,
    user,
  });

  const {
    address,
    userName,
    postalCode,
    selectedCurrency,
    currencyType,
    isPostalCodeRequired,
    onUserAddressChanges,
    onUserNameChanges,
    onCurrencyTypeChanges,
    onCurrencyChange,
    onPostalCodeChanges,
  } = useBillingDetails({
    initialUserName: user?.name,
    userLocation: userLocationData?.location,
    promotionCode: promotionCode ?? undefined,
    selectedPlan,
    fetchSelectedPlan,
  });

  const { handleUserPayment } = useUserPayment();
  const userAuthComponentRef = useRef<HTMLDivElement>(null);
  const { isDialogOpen, openDialog: openCryptoPaymentDialog } = useActionDialog();

  const gclidStored = localStorageService.get(LocalStorageItem.GCLID);

  const { onCheckoutButtonClicked, onCheckoutCouponChanges } = useCheckoutSubmit({
    user,
    selectedPlan,
    authMethod,
    currencyType,
    selectedCurrency,
    userName,
    address,
    postalCode,
    isPostalCodeRequired,
    userLocation: userLocationData?.location,
    userAddress: userLocationData?.ip,
    promoCodeData,
    gclidStored,
    userAuthComponentRef,
    onAuthenticateUser,
    handleUserPayment,
    fetchSelectedPlan,
    fetchPromotionCode,
    onPromoCodeError,
    openCryptoPaymentDialog,
    setIsUserPaying,
    setIsUpdateSubscriptionDialogOpen,
  });

  const { onChangePlanClicked } = useSubscriptionUpdate({
    selectedPlan,
    promotionCode,
    setIsUpdatingSubscription,
    setIsUpdateSubscriptionDialogOpen,
  });

  useCheckoutAnalytics({
    gclid,
    irclickid,
    utmMedium,
    isCheckoutReady,
    isAuthenticated,
    selectedPlan,
    promotionCode,
    promoCodeData,
  });

  const userAccountName = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = userAccountName + ' ' + lastName;

  const canChangePlanDialogBeOpened = selectedPlan?.price && isUpdateSubscriptionDialogOpen;
  const isCryptoPaymentDialogOpen = isDialogOpen(CRYPTO_PAYMENT_DIALOG_KEY);

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: user?.avatar ?? null,
    email: user?.email ?? '',
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: onCheckoutCouponChanges,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode: removeCouponCode,
    onUserAddressChanges,
    handleAuthMethodChange: setAuthMethod,
    onCurrencyChange,
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
