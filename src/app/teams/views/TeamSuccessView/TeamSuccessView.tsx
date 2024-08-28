import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';

export default function Success(): JSX.Element {
  return (
    <div className="jutify-center mt-3 flex content-center">
      <LoadingPulse />
    </div>
  );
}
