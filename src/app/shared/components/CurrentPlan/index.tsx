import { bytesToString } from '../../../drive/services/size.service';
import Button from '../Button/Button';

export default function CurrentPlan({
  className = '',
  bytesInPlan,
  planName,
  planSubtitle,
  button,
  onButtonClick,
}: {
  className?: string;
  bytesInPlan: number;
  planName: string;
  planSubtitle?: { mainLabel: string; beforeMainLabelCrossed?: string };
  button?: 'change' | 'upgrade';
  onButtonClick?: () => void;
}): JSX.Element {
  return (
    <div className={`${className} flex items-center justify-between`}>
      <div className="flex items-center">
        <div
          style={{ height: '34px' }}
          className="flex items-center rounded-lg border border-primary bg-primary bg-opacity-5 px-3 text-lg font-semibold text-primary"
        >
          {bytesToString(bytesInPlan)}
        </div>
        <div className="ml-3">
          <h1 className="text-lg font-medium text-gray-80">{planName}</h1>
          {planSubtitle && (
            <h2 className="-mt-1 text-sm">
              {planSubtitle.beforeMainLabelCrossed && (
                <span className="text-gray-50">{planSubtitle.beforeMainLabelCrossed + ' '}</span>
              )}
              <span className={planSubtitle.beforeMainLabelCrossed ? 'text-gray-40 line-through' : 'text-gray-50'}>
                {planSubtitle.mainLabel}
              </span>
            </h2>
          )}
        </div>
      </div>
      {button && (
        <Button size="medium" onClick={onButtonClick}>
          {button === 'change' ? 'Change' : 'Upgrade'}
        </Button>
      )}
    </div>
  );
}
