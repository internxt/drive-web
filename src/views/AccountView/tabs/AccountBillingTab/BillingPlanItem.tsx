import { useEffect, useState } from 'react';
import { UilCheck } from '@iconscout/react-unicons';

import BaseButton from '../../../../components/Buttons/BaseButton';
import { IStripePlan, IStripeProduct } from '../../../../models/interfaces';

interface PlanProps {
  product: IStripeProduct,
  plans: IStripePlan[],
  selectedPlan: string,
  currentPlan: string,
  buttontext: string,
  characteristics: string[],
  handlePlanSelection: (planId: string, productId: string) => void,
  handlePayment: (selectedPlan: string, productId: string) => void,
  isPaying: boolean
}

export const ListItem = ({ text }: { text: string }): JSX.Element => (
  <div className='flex justify-start items-center mb-2'>
    <UilCheck className="text-blue-60" />
    <p className='text-xs ml-2.5'>{text}</p>
  </div>
);

export const Plan = ({ plan, onClick, selectedPlan, currentPlan }: { plan: IStripePlan, onClick: () => void, selectedPlan: string, currentPlan }): JSX.Element => {
  const classCurrentPlan = 'border-3 border-blue-60 cursor-default';
  const classSelectedPlan = selectedPlan === plan.id ? 'border-blue-60 bg-blue-10' : 'border-m-neutral-60';

  return (
    <div className={`relative flex justify-between items-center px-4 mb-2 w-full h-11 rounded-md text-neutral-500 overflow-hidden ${currentPlan === plan.id ? classCurrentPlan : `border ${classSelectedPlan} cursor-pointer hover:border-blue-60`}`}
      onClick={() => currentPlan !== plan.id ? onClick() : null}
    >
      {currentPlan === plan.id && <div className='absolute w-12 h-8 bg-blue-60 -top-5 -right-3 transform rotate-30' />}
      {currentPlan === plan.id && <UilCheck className='absolute w-5 h-5 -top-1 right-0 text-white' />}

      <p>{plan.name}</p>

      <div className='flex items-end'>
        <p className='font-bold mr-2'>{((plan.price / 100) / plan.interval_count).toFixed(2)}€</p>
        {plan.interval_count > 1 ?
          <div className='flex'>
            <p className='payment_interval'>/{plan.interval_count}&nbsp;</p>
            <p className='payment_interval'>{plan.interval}s</p>
          </div>
          :
          plan.interval === 'year' ?
            <p className='payment_interval'>/annually</p>
            :
            <p className='payment_interval'>/month</p>
        }
      </div>
    </div>
  );
};

const BillingPlanItem = ({ product, plans, characteristics, handlePlanSelection, handlePayment, selectedPlan, currentPlan, isPaying }: PlanProps): JSX.Element => {
  const [buttonText, setButtonText] = useState(selectedPlan ? 'Subscribe' : 'Choose your payment');

  useEffect(() => {
    setButtonText(selectedPlan ? 'Subscribe' : 'Choose your payment');
  }, [selectedPlan]);

  return (
    <div className='w-full h-full flex flex-col justify-center text-neutral-700 p-7'>
      <h2 className='text-2xl font-bold text-left'>{product.metadata.simple_name}</h2>

      <p className='text-sm font-semibold text-neutral-700 mt-4 mb-2'>Choose subscription</p>

      {plans.length &&
        plans.map(plan => <Plan plan={plan} key={plan.id} selectedPlan={selectedPlan} currentPlan={currentPlan} onClick={() => {
          if (!isPaying) {
            handlePlanSelection(plan.id, product.id);
          }
        }} />)}

      <p className='text-sm font-semibold text-neutral-700 my-3.5'>Everything in this plan</p>

      {characteristics.map(text => <ListItem text={text} key={text} />)}

      <div className='mt-4' />
      <BaseButton classes="w-full primary" disabled={isPaying || !selectedPlan} onClick={() => handlePayment(selectedPlan, product.id)}>
        {selectedPlan && isPaying ? 'Redirecting to Stripe...' : buttonText}
      </BaseButton>

    </div>
  );
};

export default BillingPlanItem;
