import RoleBadge from '../../../Workspace/Members/components/RoleBadge';

interface PlanSelectionCardProps {
  capacity: string;
  currency: string;
  price: string;
  billing: string;
  isSelected: boolean;
  onClick: () => void;
}

const PlanSelectionCard = ({ capacity, currency, price, billing, isSelected, onClick }: PlanSelectionCardProps) => {
  const isSelectedOutsideBorderStyle = isSelected ? 'border-primary/30' : '';
  const isSelectedInsideBorderStyle = isSelected ? 'border-primary' : '';
  return (
    <div
      className={`w-fit rounded-2xl border-4 border-transparent hover:border-primary/30 ${isSelectedOutsideBorderStyle}`}
    >
      <button
        className={`flex w-80 flex-col rounded-xl border border-gray-10 p-4 hover:border-primary ${isSelectedInsideBorderStyle}`}
        onClick={onClick}
      >
        <div className="flex w-full flex-row justify-between">
          <span className="text-2xl font-medium leading-7 text-gray-100">{capacity}</span>
          {isSelected && <RoleBadge roleText="Current" role={'current'} size={'small'} />}
        </div>
        <span className=" text-base font-normal leading-5 text-gray-60">
          {currency + price}
          {billing && '/' + billing}
        </span>
      </button>
    </div>
  );
};

export default PlanSelectionCard;
