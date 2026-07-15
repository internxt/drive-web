import { Button } from '@internxt/ui';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { FreeStoragePlan } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface PlanChangeOptionProps {
  title: string;
  description: string;
  currentPlanName: string;
  currentPlanInfo: string;
  afterLabel: string;
  ctaLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  variantButtonAction?: 'secondary' | 'ghost';
  bulletedInfo?: string[];
}

const PlanChangeOption = ({
  title,
  description,
  currentPlanName,
  currentPlanInfo,
  afterLabel,
  ctaLabel,
  bulletedInfo,
  onConfirm,
  disabled,
  variantButtonAction = 'secondary',
}: PlanChangeOptionProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex flex-col rounded-xl border border-gray-10 p-4 bg-gray-5 shadow-subtle-hard max-w-96">
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-xl text-gray-100">{title}</h4>
        <p className="font-regular text-gray-100">{description}</p>
        {bulletedInfo && (
          <ul className="mt-2 list-disc pl-4 text-gray-100">
            {bulletedInfo.map((info) => (
              <li key={info}>{info}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-row items-center justify-center">
        <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 bg-surface">
          <div className="rounded-xl border border-gray-10 bg-gray-1">
            <p className="py-0.5 px-1.5 text-xs font-medium">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.titleCurrent')}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-primary">{currentPlanName}</span>
          </div>
          <div>
            <span className="text-xs font-medium">{currentPlanInfo}</span>
          </div>
        </div>
        <div className="flex w-10 flex-col items-center justify-center">
          <ArrowRightIcon height="16" width="16" />
        </div>
        <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-gray-10 p-3 bg-surface">
          <div className="rounded-xl border border-gray-10 bg-gray-1">
            <p className="py-0.5 px-1.5 text-xs font-medium">{afterLabel}</p>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-primary">{FreeStoragePlan.simpleName}</span>
          </div>
          <div>
            <span className="text-sm font-medium">
              {translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full justify-end">
        <Button
          className="mt-4 w-max shadow-subtle-hard justify-end"
          variant={variantButtonAction}
          disabled={disabled}
          onClick={onConfirm}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
};

export default PlanChangeOption;
