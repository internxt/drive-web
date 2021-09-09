import { useState } from 'react';
import { UilCheck } from '@iconscout/react-unicons';

import BaseButton from '../../../../components/Buttons/BaseButton';
import { IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { ProductPlanItem } from './ProductPlanItem';

interface ProductItemProps {
  product: IStripeProduct;
  plans: IStripePlan[];
  selectedPlanId: string;
  currentPlanId: string | undefined;
  characteristics: string[];
  isPaying: boolean;
  isBusiness: boolean;
  handlePlanSelection: (productId: string, planId: string) => void;
  handlePaymentIndividual: (selectedPlanId: string, productId: string) => void;
  handlePaymentTeams: (selectedPlanId: string, productId: string, totalMembers: number) => void;
}

const ProductItem = ({
  product,
  plans,
  characteristics,
  handlePlanSelection,
  handlePaymentIndividual,
  selectedPlanId,
  currentPlanId,
  isPaying,
  isBusiness,
  handlePaymentTeams,
}: ProductItemProps): JSX.Element => {
  const [totalTeamMembers, setTotalTeamMembers] = useState(1);
  const aPlanIsSelected = plans.reduce((t, x) => t || x.id === selectedPlanId, false);
  const buttonLabel = isPaying ? 'Redirecting to Stripe...' : aPlanIsSelected ? 'Subscribe' : 'Choose your payment';
  const onBuyButtonClicked = () => {
    if (isBusiness) {
      handlePaymentTeams(selectedPlanId, product.id, totalTeamMembers);
    } else {
      handlePaymentIndividual(selectedPlanId, product.id);
    }
  };
  const onProductPlanClicked = (plan: IStripePlan) => {
    if (!isPaying) {
      handlePlanSelection(product.id, plan.id);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center text-neutral-700 p-7">
      <h2 className="text-2xl font-bold text-left">{product.metadata.simple_name}</h2>

      <p className="text-sm font-semibold text-neutral-700 mt-4 mb-2">Choose subscription</p>

      {plans.map((plan) => (
        <ProductPlanItem
          key={plan.id}
          plan={plan}
          isSelected={selectedPlanId === plan.id}
          isCurrentPlan={currentPlanId === plan.id}
          totalTeamMembers={totalTeamMembers}
          onClick={() => onProductPlanClicked(plan)}
        />
      ))}

      {isBusiness && (
        <div className="relative flex h-11 items-center rounded border border-m-neutral-60 overflow-hidden">
          <span className="text-neutral-500 flex-1 ml-4">Business members</span>

          <input
            type="number"
            min={2}
            className="w-14 h-full border-l bg-white pr-2.5"
            value={totalTeamMembers}
            onChange={(e) => setTotalTeamMembers(parseInt(e.target.value))}
          />

          <div className="absolute right-0 flex flex-col items-center justify-center">
            <button
              className="flex items-center justify-center text-blue-60 font-semibold hover:bg-blue-20 w-5 h-5"
              onClick={() => setTotalTeamMembers(!totalTeamMembers ? 1 : totalTeamMembers + 1)}
            >
              +
            </button>
            <button
              className="flex items-center justify-center text-blue-60 font-semibold hover:bg-blue-20 w-5 h-5"
              onClick={() => setTotalTeamMembers(totalTeamMembers > 1 ? totalTeamMembers - 1 : totalTeamMembers)}
            >
              -
            </button>
          </div>
        </div>
      )}

      <p className="text-sm font-semibold text-neutral-700 my-3.5">Everything in this plan</p>

      {characteristics.map((text, index) => (
        <div key={index} className="flex justify-start items-center mb-2">
          <UilCheck className="text-blue-60" />
          <p className="text-xs ml-2.5">{text}</p>
        </div>
      ))}

      <div className="mt-4" />
      <BaseButton
        classes="w-full primary"
        disabled={isPaying || !aPlanIsSelected || totalTeamMembers < 1}
        onClick={onBuyButtonClicked}
      >
        {buttonLabel}
      </BaseButton>
    </div>
  );
};

export default ProductItem;
