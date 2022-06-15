import Features from './Features';
import PlanSelector from './PlanSelector';

export default function PlansTab({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={className}>
      <PlanSelector />
      <Features className="mt-8" />
    </div>
  );
}
