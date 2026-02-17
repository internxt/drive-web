import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ClockCounterClockwise, LockSimple } from '@phosphor-icons/react';

interface LockedFeatureModalProps {
  onUpgrade: () => void;
}

const ICON_SIZES = {
  clock: 64,
  lock: 35,
} as const;

export const LockedFeatureModal = ({ onUpgrade }: LockedFeatureModalProps) => {
  const { translate } = useTranslationContext();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-[3px]">
      <div className="mx-1 flex w-[282px] h-[327px] max-w-xs flex-col items-center gap-4 rounded-2xl border border-gray-10 bg-surface pt-6 dark:border-gray-5 dark:bg-gray-1">
        <div className="relative mt-1 flex h-20 w-20 items-center justify-center">
          <div className="rounded-lg border-2 p-1 border-gray-5 bg-[#F9F9FC] dark:bg-gray-1">
            <ClockCounterClockwise size={ICON_SIZES.clock} weight="regular" className="text-primary" />
          </div>
          <div className="absolute bottom-[-10px] left-[-10px]">
            <LockSimple size={ICON_SIZES.lock} weight="fill" className="text-gray-20 dark:text-gray-30" />
          </div>
        </div>

        <div className="flex flex-col gap-2 px-3 text-center">
          <h2 className="font-sans text-xl font-semibold leading-[1.2] tracking-normal text-center text-gray-100">
            {translate('modals.versionHistory.lockedFeature.title')}
          </h2>
          <p className="font-sans text-xs font-normal leading-[1.2] tracking-normal text-center text-gray-60 dark:text-gray-80">
            {translate('modals.versionHistory.lockedFeature.description')}
          </p>
          <p className="font-sans text-xs font-normal leading-[1.2] tracking-normal text-center text-gray-60 dark:text-gray-80">
            {translate('modals.versionHistory.lockedFeature.supportedFormats')}
          </p>
        </div>

        <div className="mt-4 flex w-full justify-center pb-4">
          <Button variant="primary" onClick={onUpgrade} className="font-medium">
            {translate('modals.versionHistory.lockedFeature.upgradeButton')}
          </Button>
        </div>
      </div>
    </div>
  );
};
