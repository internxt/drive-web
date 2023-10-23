import { WarningCircle } from '@phosphor-icons/react';
import { t } from 'i18next';
import Button from '../../../shared/components/Button/Button';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';

export const WarningMessage = (): JSX.Element => {
  const onUpgradeButtonClicked = () => {
    navigationService.push(AppView.Preferences, { tab: 'plans' });
  };

  return (
    <div className="mx-5 my-1 flex h-12 w-auto flex-row items-center rounded-lg bg-red-std-transparent">
      <span className="flex w-auto flex-grow flex-row items-center px-4">
        <WarningCircle size={24} weight="fill" className="mr-2 text-red-std" />
        <b>{t('error.storageIsFull')}.&nbsp;</b>
        {t('error.storageIsFullDescription')}
      </span>
      <Button variant="tertiary" className="px-4 text-red-std" onClick={onUpgradeButtonClicked}>
        {t('actions.upgradeNow')}
      </Button>
    </div>
  );
};
