import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ClockCounterClockwise, LockSimple } from '@phosphor-icons/react';

interface LockedFeatureModalProps {
  onUpgrade: () => void;
}

const MODAL_DIMENSIONS = {
  width: '282px',
  height: '333px',
} as const;

const ICON_SIZES = {
  clock: 64,
  lock: 35,
} as const;

const COLORS = {
  border: '#474747',
  lock: '#737373',
} as const;

export const LockedFeatureModal = ({ onUpgrade }: LockedFeatureModalProps) => {
  const { translate } = useTranslationContext();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[3px]">
      <div
        className="mx-6 flex max-w-xs flex-col items-center gap-4 rounded-2xl border border-gray-10 bg-gray-5 pt-6 dark:border-gray-5 dark:bg-gray-1"
        style={MODAL_DIMENSIONS}
      >
        <div className="relative mt-1 flex h-20 w-20 items-center justify-center">
          <div className="rounded-lg border bg-gray-5 p-1 dark:bg-gray-1" style={{ borderColor: COLORS.border }}>
            <ClockCounterClockwise size={ICON_SIZES.clock} weight="regular" className="text-primary" />
          </div>
          <div className="absolute bottom-[-10px] left-[-10px]">
            <LockSimple size={ICON_SIZES.lock} weight="fill" style={{ color: COLORS.lock }} />
          </div>
        </div>

        <div className="flex flex-col gap-2 px-2 text-center">
          <h2 className="text-xl font-semibold leading-6 text-gray-100">
            {translate('modals.versionHistory.lockedFeature.title')}
          </h2>
          <p className="text-xs leading-4 text-gray-80">
            {translate('modals.versionHistory.lockedFeature.description')}
          </p>
          <p className="text-xs leading-4 text-gray-80">
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
