import { UilCheck } from '@iconscout/react-unicons';
import { TimeInterval } from '../../../../models/enums';
import { IStripePlan } from '../../../../models/interfaces';
import moneyService from '../../../../services/money.service';

interface ProductPlanItemProps {
  plan: IStripePlan;
  isSelected: boolean;
  isCurrentPlan: boolean;
  totalTeamMembers: number;
  onClick: () => void;
}

export const ProductPlanItem = ({ plan, isSelected, isCurrentPlan, totalTeamMembers, onClick }: ProductPlanItemProps): JSX.Element => {
  const classCurrentPlan = isCurrentPlan ? 'border-3 border-blue-60 cursor-default' : '';
  const classSelectedPlan = isSelected ? 'border-blue-60 bg-blue-10' : 'border-m-neutral-60';
  const priceMultiplier = !totalTeamMembers || totalTeamMembers < 1 ? 1 : totalTeamMembers;
  const monthlyPrice = moneyService.getMonthlyPrice(plan.price / 100, plan.interval_count, plan.interval as TimeInterval);
  const priceToShow = monthlyPrice * priceMultiplier;

  return (
    <div
      className={`${classCurrentPlan} ${classSelectedPlan} relative flex justify-between items-center px-4 mb-2 w-full h-11 rounded text-neutral-500 overflow-hidden border cursor-pointer hover:border-blue-60`}
      onClick={() => !isCurrentPlan && onClick()}
    >
      {isCurrentPlan && <div className='absolute w-12 h-8 bg-blue-60 -top-5 -right-3 transform rotate-30' />}
      {isCurrentPlan && <UilCheck className='absolute w-5 h-5 -top-1 right-0 text-white' />}

      <p>{plan.name}</p>

      <div className='flex items-end'>
        {
          <p className='font-bold mr-2'>{priceToShow.toFixed(2)}€</p>
        }
        <p className='payment_interval'>/month</p>
      </div>
    </div>
  );
};