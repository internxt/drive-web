import { loadStripe, SetupIntentResult, Stripe } from '@stripe/stripe-js';
import envService from 'app/core/services/env.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { ArrowLeft, Check, CreditCard, Package } from 'phosphor-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import visaIcon from '../../../../assets/icons/card-brands/visa.png';
import amexIcon from '../../../../assets/icons/card-brands/amex.png';
import mastercardIcon from '../../../../assets/icons/card-brands/mastercard.png';
import PayPal from '../../../../assets/icons/card-brands/PayPal.png';

let stripe: Stripe;

const cards = [visaIcon, amexIcon, mastercardIcon];

async function paypalSetupIntent(setupIntentId, priceId): Promise<SetupIntentResult> {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }

  return await stripe.confirmPayPalSetup(setupIntentId, {
    return_url: 'https://example.com/setup/complete',
    mandate_data: {
      mandate_data: {
        customer_acceptance: {
          type: 'online',

          online: {
            infer_from_client: true,
          },
        },
      },
      metadata: priceId,
      payment_method: {
        payment_method: 'paypal',
      },
    },
  });
}

async function checkoutWithCard(user, interval, priceId): Promise<void> {
  const { t } = useTranslation();

  try {
    const response = await paymentService.createCheckoutSession({
      price_id: priceId,
      success_url: `${window.location.origin}/checkout/success`,
      cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
      customer_email: user.email,
      mode: interval === 'lifetime' ? 'payment' : 'subscription',
    });
    console.log(response);
    localStorage.setItem('sessionId', response.sessionId);
    // await paymentService.redirectToCheckout({ sessionId: response.checkout });

    // In case the payment method is PayPal, we need to autorize the payment
  } catch (err) {
    console.error(err);
    notificationsService.show({
      text: t('notificationMessages.errorCancelSubscription'),
      type: ToastType.Error,
    });
  }
}

function Checkbox({
  id,
  checked,
  onClick,
  required,
  className,
}: {
  id: string;
  checked: boolean;
  onClick?: React.DOMAttributes<HTMLLabelElement>['onClick'];
  required?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <label className={`focus-within:outline-primary relative h-5 w-5 rounded-full ${className}`} onClick={onClick}>
      <div
        onClick={(e) => e.preventDefault()}
        className={`relative flex h-5 w-5 cursor-pointer flex-col items-center justify-center rounded-full border bg-white p-1 text-white ${
          checked ? 'border-primary bg-primary' : 'border-gray-30 hover:border-gray-40'
        }`}
      >
        {checked && <Check size={16} weight="bold" />}
      </div>
      <input
        id={id}
        checked={checked}
        type="checkbox"
        required={required ?? false}
        readOnly
        className="base-checkbox h-0 w-0 appearance-none opacity-0"
      />
    </label>
  );
}

function StepsComponent(): JSX.Element {
  //The steps should be at the center of the screen

  return (
    <div className="flex w-full flex-row">
      {/* The back button should be at the left of the screen */}
      <div className="flex items-start justify-start space-x-2 font-medium text-gray-60">
        <ArrowLeft size={24} />
        <p>Back</p>
      </div>
      <div className="flex w-full flex-col items-center justify-center py-4">
        <div className="flex w-full max-w-sm flex-row items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex rounded-full bg-primary p-3">
              <Package size={24} weight="light" className="text-white" />
            </div>
          </div>

          <div className="flex w-full flex-1 items-start justify-center border-2 border-gray-5" />

          <div className="flex flex-col items-center justify-center">
            <div className="flex rounded-full bg-gray-5 p-3">
              <CreditCard size={24} weight="light" className="text-gray-80" />
            </div>
          </div>

          <div className="flex w-full flex-1 items-start justify-center border-2 border-gray-5" />

          <div className="flex flex-col items-center justify-center">
            <div className="flex rounded-full bg-gray-5 p-3">
              <Check size={24} weight="light" className="text-gray-80" />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-center space-x-24 pt-1.5">
          <p className="text-sm font-semibold text-primary">Preview order</p>
          <p className="text-sm text-gray-50">Checkout</p>
          <p className="text-sm text-gray-50">Confirmation</p>
        </div>
      </div>
    </div>
  );
}

function SelectedPlanComponent({ setPaymentMethod }): JSX.Element {
  const [paypalChecked, setPaypalChecked] = useState(false);
  const [cardChecked, setCardChecked] = useState(false);

  const handleCheckbox = (id) => {
    if (id === 'paypal-checkbox') {
      setPaypalChecked(true);
      setCardChecked(false);
      setPaymentMethod('paypal');
    } else if (id === 'card-checkbox') {
      setPaypalChecked(false);
      setCardChecked(true);
      setPaymentMethod('credit-card');
    }
  };
  return (
    <div className="flex w-full flex-col items-center justify-center pl-20 pt-5">
      <div className="flex w-full max-w-sm flex-col items-center justify-center space-y-8">
        <div className="flex w-full flex-col items-start justify-start space-y-3">
          <p className="text-xl font-medium text-gray-100">Selected plan:</p>
          <div className="items-left flex w-full flex-row items-center space-x-5 rounded-xl border border-gray-10 py-7 pl-5 shadow-md">
            <p className="text-3xl font-medium text-primary">200GB</p>
            <div className="flex flex-col">
              <p className="text-sm">Price</p>
              <p className="text-lg font-medium text-gray-100">€4.49/month</p>
            </div>
            <div className="flex flex-col">
              <p className="text-sm">Billing</p>
              <p className="text-lg font-medium text-gray-100">Monthly</p>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col space-y-3">
          <p className="text-xl font-medium text-gray-100">How would you like to pay?</p>
          <div className="flex w-full flex-row items-center justify-between space-x-5 rounded-xl border border-gray-10 py-7 px-5 shadow-md">
            <div className="flex flex-row items-center space-x-4">
              <Checkbox
                id={'paypal-checkbox'}
                checked={paypalChecked}
                onClick={() => handleCheckbox('paypal-checkbox')}
              />
              <p className="text-xl font-medium">PayPal</p>
            </div>
            <img src={PayPal} />
          </div>
          <div className="flex w-full flex-row items-center justify-between space-x-5 rounded-xl border border-gray-10 py-7 px-5 shadow-md">
            <div className="flex flex-row items-center space-x-4">
              <Checkbox id={'card-checkbox'} checked={cardChecked} onClick={() => handleCheckbox('card-checkbox')} />
              <p className="text-xl font-medium">Credit card</p>
            </div>
            <div className="flex flex-row space-x-1">
              {cards.map((card) => (
                <img className="h-6 rounded-md" src={card} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col"></div>
      </div>
    </div>
  );
}

const ChoosePaymentMethod: React.FC = () => {
  const [paymentSelected, setPaymentSelected] = useState<'paypal' | 'credit-card' | null>(null);
  console.log(paymentSelected);
  return (
    <div className={'flex h-screen w-screen p-8'}>
      <div className="flex w-full flex-col">
        <StepsComponent />
        <SelectedPlanComponent setPaymentMethod={setPaymentSelected} />
      </div>
    </div>
  );
};

export default ChoosePaymentMethod;
