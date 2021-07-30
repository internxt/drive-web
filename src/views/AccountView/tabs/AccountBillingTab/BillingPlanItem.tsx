import { useEffect, useState } from 'react';

import BaseButton from '../../../../components/Buttons/BaseButton';
import { TextField } from '@material-ui/core';
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import ButtonPrimary from '../../../../components/Buttons/ButtonPrimary';
import { IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { getIcon } from '../../../../services/icon.service';

interface PlanProps {
  product: IStripeProduct,
  plans: IStripePlan[],
  selectedPlan: string,
  buttontext: string,
  characteristics: string[],
  handlePlanSelection: (planId: string, productId: string) => void,
  handlePaymentIndividual: (selectedPlan: string, productId: string) => void,
  isPaying: boolean
  isBusiness: boolean
  handlePaymentTeams: any
}

const ListItem = ({ text }: { text: string }): JSX.Element => (
  <div className='flex justify-start items-center mb-2'>
    <img src={getIcon('checkBlue')} alt="check" />
    <p className='text-xs ml-2.5'>{text}</p>
  </div>
);

export const Plan = ({ plan, onClick, selectedPlan }: { plan: IStripePlan, onClick: () => void, selectedPlan: string }): JSX.Element => {
  return (
    <div className={`flex justify-between items-center px-4 mb-2 w-full h-11 rounded-md text-neutral-500 cursor-pointer hover:border-blue-60 ${selectedPlan === plan.id ? 'border-2 border-blue-60' : 'border border-m-neutral-60'}`}
      onClick={onClick}
    >
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

const BillingPlanItem = ({ product, plans, characteristics, handlePlanSelection, handlePaymentIndividual, selectedPlan, isPaying, isBusiness, handlePaymentTeams }: PlanProps): JSX.Element => {
  const [buttonText, setButtonText] = useState(selectedPlan ? 'Subscribe' : 'Choose your payment');
  const [totalTeamMembers, setTotalMembers] = useState('');

  useEffect(() => {
    setButtonText(selectedPlan ? 'Subscribe' : 'Choose your payment');
  }, [selectedPlan]);

  return (
    <div className='w-full h-full flex flex-col justify-center text-neutral-700 p-7'>
      <h2 className='text-2xl font-bold text-left'>{product.metadata.simple_name}</h2>

      <p className='text-sm font-semibold text-neutral-700 mt-4 mb-2'>Choose subscription</p>

      {plans.length &&
        plans.map(plan => <Plan plan={plan} key={plan.id} selectedPlan={selectedPlan} onClick={() => {
          if (!isPaying) {
            handlePlanSelection(plan.id, product.id);
          }
        }} />)}

      {
        isBusiness ?
          <TextField
            type="number" label="Team members"
            style={{ width: 154 }}
            InputProps={{
              required: true,
              inputProps: {
                min: 2,
                max: 10
              }
            }}
            value={totalTeamMembers} onChange={e => setTotalMembers(e.target.value)} />
          :
          ''
      }

      <p className='text-sm font-semibold text-neutral-700 my-3.5'>Everything in this plan</p>

      {characteristics.map(text => <ListItem text={text} key={text} />)}

      <div className='mt-4' />
      <ButtonPrimary width='w-full' text={selectedPlan && isPaying ? 'Redirecting to Stripe...' : buttonText} disabled={isPaying || !selectedPlan} onClick={() => {
        if (isBusiness) {
          handlePaymentTeams(selectedPlan, product.id, totalTeamMembers);
        } else {
          handlePaymentIndividual(selectedPlan, product.id);
        }
      }} />
    </div>
  );
};

export default BillingPlanItem;
