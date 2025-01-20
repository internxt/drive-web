import { WarningCircle } from '@phosphor-icons/react';
import { t } from 'i18next';
import { Button } from '@internxt/ui';

export const WarningMessage = ({ onUpgradeButtonClicked }: { onUpgradeButtonClicked: () => void }): JSX.Element => {
  return (
    <div className="mx-5 my-1 flex h-12 w-auto flex-row items-center rounded-lg bg-red/10">
      <span className="flex w-auto grow flex-row items-center px-4">
        <WarningCircle size={24} weight="fill" className="mr-2 text-red" />
        <b>{t('error.storageIsFull')}.&nbsp;</b>
        {t('error.storageIsFullDescription')}
      </span>
      <Button variant="ghost" className="px-4 text-red" onClick={onUpgradeButtonClicked}>
        {t('actions.upgradeNow')}
      </Button>
    </div>
  );
};
