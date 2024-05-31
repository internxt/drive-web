import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { Stripe, StripeElementsOptions, StripePaymentElementOptions, loadStripe } from '@stripe/stripe-js';
import envService from '../../../../core/services/env.service';
import Button from 'app/shared/components/Button/Button';

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

export const PaymentComponent = ({ handleCheckout, clientSecret }) => {
  const elementsOptions: StripeElementsOptions = {
    mode: 'subscription',
    amount: 1099,
    currency: 'eur',
    capture_method: 'automatic',
    clientSecret: clientSecret,
    appearance: {
      labels: 'above',
      variables: {
        spacingAccordionItem: '8px',
      },
      theme: 'flat',
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
    <form className="flex flex-col space-y-8 pb-20" onSubmit={handleCheckout}>
      <p className="text-2xl font-semibold text-gray-100">2. Select a payment method</p>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentElement options={paymentElementOptions} />
        <Button id="submit">Pay</Button>
      </Elements>
    </form>
  );
};
