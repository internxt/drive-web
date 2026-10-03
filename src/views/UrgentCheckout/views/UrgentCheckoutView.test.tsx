import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import enTranslations from 'app/i18n/locales/en.json';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UrgentCheckoutView from './UrgentCheckoutView';
import { CheckoutViewManager } from 'views/Checkout/types/checkout.types';
import { UrgentCheckoutVariant } from '../constants';
import { AuthMethodTypes, PaymentType } from 'views/Checkout/types';

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({}),
  useElements: () => ({ getElement: () => null }),
  PaymentElement: () => <div data-testid="payment-element" />,
  AddressElement: () => <div data-testid="address-element" />,
}));

const translate = (key: string, props?: Record<string, unknown>) => {
  const value = key.split('.').reduce<unknown>((accumulator, part) => accumulator?.[part], enTranslations);

  if (typeof value !== 'string') {
    throw new Error(`Missing translation for "${key}"`);
  }

  return value.replace(/{{(\w+)}}/g, (_, placeholder) => String(props?.[placeholder] ?? ''));
};

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate, translateList: () => [] }),
}));

interface RenderOptions {
  cryptoCurrencies?: CryptoCurrency[];
  onCurrencyTypeChanges?: (currency: PaymentType) => void;
  authMethod?: AuthMethodTypes;
  authError?: string;
}

const selectedPlan = {
  price: {
    id: 'price_id',
    bytes: 5497558138880,
    currency: 'usd',
    decimalAmount: 29.99,
    amount: 2999,
    interval: 'month',
  },
  taxes: { amountWithTax: 218, decimalAmountWithTax: 2.18 },
} as unknown as PriceWithTax;

const couponCodeData = { percentOff: 94, codeId: 'code_id', codeName: 'OFFER94' } as CouponCodeData;

const checkoutViewManager = {
  onLogOut: vi.fn(),
  onCheckoutButtonClicked: vi.fn(),
  handleAuthMethodChange: vi.fn(),
  onCurrencyChange: vi.fn(),
  onUserAddressChanges: vi.fn(),
  onUserNameChanges: vi.fn(),
} as unknown as CheckoutViewManager;

const availableCryptoCurrencies = [
  { currencyId: 'BTC', name: 'Bitcoin', imageUrl: 'https://internxt.com/btc.svg', networkName: 'bitcoin' },
] as unknown as CryptoCurrency[];

const CREATIVE_IMAGE_ALT = 'Internxt Drive on a laptop and a phone';

const renderUrgentCheckout = (
  variant = UrgentCheckoutVariant.Mainstream,
  { cryptoCurrencies, onCurrencyTypeChanges = vi.fn(), authMethod = 'signUp', authError }: RenderOptions = {},
) =>
  render(
    <UrgentCheckoutView
      userInfo={{ name: 'Test User', avatar: null, email: 'test@internxt.com' }}
      variant={variant}
      userAuthComponentRef={null}
      checkoutViewVariables={{
        isPaying: false,
        authMethod,
        authError,
        couponCodeData,
        currentSelectedPlan: selectedPlan,
        selectedCurrency: 'usd',
      }}
      checkoutViewManager={checkoutViewManager}
      availableCryptoCurrencies={cryptoCurrencies}
      onCurrencyTypeChanges={onCurrencyTypeChanges}
    />,
  );

describe('urgent checkout view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.sessionStorage.clear();
  });

  it('When the page loads, then the selling points and the offer copy are shown', () => {
    renderUrgentCheckout();

    expect(screen.getByText('94% OFF — Limited-time exclusive offer')).toBeTruthy();
    expect(screen.getByText('Get 5TB of private cloud storage for just $1.79 for your first month.')).toBeTruthy();
    expect(screen.getByText('Only you can access your files')).toBeTruthy();
    expect(screen.getByText('Audited by Securitum')).toBeTruthy();
  });

  it('When the page loads, then the countdown starts from one hour and is framed around the discount', () => {
    renderUrgentCheckout();

    expect(screen.getByText('Your exclusive 94% OFF offer expires in:')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getAllByText('00')).toHaveLength(2);
  });

  it('When a coupon is applied, then the summary shows the discount, the taxes and the total', () => {
    renderUrgentCheckout();

    expect(screen.getByText('94% OFF applied')).toBeTruthy();
    expect(screen.getByText('$29.99')).toBeTruthy();
    expect(screen.getByText('$1.79')).toBeTruthy();
    expect(screen.getByText('$0.39')).toBeTruthy();
    expect(screen.getByText('$2.18')).toBeTruthy();
  });

  it('When the page loads, then the payment element, the call to action and the guarantee are shown', () => {
    renderUrgentCheckout();

    expect(screen.getByTestId('payment-element')).toBeTruthy();
    expect(screen.getByText('Get 5TB for $1.79')).toBeTruthy();
    expect(screen.getByText('First month $1.79, then renews at $29.99/month. Cancel anytime.')).toBeTruthy();
    expect(screen.getByText('30-day money-back guarantee')).toBeTruthy();
  });

  it.each([
    [UrgentCheckoutVariant.Adult, 'adult'],
    [UrgentCheckoutVariant.Mainstream, 'family'],
  ])('When the %s creative variant is requested, then its image is the one rendered', (variant, expectedImage) => {
    const { container } = renderUrgentCheckout(variant);

    expect(container.querySelector(`img[alt="${CREATIVE_IMAGE_ALT}"]`)?.getAttribute('src')).toContain(expectedImage);
  });

  describe('Crypto payments', () => {
    const getCryptoSection = () => screen.getByText('Crypto').closest<HTMLElement>('[style*="--color-surface"]');

    it('When no crypto currencies are available, then the crypto payment option is not shown', () => {
      renderUrgentCheckout();

      expect(screen.queryByText('Crypto')).toBeNull();
    });

    it('When crypto currencies are available, then the section is shown and repainted dark', () => {
      renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, { cryptoCurrencies: availableCryptoCurrencies });
      const cryptoSection = getCryptoSection();

      expect(cryptoSection).toBeTruthy();
      expect(cryptoSection?.className).toContain('text-white');
      expect(cryptoSection?.style.getPropertyValue('--color-surface')).toBe('10 17 32');
    });

    it('When the crypto dropdown is opened, then the currencies are listed and the payment type changes', () => {
      const onCurrencyTypeChanges = vi.fn();
      renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, {
        cryptoCurrencies: availableCryptoCurrencies,
        onCurrencyTypeChanges,
      });

      fireEvent.click(screen.getByText('Crypto'));

      expect(getCryptoSection()?.contains(screen.getByText('Bitcoin'))).toBe(true);
      expect(onCurrencyTypeChanges).toHaveBeenCalledWith(PaymentType.CRYPTO);
    });
  });

  describe('Signing up and logging in', () => {
    const renderSignedInUrgentCheckout = async () => {
      await act(async () => {
        renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, { authMethod: 'userIsSignedIn' });
      });
    };

    it.each<[AuthMethodTypes, string, string, string]>([
      ['signUp', 'Create a password', 'Already have an account?', 'Login'],
      ['signIn', 'Your password', 'Don’t have an account?', 'Create account'],
    ])(
      'When the visitor is on %s, then its copy and the link to the other method are shown',
      (authMethod, passwordLabel, question, link) => {
        renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, { authMethod });

        expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy();
        expect(screen.getByText(passwordLabel)).toBeTruthy();
        expect(screen.getByText(question)).toBeTruthy();
        expect(screen.getByText(link)).toBeTruthy();
        expect(screen.getByText('Your files are encrypted and private.')).toBeTruthy();
      },
    );

    it.each<[AuthMethodTypes, string, AuthMethodTypes]>([
      ['signUp', 'Login', 'signIn'],
      ['signIn', 'Create account', 'signUp'],
    ])('When the visitor on %s clicks the link, then the auth method changes', (authMethod, link, expected) => {
      renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, { authMethod });

      fireEvent.click(screen.getByText(link));

      expect(checkoutViewManager.handleAuthMethodChange).toHaveBeenCalledWith(expected);
    });

    it('When the auth method is switched, then the credentials already typed are cleared', () => {
      renderUrgentCheckout();
      const email = screen.getByPlaceholderText('you@email.com') as HTMLInputElement;
      const password = screen.getByPlaceholderText('Password') as HTMLInputElement;

      fireEvent.change(email, { target: { value: 'test@internxt.com' } });
      fireEvent.change(password, { target: { value: 'a-password' } });
      fireEvent.click(screen.getByText('Login'));

      expect(email.value).toBe('');
      expect(password.value).toBe('');
    });

    it('When the password visibility is toggled, then the password stops being masked', () => {
      renderUrgentCheckout();
      const password = screen.getByPlaceholderText('Password') as HTMLInputElement;

      expect(password.type).toBe('password');

      fireEvent.click(screen.getByLabelText('Show or hide password'));

      expect(password.type).toBe('text');
    });

    it('When authentication fails, then the error returned by the checkout is shown', () => {
      renderUrgentCheckout(UrgentCheckoutVariant.Mainstream, { authError: 'Wrong credentials' });

      expect(screen.getByText('Wrong credentials')).toBeTruthy();
    });

    it('When the user is already signed in, then their account is shown instead of the credentials form', async () => {
      await renderSignedInUrgentCheckout();

      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByText('test@internxt.com')).toBeTruthy();
      expect(screen.queryByPlaceholderText('you@email.com')).toBeNull();
    });

    it('When the signed in user logs out, then the checkout is asked to log them out', async () => {
      await renderSignedInUrgentCheckout();

      fireEvent.click(screen.getByText('Log out'));

      expect(checkoutViewManager.onLogOut).toHaveBeenCalled();
    });
  });
});
