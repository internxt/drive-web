import { t } from 'i18next';

import { Button } from '@internxt/ui';
import Card from 'app/shared/components/Card';
import { BillingDetailsCardProps } from '../../../types/types';
import Detail from './Detail';

const BillingDetailsCard = ({ address, phone, isOwner, onEditButtonClick }: BillingDetailsCardProps) => {
  if (!isOwner) return null;

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-row items-center justify-between">
        <span className="text-xl font-medium">{t('views.preferences.workspace.billing.billingDetails')}</span>
        <Button variant="secondary" onClick={onEditButtonClick}>
          <span>{t('views.preferences.workspace.billing.editBilling')}</span>
        </Button>
      </div>
      <Card>
        <div className="flex flex-row  space-x-10">
          <div className="flex h-full w-full min-w-0 grow flex-col ">
            <Detail label={t('views.preferences.workspace.overview.address')} value={address} />
          </div>

          <div className="flex w-full min-w-0 grow flex-col space-y-2 ">
            <Detail label={t('views.preferences.workspace.overview.phone')} value={phone} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BillingDetailsCard;
