import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElementsOptions, loadStripe } from '@stripe/stripe-js';
import { useEffect, useState, useCallback } from 'react';

import envService from 'app/core/services/env.service';
import navigationService from 'app/core/services/navigation.service';
import CheckoutView from './CheckoutView';
import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { AppView } from 'app/core/types';
import checkoutService from './services/checkout.service';
import { PasswordStateProps } from './types';

// Load Stripe instance based on environment (production or test)
const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const [selectedPlan, setSelectedPlan] = useState<DisplayPrice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elementsOptions, setElementsOptions] = useState<StripeElementsOptions>();

  const [passwordState, setPasswordState] = useState<PasswordStateProps | null>(null);
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

  const loadPlanAndPaymentIntent = useCallback(async (planId: string) => {
    setIsLoading(true);

    try {
      const plan = await checkoutService.fetchPlanById(planId);
      setSelectedPlan({
        amount: plan.amount / 100,
        bytes: plan.bytes,
        currency: plan.currency,
        id: plan.id,
        interval: plan.interval,
      });

      setElementsOptions({
        appearance: {
          labels: 'above',
          variables: {
            spacingAccordionItem: '8px',
          },
          theme: 'flat',
        },
        mode: plan.interval === 'lifetime' ? 'payment' : 'subscription',
        amount: plan.amount,
        currency: plan.currency,
      });

      stripePromise.then((stripe) => {
        setStripe(stripe);
      });
    } catch (error) {
      console.error('Error fetching plan or payment intent:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');

    if (planId) {
      loadPlanAndPaymentIntent(planId);
    } else {
      navigationService.push(AppView.Drive);
    }
  }, [loadPlanAndPaymentIntent]);

  return isLoading ? (
    <></>
  ) : (
    <Elements stripe={stripe} options={elementsOptions}>
      <CheckoutView
        isLoading={isLoading}
        onShowPasswordIndicator={setShowPasswordIndicator}
        passwordState={passwordState}
        selectedPlan={selectedPlan}
        showPasswordIndicator={showPasswordIndicator}
      />
    </Elements>
  );
};

export default CheckoutViewWrapper;
