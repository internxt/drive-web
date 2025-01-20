import { bytesToString } from '../../../drive/services/size.service';
import { Button } from '@internxt/ui';

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
  planSubtitle?: { mainLabel: string; beforeMainLabelCrossed?: string; amount: number; amountAfterCoupon?: number };
  button?: string;
  onButtonClick?: () => void;
}): JSX.Element {
  const showInfinite = bytesInPlan >= 108851651149824;

  return (
    <div className={`${className} flex items-center justify-between`}>
      <div className="flex items-center">
        <div
          style={{ height: '34px' }}
          className={`flex items-center rounded-lg border border-primary bg-primary/5 px-3 ${
            showInfinite ? 'text-4xl' : 'text-lg'
          } font-semibold text-primary`}
        >
          {showInfinite ? '∞' : bytesToString(bytesInPlan)}
        </div>
        <div className="ml-3">
          <h1 className="text-lg font-medium text-gray-80">{planName}</h1>
          {planSubtitle && (
            <h2 className="-mt-1 text-sm">
              {planSubtitle.amount === planSubtitle.amountAfterCoupon ? (
                <span className="text-gray-50">{planSubtitle.beforeMainLabelCrossed + ' '}</span>
              ) : (
                <>
                  <span className="text-gray-50">{planSubtitle.beforeMainLabelCrossed + ' '}</span>
                  <span className="text-gray-40 line-through">{planSubtitle.mainLabel}</span>
                </>
              )}
            </h2>
          )}
        </div>
      </div>
      {button && <Button onClick={onButtonClick}>{button}</Button>}
    </div>
  );
}
