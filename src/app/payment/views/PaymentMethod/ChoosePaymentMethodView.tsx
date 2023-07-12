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
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Icon from './components/Icon';
import { handleCheckout } from './utils/handleCheckout';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import analyticsService from 'app/analytics/services/analytics.service';
import { planThunks } from 'app/store/slices/plan';
import PreparingWorkspaceAnimation from 'app/auth/components/PreparingWorkspaceAnimation/PreparingWorkspaceAnimation';
import Checkbox from './components/Checkbox';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

const cards = [visaIcon, amexIcon, mastercardIcon];

interface PlanSelected {
  id: string;
  amount: string;
  renewal: string;
  interval: string;
  space: string;
  coupon?: string;
}

const ChoosePaymentMethod: React.FC = () => {
  const [isFirstStepCompleted, setIsFirstStepCompleted] = useState(false);
  const [planSelected, setPlanSelected] = useState<PlanSelected>();
  const Step: JSX.Element = isFirstStepCompleted ? <LastStep /> : <FirstStep planSelected={planSelected} />;
  const [isLoading, setIsLoading] = useState(false);
  const params = new URLSearchParams(window.location.search);

  const interval = {
    month: t('views.account.tabs.plans.paymentMethod.billing.month'),
    year: t('views.account.tabs.plans.paymentMethod.billing.year'),
    lifetime: t('views.account.tabs.plans.paymentMethod.billing.lifetime'),
  };

  const billing = {
    month: t('general.renewal.monthly'),
    year: t('general.renewal.annually'),
    lifetime: t('general.renewal.lifetime'),
  };

  const handlePaymentStatus = (success: boolean) => {
    localStorage.removeItem('spaceForPaymentMethod');
    setIsFirstStepCompleted(success);
    setIsLoading(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const priceId = String(urlParams.get('priceId'));
    const coupon = String(urlParams.get('coupon_code'));
    const couponCode = coupon !== 'null' ? { coupon: coupon } : undefined;
    const isPaypalPaymentCompleted = params.get('redirect_status') === 'succeeded';
    const isPaypalPaymentFailed = params.get('redirect_status') === 'failed';
    const isCreditCardPaymentCompleted = params.get('payment') === 'success';

    paymentService.getPrices().then((prices) => {
      const plan = prices.find((price) => price.id === priceId);
      if (plan) {
        setPlanSelected({
          id: plan.id,
          amount: Math.abs(plan.amount / 100).toFixed(2),
          renewal: billing[plan.interval],
          interval: interval[plan.interval],
          space: bytesToString(plan.bytes),
          ...couponCode,
        });
      }
    });

    setIsLoading(true);
    if (isCreditCardPaymentCompleted) {
      handlePaymentStatus(true);
    } else if (isPaypalPaymentCompleted) {
      if (isPaypalPaymentCompleted) {
        handlePaymentStatus(true);
      } else if (isPaypalPaymentFailed) {
        handlePaymentStatus(false);
        notificationsService.show({
          text: t('error.errorUpdatingSubscription'),
          type: ToastType.Error,
        });
        navigationService.push(AppView.Drive);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
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
        onClick={() => {
          navigationService.push(AppView.Drive);
          localStorage.removeItem('setupIntentId');
        }}
      >
        <ArrowLeft size={24} />
        <p>{t('actions.back')}</p>
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
          <p className={`text-sm ${isFirstStepCompleted ? textColor.completed : textColor.current}`}>
            {t('views.account.tabs.plans.paymentMethod.stepTracking.first')}
          </p>
          <p className={`text-sm ${isFirstStepCompleted ? textColor.completed : textColor.pending}`}>
            {t('views.account.tabs.plans.paymentMethod.stepTracking.second')}
          </p>
          <p className={`${isFirstStepCompleted ? textColor.current : textColor.pending} text-sm`}>
            {t('views.account.tabs.plans.paymentMethod.stepTracking.third')}
          </p>
        </div>
      </div>
    </div>
  );
};

const FirstStep = ({ planSelected }) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  if (user === undefined) {
    navigationService.push(AppView.Login);
  }

  const handleCheckoutObject = {
    paymentMethod: paymentMethod,
    planId: planSelected?.id ?? '',
    interval: planSelected?.interval ?? '',
    email: user.email,
    coupon: planSelected?.coupon ?? '',
  };

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
        <p className="text-xl font-medium text-gray-100">
          {t('views.account.tabs.plans.paymentMethod.firstStep.selectedPlan')}:
        </p>
        <div className="items-left flex w-full flex-row items-center space-x-8 rounded-xl border border-gray-10 py-7 pl-5 shadow-md">
          <p className="text-3xl font-medium text-primary">{planSelected?.space}</p>
          <div className="flex flex-col">
            <p className="text-sm">{t('views.account.tabs.plans.paymentMethod.firstStep.price')}</p>
            <p className="text-lg font-medium text-gray-100">
              €{planSelected?.amount}/{planSelected?.interval}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm">{t('views.account.tabs.plans.paymentMethod.firstStep.billing')}</p>
            <p className="text-lg font-medium text-gray-100">{planSelected?.renewal}</p>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col space-y-3">
        <p className="text-xl font-medium text-gray-100">
          {t('views.account.tabs.plans.paymentMethod.firstStep.howLikePay')}
        </p>
        <div className="flex w-full flex-row items-center justify-between space-x-5 rounded-xl border border-gray-10 py-7 px-5 shadow-md">
          <div className="flex flex-row items-center space-x-4">
            <Checkbox
              id={'paypal-checkbox'}
              checked={paymentMethod === 'paypal'}
              onClick={() => handleCheckbox('paypal')}
            />
            <p className="text-xl font-medium">{t('views.account.tabs.plans.paymentMethod.firstStep.paypal')}</p>
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
            <p className="text-xl font-medium">{t('views.account.tabs.plans.paymentMethod.firstStep.creditCard')}</p>
          </div>
          <div className="flex flex-row space-x-1">
            {cards.map((card) => (
              <img key={card} alt={card} className="h-6 rounded-md" src={card} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center space-y-3">
        <p className="text-gray-60">{t('views.account.tabs.plans.paymentMethod.firstStep.wontBeCharged')}</p>
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
          {t('views.account.tabs.plans.paymentMethod.firstStep.continue')}
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
        <p className="text-xl font-medium text-gray-100">
          {t('views.account.tabs.plans.paymentMethod.thirdStep.spaceUpgraded', {
            space: space,
          })}
        </p>
        <p className="text-lg text-gray-60">{t('views.account.tabs.plans.paymentMethod.thirdStep.thanksForUpdate')}</p>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem('spaceForPaymentMethod');
          navigationService.push(AppView.Drive);
        }}
        className={'flex w-full items-center justify-center rounded-lg bg-primary py-3 text-white'}
      >
        {t('views.account.tabs.plans.paymentMethod.thirdStep.goToDrive')}
      </button>
    </div>
  );
};

export default ChoosePaymentMethod;
