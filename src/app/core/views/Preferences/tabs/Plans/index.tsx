import Features from './Features';

export default function PlansTab({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={className}>
      <Features />
    </div>
  );
}
