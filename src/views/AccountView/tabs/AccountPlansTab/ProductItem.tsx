import { useState } from 'react';

import BaseButton from '../../../../components/Buttons/BaseButton';
import { IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { ProductPlanItem } from './ProductPlanItem';
import i18n from '../../../../services/i18n.service';

interface ProductItemProps {
  product: IStripeProduct;
  plans: IStripePlan[];
  selectedPlanId: string;
  currentPlanId: string | undefined;
  isPaying: boolean;
  isBusiness: boolean;
  handlePlanSelection: (productId: string, planId: string) => void;
  handlePaymentIndividual: (selectedPlanId: string, productId: string) => void;
  handlePaymentTeams: (selectedPlanId: string, productId: string, totalMembers: number) => void;
}

const ProductItem = ({
  product,
  plans,
  handlePlanSelection,
  handlePaymentIndividual,
  selectedPlanId,
  currentPlanId,
  isPaying,
  isBusiness,
  handlePaymentTeams,
}: ProductItemProps): JSX.Element => {
  const [totalTeamMembers, setTotalTeamMembers] = useState(1);
  const buttonLabel = isPaying ? 'Redirecting to Stripe...' : i18n.get('action.buy');
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
    <div className="w-full h-full flex flex-col justify-center text-neutral-700 p-6 border border-l-neutral-30 rounded-lg">
      {/* SIMPLE NAME */}
      <h4 className="m-auto rounded-3xl px-4 py-1 bg-l-neutral-20 text-m-neutral-80 font-semibold mb-4 w-min">
        {product.metadata.simple_name}
      </h4>

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

      <div className="mt-4" />
      <BaseButton classes="w-full primary font-semibold" disabled={isPaying} onClick={onBuyButtonClicked}>
        {buttonLabel}
      </BaseButton>
    </div>
  );
};

export default ProductItem;
