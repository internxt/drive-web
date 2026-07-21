import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { BaseSyntheticEvent, RefObject } from 'react';

import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch } from 'app/store/hooks';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { generateCaptchaToken } from 'utils/generateCaptchaToken';
import { useSignUp } from 'views/Signup/hooks/useSignup';
import { checkoutService } from '../services';
import { STATUS_CODE_ERROR } from '../constants';
import { AuthMethodTypes, PaymentType } from '../types';
import { AddressProvider } from '../types/checkout.types';
import { handleCheckoutError } from '../utils';
import { useAuthCheckout } from './useAuthCheckout';
import { useProducts } from './useProducts';
import { usePromotionalCode } from './usePromotionalCode';
import { useUserPayment } from './useUserPayment';

interface UseCheckoutSubmitProps {
  user?: UserSettings;
  selectedPlan?: PriceWithTax;
  authMethod: AuthMethodTypes;
  currencyType?: PaymentType;
  selectedCurrency: string;
  userName: string;
  address?: AddressProvider;
  postalCode: string;
  isPostalCodeRequired: boolean;
  userLocation?: string;
  userAddress?: string;
  promoCodeData?: CouponCodeData;
  gclidStored: string | null;
  userAuthComponentRef: RefObject<HTMLDivElement>;
  onAuthenticateUser: ReturnType<typeof useAuthCheckout>['onAuthenticateUser'];
  handleUserPayment: ReturnType<typeof useUserPayment>['handleUserPayment'];
  fetchSelectedPlan: ReturnType<typeof useProducts>['fetchSelectedPlan'];
  fetchPromotionCode: ReturnType<typeof usePromotionalCode>['fetchPromotionCode'];
  onPromoCodeError: ReturnType<typeof usePromotionalCode>['onPromoCodeError'];
  openCryptoPaymentDialog: ReturnType<typeof useActionDialog>['openDialog'];
  setIsUserPaying: (isPaying: boolean) => void;
  setIsUpdateSubscriptionDialogOpen: (isOpen: boolean) => void;
}

export const useCheckoutSubmit = ({
  user,
  selectedPlan,
  authMethod,
  currencyType,
  selectedCurrency,
  userName,
  address,
  postalCode,
  isPostalCodeRequired,
  userLocation,
  userAddress,
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
}: UseCheckoutSubmitProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const { doRegister } = useSignUp('activate');

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
        userAddress,
        currency: selectedPlan.price.currency,
        promotionCode: promoCodeName,
      });
    } catch (error) {
      console.error('Error fetching price with taxes', error);
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

    try {
      if (isStripeNotLoaded) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const isCryptoPurchase = currencyType === PaymentType['CRYPTO'];
      const isCryptoAddressIncomplete =
        !userName.trim() || !address?.line1 || !address?.city || !address?.country || !address?.postal_code;

      if (isCryptoPurchase && isCryptoAddressIncomplete) {
        throw new Error(translate('checkout.error.addressRequired'));
      }

      const billingCountry = address?.country ?? userLocation;
      const billingPostalCode = address?.postal_code ?? (postalCode.trim() || undefined);

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
      const authName = [authenticatedUser?.name, authenticatedUser?.lastname].filter(Boolean).join(' ').trim();
      const fallbackCustomerName = userName.trim() || authName || authenticatedUser?.email || email;
      const customerName = companyName ?? fallbackCustomerName;

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
        userAddress: userAddress as string,
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
        handleCheckoutError(castedError, translate('notificationMessages.errorCreatingSubscription'));
      }
    } finally {
      setIsUserPaying(false);
    }
  };

  return {
    onCheckoutButtonClicked,
    onCheckoutCouponChanges,
  };
};
