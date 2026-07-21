import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { checkoutService } from '../services';
import { PaymentType } from '../types';
import { useCheckoutSubmit } from './useCheckoutSubmit';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((key: string) => key),
  }),
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('views/Signup/hooks/useSignup', () => ({
  useSignUp: () => ({ doRegister: vi.fn() }),
}));

vi.mock('utils/generateCaptchaToken', () => ({
  generateCaptchaToken: vi.fn().mockResolvedValue('captcha-token'),
}));

const mockSelectedPlan: PriceWithTax = {
  price: {
    id: 'price_123',
    bytes: 1099511627776,
    decimalAmount: 10,
    product: 'prod_1234',
    currency: 'eur',
    amount: 10,
    interval: 'year',
    type: UserType.Individual,
  },
  taxes: {
    amountWithTax: 1210,
    decimalTax: 12.1,
    tax: 210,
    decimalAmountWithTax: 12.1,
  },
};

const mockUser = { uuid: 'user-uuid', name: 'John', lastname: 'Doe', email: 'john@inxt.com' };

const mockCompleteAddress = {
  line1: 'Main Street 1',
  line2: null,
  city: 'Madrid',
  state: 'M',
  postal_code: '28001',
  country: 'ES',
};

const buildProps = (overrides = {}) => ({
  user: mockUser,
  selectedPlan: mockSelectedPlan,
  authMethod: 'userIsSignedIn',
  currencyType: PaymentType.FIAT,
  selectedCurrency: 'eur',
  userName: 'John Doe',
  address: undefined,
  postalCode: '',
  isPostalCodeRequired: false,
  userLocation: 'ES',
  userAddress: '1.1.1.1',
  promoCodeData: undefined,
  gclidStored: null,
  userAuthComponentRef: { current: { scrollIntoView: vi.fn() } },
  onAuthenticateUser: vi.fn().mockResolvedValue(mockUser),
  handleUserPayment: vi.fn().mockResolvedValue(undefined),
  fetchSelectedPlan: vi.fn().mockResolvedValue(mockSelectedPlan),
  fetchPromotionCode: vi.fn().mockResolvedValue(undefined),
  onPromoCodeError: vi.fn(),
  openCryptoPaymentDialog: vi.fn(),
  setIsUserPaying: vi.fn(),
  setIsUpdateSubscriptionDialogOpen: vi.fn(),
  ...overrides,
});

const defaultFormData = { email: 'john@inxt.com', password: 'password123' };
const buildStripe = () => ({ confirmPayment: vi.fn(), confirmSetup: vi.fn() });
const buildElements = () => ({ submit: vi.fn().mockResolvedValue({ error: undefined }) });
const buildEvent = () => ({ preventDefault: vi.fn() });

const submit = async (props: any, formData = defaultFormData, elements: any = buildElements()) => {
  const { result } = renderHook(() => useCheckoutSubmit(props as any));
  await act(async () => {
    await result.current.onCheckoutButtonClicked(formData as any, buildEvent() as any, buildStripe() as any, elements);
  });
};

describe('Checkout submit custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(checkoutService, 'createCustomer').mockResolvedValue({ customerId: 'cus_1', token: 'tok_1' } as never);
    vi.spyOn(referralService, 'getStoredUcc').mockReturnValue(undefined as never);
    vi.spyOn(errorService, 'castError').mockImplementation((error) => error as never);
    vi.spyOn(notificationsService, 'show').mockReturnValue('');
    vi.spyOn(longNotificationsService, 'show').mockReturnValue('');
  });

  describe('Submitting the checkout', () => {
    test('When no plan is selected, then the checkout does nothing and stops the paying state', async () => {
      const props = buildProps({ selectedPlan: undefined });

      await submit(props);

      expect(props.setIsUserPaying).toHaveBeenCalledWith(false);
      expect(props.handleUserPayment).not.toHaveBeenCalled();
      expect(checkoutService.createCustomer).not.toHaveBeenCalled();
    });

    test('When the user is not signed in, then they are authenticated before the payment is processed', async () => {
      const props = buildProps({ authMethod: 'signIn' });

      await submit(props);

      expect(props.onAuthenticateUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: defaultFormData.email, authMethod: 'signIn' }),
      );
      expect(props.handleUserPayment).toHaveBeenCalled();
    });

    test('When the user is already signed in, then authentication is skipped', async () => {
      const props = buildProps({ authMethod: 'userIsSignedIn' });

      await submit(props);

      expect(props.onAuthenticateUser).not.toHaveBeenCalled();
      expect(props.handleUserPayment).toHaveBeenCalled();
    });

    test('When paying with a card, then the Stripe elements are submitted and the customer is created before charging', async () => {
      const props = buildProps({ currencyType: PaymentType.FIAT });
      const elements = buildElements();

      await submit(props, defaultFormData, elements);

      expect(elements.submit).toHaveBeenCalled();
      expect(checkoutService.createCustomer).toHaveBeenCalled();
      expect(props.handleUserPayment).toHaveBeenCalled();
    });

    test('When paying with crypto and the billing address is incomplete, then an address-required error is shown and no payment is attempted', async () => {
      const props = buildProps({ currencyType: PaymentType.CRYPTO, userName: '', address: undefined });

      await submit(props);

      expect(longNotificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'checkout.error.addressRequired' }),
      );
      expect(props.handleUserPayment).not.toHaveBeenCalled();
    });

    test('When no billing country can be resolved, then a country-required error is shown', async () => {
      const props = buildProps({ address: undefined, userLocation: undefined });

      await submit(props);

      expect(longNotificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'checkout.error.countryRequired' }),
      );
      expect(props.handleUserPayment).not.toHaveBeenCalled();
    });

    test('When the country requires a postal code and none is provided, then a postal-code-required error is shown', async () => {
      const props = buildProps({
        isPostalCodeRequired: true,
        address: undefined,
        postalCode: '',
        userLocation: 'US',
      });

      await submit(props);

      expect(longNotificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'checkout.error.postalCodeRequired' }),
      );
      expect(props.handleUserPayment).not.toHaveBeenCalled();
    });

    test('When paying with a complete crypto address, then the customer is created and the payment is processed', async () => {
      const props = buildProps({ currencyType: PaymentType.CRYPTO, userName: 'John Doe', address: mockCompleteAddress });

      await submit(props);

      expect(checkoutService.createCustomer).toHaveBeenCalled();
      expect(props.handleUserPayment).toHaveBeenCalled();
    });

    test('When the customer already has an account, then the update-subscription dialog is opened', async () => {
      const handleUserPayment = vi.fn().mockRejectedValue(Object.assign(new Error('exists'), { status: 409 }));
      const props = buildProps({ handleUserPayment });

      await submit(props);

      expect(props.setIsUpdateSubscriptionDialogOpen).toHaveBeenCalledWith(true);
    });

    test('When the applied coupon is not valid during payment, then a coupon-invalid notification is shown', async () => {
      const handleUserPayment = vi.fn().mockRejectedValue(Object.assign(new Error('invalid coupon'), { status: 422 }));
      const props = buildProps({ handleUserPayment });

      await submit(props);

      expect(notificationsService.show).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'notificationMessages.couponIsNotValidForUserError' }),
      );
    });
  });

  describe('Recalculating the price when the coupon changes', () => {
    test('When a coupon name is provided, then the coupon and the price with taxes are refetched', async () => {
      const props = buildProps();
      const { result } = renderHook(() => useCheckoutSubmit(props as any));

      await act(async () => {
        await result.current.onCheckoutCouponChanges('DISCOUNT10');
      });

      expect(props.fetchPromotionCode).toHaveBeenCalledWith({ priceId: 'price_123', promotionCode: 'DISCOUNT10' });
      expect(props.fetchSelectedPlan).toHaveBeenCalledWith(
        expect.objectContaining({ priceId: 'price_123', promotionCode: 'DISCOUNT10', userAddress: '1.1.1.1' }),
      );
    });

    test('When fetching the coupon fails, then the promo code error handler runs and the price is still refetched', async () => {
      const fetchPromotionCode = vi.fn().mockRejectedValue(new Error('coupon error'));
      const props = buildProps({ fetchPromotionCode });
      const { result } = renderHook(() => useCheckoutSubmit(props as any));

      await act(async () => {
        await result.current.onCheckoutCouponChanges('DISCOUNT10');
      });

      expect(props.onPromoCodeError).toHaveBeenCalled();
      expect(props.fetchSelectedPlan).toHaveBeenCalled();
    });

    test('When no plan is selected, then the coupon change does nothing', async () => {
      const props = buildProps({ selectedPlan: undefined });
      const { result } = renderHook(() => useCheckoutSubmit(props as any));

      await act(async () => {
        await result.current.onCheckoutCouponChanges('DISCOUNT10');
      });

      expect(props.fetchPromotionCode).not.toHaveBeenCalled();
      expect(props.fetchSelectedPlan).not.toHaveBeenCalled();
    });
  });
});
