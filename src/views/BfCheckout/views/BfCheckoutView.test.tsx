import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { render, screen } from '@testing-library/react';
import enTranslations from 'app/i18n/locales/en.json';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BfCheckoutView from './BfCheckoutView';
import { BfCheckoutManager } from '../types';
import { BfCheckoutVariant } from '../constants';

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({}),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element" />,
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

const BYTES_IN_5TB = 5497558138880;

const selectedPlan = {
  price: {
    id: 'price_id',
    bytes: BYTES_IN_5TB,
    currency: 'usd',
    decimalAmount: 29.99,
    amount: 2999,
    interval: 'month',
    type: 'individual',
  },
  taxes: {
    amountWithTax: 218,
    decimalAmountWithTax: 2.18,
  },
} as unknown as PriceWithTax;

const couponCodeData: CouponCodeData = {
  percentOff: 94,
  amountOff: undefined,
  codeId: 'code_id',
  codeName: 'OFFER94',
};

const checkoutViewManager = {
  onLogOut: vi.fn(),
  onCheckoutButtonClicked: vi.fn(),
  handleAuthMethodChange: vi.fn(),
  onCurrencyChange: vi.fn(),
} as unknown as BfCheckoutManager;

const renderBfCheckout = (variant = BfCheckoutVariant.Mainstream) =>
  render(
    <BfCheckoutView
      userInfo={{ name: 'Test User', avatar: null, email: 'test@internxt.com' }}
      variant={variant}
      userAuthComponentRef={null}
      checkoutViewVariables={{
        isPaying: false,
        authMethod: 'signUp',
        couponCodeData,
        currentSelectedPlan: selectedPlan,
      }}
      checkoutViewManager={checkoutViewManager}
    />,
  );

describe('BF checkout view', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('When the page loads, then the selling points and the offer copy are shown', () => {
    renderBfCheckout();

    expect(screen.getByText('94% OFF — Limited-time exclusive offer')).toBeTruthy();
    expect(screen.getByText(/Keep your files, photos & videos/)).toBeTruthy();
    expect(screen.getByText('100% private.')).toBeTruthy();
    expect(screen.getByText('Get 5TB of private cloud storage for just $1.79 for your first month.')).toBeTruthy();
    expect(screen.getByText('Only you can access your files')).toBeTruthy();
    expect(screen.getByText('Your private cloud, protected')).toBeTruthy();
    expect(screen.getByText('94% OFF — for a limited time')).toBeTruthy();
    expect(screen.getByText('Audited by Securitum')).toBeTruthy();
  });

  it('When the page loads, then the countdown starts from one hour and is framed around the discount', () => {
    renderBfCheckout();

    expect(screen.getByText('Your exclusive 94% OFF offer expires in:')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getAllByText('00').length).toBe(2);
    expect(screen.getByText('Get 5TB for $1.79 before this offer ends.')).toBeTruthy();
  });

  it('When a coupon is applied, then the summary shows the discount, the taxes and the total', () => {
    renderBfCheckout();

    expect(screen.getByText('94% OFF applied')).toBeTruthy();
    expect(screen.getByText('Ultimate — annual')).toBeTruthy();
    expect(screen.getByText('$29.99')).toBeTruthy();
    expect(screen.getByText('$1.79')).toBeTruthy();
    expect(screen.getByText('Estimated tax')).toBeTruthy();
    expect(screen.getByText('$0.39')).toBeTruthy();
    expect(screen.getByText(/saving 94%/)).toBeTruthy();
    expect(screen.getByText('-$28.20')).toBeTruthy();
    expect(screen.getByText('$2.18')).toBeTruthy();
  });

  it('When the visitor has no account yet, then the email and password fields and the privacy notice are shown', () => {
    renderBfCheckout();

    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy();
    expect(screen.getByText('Create a password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Your files are encrypted and private.')).toBeTruthy();
    expect(screen.getByText('Internxt cannot access your content.')).toBeTruthy();
  });

  it('When the page loads, then the payment element, the call to action and the guarantee are shown', () => {
    renderBfCheckout();

    expect(screen.getByTestId('payment-element')).toBeTruthy();
    expect(screen.getByText('Get 5TB for $1.79')).toBeTruthy();
    expect(screen.getByText('First month $1.79, then renews at $29.99/month. Cancel anytime.')).toBeTruthy();
    expect(screen.getByText('30-day money-back guarantee')).toBeTruthy();
  });

  it('When a creative variant is requested, then its image is the one rendered', () => {
    const { container, unmount } = renderBfCheckout(BfCheckoutVariant.Adult);
    const adultImage = container.querySelector('img[alt="Internxt Drive on a laptop and a phone"]');

    expect(adultImage?.getAttribute('src')).toContain('adult');
    unmount();

    const { container: mainstreamContainer } = renderBfCheckout(BfCheckoutVariant.Mainstream);
    const mainstreamImage = mainstreamContainer.querySelector('img[alt="Internxt Drive on a laptop and a phone"]');

    expect(mainstreamImage?.getAttribute('src')).toContain('family');
  });
});
