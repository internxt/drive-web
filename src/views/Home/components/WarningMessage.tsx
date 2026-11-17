import { WarningCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';

export const WarningMessage = ({ onUpgradeButtonClicked }: { onUpgradeButtonClicked: () => void }): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="mx-5 my-1 flex h-12 w-auto flex-row items-center rounded-lg bg-red/10">
      <span className="flex w-auto grow flex-row items-center px-4">
        <WarningCircle size={24} weight="fill" className="mr-2 text-red" />
        <b>{translate('error.storageIsFull')}.&nbsp;</b>
        {translate('error.storageIsFullDescription')}
      </span>
      <Button variant="ghost" className="px-4 text-red" onClick={onUpgradeButtonClicked}>
        {translate('actions.upgradeNow')}
      </Button>
    </div>
  );
};
