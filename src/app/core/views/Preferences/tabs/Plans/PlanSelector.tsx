import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { bytesToString } from '../../../../../drive/services/size.service';
import paymentService from '../../../../../payment/services/payment.service';
import Button from '../../../../../shared/components/Button/Button';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';

export default function PlanSelector({ className = '' }: { className?: string }): JSX.Element {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const { subscription } = plan;

  const priceButtons = subscription?.type === 'subscription' ? 'change' : 'upgrade';

  const [prices, setPrices] = useState<DisplayPrice[] | null>(null);
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    paymentService.getPrices().then(setPrices);
  }, []);

  const pricesFilteredAndSorted = prices
    ?.filter((price) => price.interval === interval)
    .sort((a, b) => a.amount - b.amount);

  return (
    <div className={`${className}`}>
      <div className="flex justify-center">
        <div className="flex h-9 w-56 rounded-lg bg-gray-5 p-0.5">
          <IntervalSwitch active={interval === 'month'} text="Monthly" onClick={() => setInterval('month')} />
          <IntervalSwitch active={interval === 'year'} text="Annually" onClick={() => setInterval('year')} />
        </div>
      </div>
      <div className="mt-5 flex gap-x-5">
        {pricesFilteredAndSorted?.map((price) => (
          <Price
            key={price.id}
            {...price}
            button={
              subscription?.type === 'subscription' && subscription.priceId === price.id ? 'current' : priceButtons
            }
          />
        ))}
      </div>
    </div>
  );
}

function IntervalSwitch({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      className={`${active ? 'bg-white text-gray-100' : 'text-gray-50'} w-1/2 rounded-lg font-medium`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function Price({
  bytes,
  amount,
  interval,
  button,
  className = '',
}: DisplayPrice & { button: 'change' | 'current' | 'upgrade'; onClick?: () => void; className?: string }): JSX.Element {
  let amountMonthly: number;
  let amountAnnually: number;

  if (interval === 'month') {
    amountMonthly = amount;
    amountAnnually = amount * 12;
  } else {
    amountMonthly = amount / 12;
    amountAnnually = amount;
  }

  function displayAmount(value) {
    return (value / 100).toFixed(2);
  }

  const displayButtonText = button === 'change' ? 'Change' : button === 'current' ? 'Current plan' : 'Upgrade';

  return (
    <div className={`${className} w-64 rounded-xl border border-gray-10 p-6`}>
      <h1 className="text-4xl font-medium text-primary">{bytesToString(bytes)}</h1>
      <div className="mt-5 border-t border-gray-10" />
      <p className="mt-5 text-2xl font-medium text-gray-100">{`${displayAmount(amountMonthly)} €/ month`}</p>
      <p className=" text-gray-50">{`${displayAmount(amountAnnually)}€ billed annually`}</p>
      <Button disabled={button === 'current'} variant="primary" className="mt-5 w-full">
        {displayButtonText}
      </Button>
    </div>
  );
}
