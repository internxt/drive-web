import CurrentPlanExtended from './CurrentPlanExtended';

export default function BillingTab({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-y-8 gap-x-10">
        <div className="flex w-96 flex-col space-y-8">
          <CurrentPlanExtended />
        </div>
        <div className="flex w-96 flex-col space-y-8"></div>
      </div>
    </div>
  );
}
