import React, { useEffect, useState } from 'react';
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
  handlePaymentIndividual: (selectedPlan: string, productId: string) => void,
  isPaying: boolean
  isBusiness: boolean
  handlePaymentTeams: any
}

export const ListItem = ({ text }: { text: string }): JSX.Element => (
  <div className='flex justify-start items-center mb-2'>
    <UilCheck className="text-blue-60" />
    <p className='text-xs ml-2.5'>{text}</p>
  </div>
);

export const Plan = ({ plan, onClick, selectedPlan, currentPlan, totalTeamMembers }: { plan: IStripePlan, onClick: () => void, selectedPlan: string, currentPlan, totalTeamMembers: number }): JSX.Element => {
  const classCurrentPlan = 'border-3 border-blue-60 cursor-default';
  const classSelectedPlan = selectedPlan === plan.id ? 'border-blue-60 bg-blue-10' : 'border-m-neutral-60';
  const multiplyValue = totalTeamMembers < 1 || !totalTeamMembers ? 1 : totalTeamMembers;
  const anuallyInterval = (((plan.price / 100) * (currentPlan === plan.id ? 1 : multiplyValue)) / plan.interval_count) / 12;

  return (
    <div className={`relative flex justify-between items-center px-4 mb-2 w-full h-11 rounded text-neutral-500 overflow-hidden ${currentPlan === plan.id ? classCurrentPlan : `border ${classSelectedPlan} cursor-pointer hover:border-blue-60`}`}
      onClick={() => currentPlan !== plan.id ? onClick() : null}
    >
      {currentPlan === plan.id && <div className='absolute w-12 h-8 bg-blue-60 -top-5 -right-3 transform rotate-30' />}
      {currentPlan === plan.id && <UilCheck className='absolute w-5 h-5 -top-1 right-0 text-white' />}

      <p>{plan.name}</p>

      <div className='flex items-end'>
        {
          plan.interval === 'year' ?
            <p className='font-bold mr-2'>{anuallyInterval.toFixed(2)}€</p>
            :
            <p className='font-bold mr-2'>{(((plan.price / 100) * (currentPlan === plan.id ? 1 : multiplyValue)) / plan.interval_count).toFixed(2)}€</p>
        }
        <p className='payment_interval'>/month</p>
      </div>
    </div>
  );
};

const BillingPlanItem = ({ product, plans, characteristics, handlePlanSelection, handlePaymentIndividual, selectedPlan, currentPlan, isPaying, isBusiness, handlePaymentTeams }: PlanProps): JSX.Element => {
  const [buttonText, setButtonText] = useState(selectedPlan ? 'Subscribe' : 'Choose your payment');
  const [totalTeamMembers, setTotalTeamMembers] = useState(1);
  const onBuyButtonClicked = () => {
    if (isBusiness) {
      handlePaymentTeams(selectedPlan, product.id, totalTeamMembers);
    } else {
      handlePaymentIndividual(selectedPlan, product.id);
    }
  };

  useEffect(() => {
    setButtonText(selectedPlan ? 'Subscribe' : 'Choose your payment');
  }, [selectedPlan]);

  return (
    <div className='w-full h-full flex flex-col justify-center text-neutral-700 p-7'>
      <h2 className='text-2xl font-bold text-left'>{product.metadata.simple_name}</h2>

      <p className='text-sm font-semibold text-neutral-700 mt-4 mb-2'>Choose subscription</p>

      {plans.length &&
        plans.map(plan => <Plan plan={plan} key={plan.id} selectedPlan={selectedPlan} currentPlan={currentPlan} totalTeamMembers={totalTeamMembers} onClick={() => {
          if (!isPaying) {
            handlePlanSelection(plan.id, product.id);
          }
        }} />)}

      {
        isBusiness &&
        <div className='relative flex h-11 items-center rounded border border-m-neutral-60 overflow-hidden'>
          <span className='text-neutral-500 flex-1 ml-4'>Business members</span>

          <input type="number" min={2} className='w-14 h-full border-l bg-white pr-2.5' value={totalTeamMembers} onChange={e => setTotalTeamMembers(parseInt(e.target.value))} />

          <div className='absolute right-0 flex flex-col items-center justify-center'>
            <button className='flex items-center justify-center text-blue-60 font-semibold hover:bg-blue-20 w-5 h-5' onClick={() => setTotalTeamMembers(!totalTeamMembers ? 1 : totalTeamMembers + 1)}>+</button>
            <button className='flex items-center justify-center text-blue-60 font-semibold hover:bg-blue-20 w-5 h-5' onClick={() => setTotalTeamMembers(totalTeamMembers > 1 ? totalTeamMembers - 1 : totalTeamMembers)}>-</button>
          </div>
        </div>
      }

      <p className='text-sm font-semibold text-neutral-700 my-3.5'>Everything in this plan</p>

      {characteristics.map(text => <ListItem text={text} key={text} />)}

      <div className='mt-4' />
      <BaseButton classes="w-full primary" disabled={isPaying || !selectedPlan || totalTeamMembers < 1} onClick={onBuyButtonClicked}>
        {selectedPlan && isPaying ? 'Redirecting to Stripe...' : buttonText}
      </BaseButton>
    </div>
  );
};

export default BillingPlanItem;
