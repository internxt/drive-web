import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { Stripe, StripeElementsOptions, StripePaymentElementOptions, loadStripe } from '@stripe/stripe-js';
import envService from '../../../../core/services/env.service';

let stripe;

async function getStripe(): Promise<Stripe> {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }

  return stripe;
}

const stripePromise = getStripe();

export const PaymentComponent = () => {
  const elementsOptions: StripeElementsOptions = {
    mode: 'subscription',
    amount: 1099,
    currency: 'eur',
    payment_method_types: ['card', 'paypal', 'bancontact', 'ideal', 'sofort'],
    appearance: {
      labels: 'above',
      variables: {
        spacingAccordionItem: '8px',
        colorBackground: '',
      },
    },
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: {
      type: 'accordion',
      defaultCollapsed: false,
      radios: false,
      spacedAccordionItems: true,
    },
  };

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-2xl font-semibold text-gray-100">2. Select a payment method</p>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentElement options={paymentElementOptions} />
      </Elements>
    </div>
  );
};
