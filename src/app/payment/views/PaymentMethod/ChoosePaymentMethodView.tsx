import paymentService from 'app/payment/services/payment.service';
import { ArrowLeft, Check, CheckCircle, CreditCard, Package } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import visaIcon from '../../../../assets/icons/card-brands/visa.png';
import amexIcon from '../../../../assets/icons/card-brands/amex.png';
import mastercardIcon from '../../../../assets/icons/card-brands/mastercard.png';
import PayPal from '../../../../assets/icons/card-brands/PayPal.png';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Icon from './components/Icon';
import { handleCheckout } from './utils/handleCheckout';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import analyticsService from 'app/analytics/services/analytics.service';
import { planThunks } from 'app/store/slices/plan';
import PreparingWorkspaceAnimation from 'app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import { stripeService } from './utils/stripe.service';

const cards = [visaIcon, amexIcon, mastercardIcon];

interface PlanSelected {
  id: string;
  amount: string;
  renewal: string;
  interval: string;
  space: string;
}

const Checkbox = ({
  id,
  checked,
  indeterminate,
  onClick,
  required,
  className,
  rounded,
}: {
  id: string;
  checked: boolean;
  indeterminate?: boolean;
  onClick?: () => void;
  required?: boolean;
  className?: string;
  rounded?: string;
}): JSX.Element => {
  return (
    <label
      className={`focus-within:outline-primary relative h-5 w-5 ${rounded ? rounded : 'rounded'} ${className}`}
      onClick={onClick}
    >
      <div
        onClick={(e) => e.preventDefault()}
        className={`relative flex h-5 w-5 cursor-pointer flex-col items-center justify-center rounded-full border bg-white p-1 text-white ${
          indeterminate || checked ? 'border-primary bg-primary' : 'border-gray-30 hover:border-gray-40'
        }`}
      >
        {checked && (
          <div
            className={`flex h-3 w-2.5 cursor-pointer flex-col items-center justify-center rounded-full border bg-white text-white ${
              checked && 'bg-white'
            }`}
          />
        )}
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
};

const ChoosePaymentMethod: React.FC = () => {
  const [isFirstStepCompleted, setIsFirstStepCompleted] = useState(false);
  const Step: JSX.Element = isFirstStepCompleted ? <LastStep /> : <FirstStep />;
  const [isLoading, setIsLoading] = useState(false);
  const params = new URLSearchParams(window.location.search);

  const setupIntent = async () => {
    const intentId = localStorage.getItem('setupIntentId');
    if (intentId) {
      const setupIntent = await stripeService.retrieveSetupIntent(intentId);
      return setupIntent;
    } else {
      return null;
    }
  };

  useEffect(() => {
    setIsLoading(true);
    if (params.get('payment') === 'success') {
      setIsFirstStepCompleted(true);
      setIsLoading(false);
    } else {
      setupIntent().then((setupIntent) => {
        if (setupIntent?.setupIntent?.status === 'succeeded') {
          setIsFirstStepCompleted(true);
          setIsLoading(false);
        } else if (setupIntent?.setupIntent?.status === 'canceled') {
          setIsFirstStepCompleted(false);
          setIsLoading(false);
          navigationService.push(AppView.Drive);
        } else if (!setupIntent) {
          setIsFirstStepCompleted(false);
          setIsLoading(false);
        }
      });
    }
  }, []);

  return (
    <div className={'flex h-screen w-screen p-8'}>
      <div className="flex w-full flex-col">
        {isLoading ? (
          <PreparingWorkspaceAnimation />
        ) : (
          <>
            <StepTracking isFirstStepCompleted={isFirstStepCompleted} />
            <div
              className={`flex w-full flex-col items-center justify-center ${
                isFirstStepCompleted ? 'pl-0' : 'pl-20'
              } pt-5`}
            >
              {Step}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StepTracking = ({ isFirstStepCompleted }: { isFirstStepCompleted: boolean }) => {
  const textColor = {
    completed: 'text-primary',
    pending: 'text-gray-50',
    current: 'text-primary font-semibold',
  };

  return (
    <div className="flex flex-row">
      <div
        className={`${
          isFirstStepCompleted ? 'hidden' : 'flex'
        } cursor-pointer flex-row items-start justify-start space-x-2 font-medium text-gray-60`}
        onClick={() => navigationService.push(AppView.Drive)}
      >
        <ArrowLeft size={24} />
        <p>Back</p>
      </div>
      <div className="flex w-full flex-col items-center justify-center py-4">
        <div className="flex w-full max-w-sm flex-row items-center justify-center">
          <Icon state={isFirstStepCompleted ? 'completed' : 'current'} Icon={Package} />

          <div
            className={`flex w-full flex-1 items-start justify-center border-2 ${
              isFirstStepCompleted ? 'border-primary border-opacity-15' : 'border-gray-5'
            }`}
          />

          <Icon Icon={CreditCard} state={isFirstStepCompleted ? 'completed' : 'pending'} />

          <div
            className={`flex w-full flex-1 items-start justify-center border-2 ${
              isFirstStepCompleted ? 'border-primary border-opacity-15' : 'border-gray-5'
            }`}
          />

          <Icon Icon={Check} state={isFirstStepCompleted ? 'current' : 'pending'} />
        </div>

        <div className="flex w-full flex-row items-center justify-center space-x-24 pt-1.5">
          <p className={`text-sm ${isFirstStepCompleted ? textColor.completed : textColor.current}`}>Preview order</p>
          <p className={`text-sm ${isFirstStepCompleted ? textColor.completed : textColor.pending}`}>Checkout</p>
          <p className={`${isFirstStepCompleted ? textColor.current : textColor.pending} text-sm`}>Confirmation</p>
        </div>
      </div>
    </div>
  );
};

const FirstStep = () => {
  const { translate } = useTranslationContext();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [planSelected, setPlanSelected] = useState<PlanSelected>();
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  if (user === undefined) {
    navigationService.push(AppView.Login);
  }

  const billing = {
    month: translate('general.renewal.monthly'),
    year: translate('general.renewal.annually'),
    lifetime: translate('general.renewal.lifetime'),
  };

  const handleCheckoutObject = {
    paymentMethod: paymentMethod,
    planId: planSelected?.id ?? '',
    interval: planSelected?.interval ?? '',
    email: user.email,
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const priceId = String(urlParams.get('priceId'));

    paymentService.getPrices().then((prices) => {
      const plan = prices.find((price) => price.id === priceId);
      if (plan) {
        setPlanSelected({
          id: plan.id,
          amount: Math.abs(plan.amount / 100).toFixed(2),
          renewal: billing[plan.interval],
          interval: plan.interval,
          space: bytesToString(plan.bytes),
        });
      }
    });
  }, []);

  const handleCheckbox = (id) => {
    if (id === 'paypal') {
      setPaymentMethod('paypal');
    } else if (id === 'card') {
      setPaymentMethod('credit-card');
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center space-y-8">
      <div className="flex w-full flex-col items-start justify-start space-y-3">
        <p className="text-xl font-medium text-gray-100">Selected plan:</p>
        <div className="items-left flex w-full flex-row items-center space-x-8 rounded-xl border border-gray-10 py-7 pl-5 shadow-md">
          <p className="text-3xl font-medium text-primary">{planSelected?.space}</p>
          <div className="flex flex-col">
            <p className="text-sm">Price</p>
            <p className="text-lg font-medium text-gray-100">
              €{planSelected?.amount}/{planSelected?.interval}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm">Billing</p>
            <p className="text-lg font-medium text-gray-100">{planSelected?.renewal}</p>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col space-y-3">
        <p className="text-xl font-medium text-gray-100">How would you like to pay?</p>
        <div className="flex w-full flex-row items-center justify-between space-x-5 rounded-xl border border-gray-10 py-7 px-5 shadow-md">
          <div className="flex flex-row items-center space-x-4">
            <Checkbox
              id={'paypal-checkbox'}
              checked={paymentMethod === 'paypal'}
              onClick={() => handleCheckbox('paypal')}
            />
            <p className="text-xl font-medium">PayPal</p>
          </div>
          <img src={PayPal} />
        </div>
        <div className="flex w-full flex-row items-center justify-between space-x-5 rounded-xl border border-gray-10 py-7 px-5 shadow-md">
          <div className="flex flex-row items-center space-x-4">
            <Checkbox
              id={'card-checkbox'}
              checked={paymentMethod === 'credit-card'}
              onClick={() => handleCheckbox('card')}
            />
            <p className="text-xl font-medium">Credit card</p>
          </div>
          <div className="flex flex-row space-x-1">
            {cards.map((card) => (
              <img key={card} alt={card} className="h-6 rounded-md" src={card} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center space-y-3">
        <p className="text-gray-60">You won't be charged yet</p>
        <button
          disabled={!paymentMethod}
          onClick={() => {
            handleCheckout(handleCheckoutObject);
            localStorage.setItem('spaceForPaymentMethod', planSelected?.space ?? '');
          }}
          className={`flex w-full items-center justify-center rounded-lg ${
            paymentMethod ? 'bg-primary' : 'cursor-not-allowed bg-gray-30'
          } py-3 text-white`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const LastStep = () => {
  const dispatch = useDispatch();
  const space = localStorage.getItem('spaceForPaymentMethod');

  const onCheckoutSuccess = useCallback(async () => {
    await dispatch(planThunks.initializeThunk());
    try {
      await analyticsService.trackPaymentConversion();
    } catch (err) {
      console.log('Analytics error: ', err);
    }
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center space-y-8">
      <div className="flex w-full items-center justify-center text-primary">
        <CheckCircle size={80} weight="light" />
      </div>
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <p className="text-xl font-medium text-gray-100">Space updated to {space}</p>
        <p className="text-lg text-gray-60">Thank you for upgrading your account space</p>
      </div>
      <button
        onClick={() => {
          navigationService.push(AppView.Drive);

          localStorage.removeItem('spaceForPaymentMethod');
          localStorage.removeItem('setupIntentId');
        }}
        className={'flex w-full items-center justify-center rounded-lg bg-primary py-3 text-white'}
      >
        Go to Internxt Drive
      </button>
    </div>
  );
};

export default ChoosePaymentMethod;
